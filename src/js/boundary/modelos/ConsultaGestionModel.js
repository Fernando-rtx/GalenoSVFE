import { bindFormValidation, showAccessibleDialog } from './form-validation.js';
import { editableRecord } from './editable-record.js';
import { gestionError } from './dashboard-presentation.js';
import { obtenerAsignacionEmpleado } from '../../control/contexto-empleado.js';
const node = (tag, text, className) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (className) n.className = className;
  return n;
};
const localDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const instant = (value) => (value ? new Date(value).toISOString() : null);
const normalizarRol = (value) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .trim().replace(/\s+/g, ' ').toLocaleLowerCase();

/** Formularios anidados en el dashboard; conserva los componentes originales. */
export default class ConsultaGestionModel extends HTMLElement {
  constructor() {
    super();
  }
  mount(control, { onOrders } = {}) {
    const root = this;
    this._mounted = true;
    this.onOrders = onOrders;
    this.root = root;
    this.control = control;
    this.editor = null;
    this.notice = node('p');
    this.notice.setAttribute('role', 'status');
    this.nextStepLink = node('a', 'Abrir bandeja para registrar recepción y avanzar el procedimiento');
    this.nextStepLink.href = '#academico';
    this.nextStepLink.hidden = true;
    this.actions = node('div', undefined, 'gestion-tools');
    this.create = node('button', 'Nueva consulta', 'primary-button');
    this.add = node('button', 'Asociar procedimiento', 'secondary-button');
    this.create.onclick = () => control.editConsulta(true);
    this.add.onclick = () => control.newProcedure();
    this.actions.append(this.create, this.add);
    this.relationshipSection = node('section', undefined, 'panel consulta-relaciones');
    this.relationshipSection.setAttribute('aria-label', 'Procedimientos y pasos de la consulta');
    this.dialog = node('dialog', undefined, 'gestion-dialog');
    this.form = node('form');
    this.fields = node('div', undefined, 'gestion-fields');
    this.error = node('p', undefined, 'action-error');
    this.error.setAttribute('role', 'alert');
    this.save = node('button', 'Guardar', 'primary-button');
    this.save.type = 'submit';
    this.cancel = node('button', 'Cancelar', 'secondary-button');
    this.cancel.type = 'button';
    this.cancel.onclick = () => control.cancel();
    this.dialog.oncancel = (event) => {
      event.preventDefault();
      control.cancel();
    };
    const actions = node('div', undefined, 'gestion-tools');
    actions.append(this.cancel, this.save);
    this.form.append(this.fields, this.error, actions);
    this.dialog.append(this.form);
    root.append(this.notice, this.nextStepLink, this.actions, this.relationshipSection, this.dialog);
    this.form.onsubmit = (event) => {
      event.preventDefault();
      return control.save(this.data(control.state));
    };
    this.cards = document.querySelector('[data-ui=cards]');
    this.openCard = (event) => {
      const card = event.target.closest('tarjeta-consulta');
      if (card && !event.composedPath().some((n) => n.matches?.('button')))
        control.openConsulta(card.consulta.idConsulta);
    };
    this.cards.addEventListener('dblclick', this.openCard);
    this.unsubscribe = control.subscribe((state) => this.render(state));
  }
  field(name, label, type = 'text', value = '', required = false) {
    const input = node(type === 'textarea' ? 'textarea' : 'input');
    input.name = name;
    input.id = 'consulta-gestion-' + name;
    if (type !== 'textarea') input.type = type;
    input.value = value ?? '';
    input.required = required;
    const title = node('label', label);
    title.htmlFor = input.id;
    this.fields.append(title, input);
    return input;
  }
  build(state) {
    const value = state.selected;
    this.initialProcedure = null;
    this.initialProcedurePager = null;
    this.fields.replaceChildren(
      node(
        'h2',
        state.editor === 'paso'
          ? 'Editar paso'
          : state.editor === 'procedimiento'
            ? 'Procedimiento de consulta'
            : value
              ? 'Editar consulta'
              : 'Nueva consulta',
      ),
    );
    if (state.editor === 'consulta') {
      if (value)
        this.fields.append(node('p', 'Paciente: ' + (value.personaNombre ?? value.idPersonaRol)));
      else {
        const search = this.field('buscar', 'Buscar paciente por nombre o DUI', 'search');
        const button = node('button', 'Buscar pacientes', 'secondary-button');
        button.type = 'button';
        button.onclick = () => this.control.searchPatients(search.value);
        this.fields.append(button);
        const label = node('label', 'Paciente');
        label.htmlFor = 'consulta-paciente';
        this.patients = node('select');
        this.patients.name = 'idPersonaRol';
        this.patients.id = 'consulta-paciente';
        this.patients.required = true;
        this.fields.append(label, this.patients);
        this.fields.append(node('p', 'Si no aparece en la búsqueda, registra al paciente aquí antes de asignar la cita.'));
        const details = node('details');
        this.registrationDetails = details;
        details.append(node('summary', 'Registrar paciente nuevo'));
        const patientFields = node('div', undefined, 'gestion-fields');
        this.newPatientInputs = {};
        for (const [name, text, type] of [
          ['nombres', 'Nombres', 'text'], ['apellidos', 'Apellidos', 'text'],
          ['fechaNacimiento', 'Fecha de nacimiento', 'date'], ['documento', 'Número de documento', 'text'],
        ]) {
          const input = node('input');
          input.type = type;
          input.name = name;
          input.id = 'consulta-nuevo-' + name;
          input.autocomplete = name === 'documento' ? 'off' : name;
          const fieldLabel = node('label', text);
          fieldLabel.htmlFor = input.id;
          patientFields.append(fieldLabel, input);
          this.newPatientInputs[name] = input;
        }
        const docType = node('select');
        docType.name = 'idTipoDocumentoNuevo';
        docType.id = 'consulta-nuevo-tipo-documento';
        const docLabel = node('label', 'Tipo de documento');
        docLabel.htmlFor = docType.id;
        patientFields.append(docLabel, docType);
        this.newPatientInputs.idTipoDocumento = docType;
        const register = node('button', 'Guardar paciente', 'secondary-button');
        register.type = 'button';
        register.onclick = () => this.registerPatient();
        patientFields.append(register);
        this.registrationStatus = node('p');
        this.registrationStatus.setAttribute('role', 'status');
        patientFields.append(this.registrationStatus);
        details.append(patientFields);
        this.fields.append(details);
      }
      if (!value) {
        const procedureLabel = node('label', 'Procedimiento (el primer paso debe ser Atención al público)');
        procedureLabel.htmlFor = 'consulta-procedimiento-inicial';
        this.initialProcedure = node('select');
        this.initialProcedure.name = 'idProcedimiento';
        this.initialProcedure.id = 'consulta-procedimiento-inicial';
        this.initialProcedure.required = true;
        this.fields.append(procedureLabel, this.initialProcedure);
        this.initialProcedurePager = node('div', undefined, 'gestion-tools');
        const prev = node('button', 'Procedimientos anteriores', 'text-button');
        const next = node('button', 'Más procedimientos', 'text-button');
        prev.type = next.type = 'button';
        prev.onclick = () => this.control.loadProcedures(this.control.state.firstProcedimientos - 20);
        next.onclick = () => this.control.loadProcedures(this.control.state.firstProcedimientos + 20);
        this.initialProcedurePager.append(prev, next);
        this.fields.append(this.initialProcedurePager);
      }
      const reference = this.field(
        'referenciaExterna',
        'Referencia externa',
        'text',
        value?.referenciaExterna,
      );
      reference.maxLength = 255;
    }
    if (state.editor === 'procedimiento') {
      if (value) this.fields.append(node('p', 'Procedimiento: ' + value.idProcedimiento));
      else {
        this.procedures = node('select');
        this.procedures.name = 'idProcedimiento';
        this.procedures.id = 'consulta-procedimiento';
        this.procedures.required = true;
        const label = node('label', 'Procedimiento activo');
        label.htmlFor = this.procedures.id;
        this.fields.append(label, this.procedures);
        this.catalogPager = node('div', undefined, 'gestion-tools');
        this.catalogPrev = node('button', 'Procedimientos anteriores', 'text-button');
        this.catalogNext = node('button', 'Más procedimientos', 'text-button');
        this.catalogPrev.type = this.catalogNext.type = 'button';
        this.catalogPrev.onclick = () =>
          this.control.loadProcedures(this.control.state.firstProcedimientos - 20);
        this.catalogNext.onclick = () =>
          this.control.loadProcedures(this.control.state.firstProcedimientos + 20);
        this.catalogPager.append(this.catalogPrev, this.catalogNext);
        this.fields.append(this.catalogPager);
      }
    }
    this.field(
      'fechaInicio',
      'Inicio · hora local',
      'datetime-local',
      localDate(value?.fechaInicio ?? new Date().toISOString()),
      true,
    );
    this.field(
      'fechaFin',
      'Fin · hora local (opcional)',
      'datetime-local',
      localDate(value?.fechaFin),
    );
    if (state.editor === 'paso') {
      this.fields.append(node('p', 'Responsable asignado: ' + value.idPersonaRol));
      const select = node('select');
      select.name = 'estado';
      select.id = 'consulta-estado';
      select.required = true;
      for (const text of ['PENDIENTE', 'EN_CURSO', 'COMPLETADO']) {
        const option = node('option', text);
        option.value = text;
        select.append(option);
      }
      select.value = value.estado;
      const label = node('label', 'Estado del paso');
      label.htmlFor = select.id;
      this.fields.append(label, select);
    } else this.field('observaciones', 'Observaciones', 'textarea', value?.observaciones);
  }
  data(state) {
    const f = this.form.elements;
    const data = { fechaInicio: instant(f.fechaInicio.value), fechaFin: instant(f.fechaFin.value) };
    if (state.editor === 'consulta')
      Object.assign(data, {
        idPersonaRol: state.selected?.idPersonaRol ?? f.idPersonaRol.value,
        referenciaExterna: f.referenciaExterna.value,
        observaciones: f.observaciones.value,
        ...(!state.selected ? { idProcedimiento: f.idProcedimiento.value } : {}),
      });
    if (state.editor === 'procedimiento')
      Object.assign(data, {
        idConsulta: state.consulta.idConsulta,
        idProcedimiento: state.selected?.idProcedimiento ?? f.idProcedimiento.value,
        observaciones: f.observaciones.value,
      });
    if (state.editor === 'paso')
      Object.assign(data, {
        idConsultaProcedimiento: state.selected.idConsultaProcedimiento,
        idPersonaRol: state.selected.idPersonaRol,
        estado: f.estado.value,
      });
    return data;
  }
  async registerPatient() {
    if (!this.control.state.busquedaRealizada || this.control.state.pacientes.length) {
      this.registrationStatus.textContent = 'Busca primero por nombre o documento y verifica que no exista.';
      return;
    }
    const fields = this.newPatientInputs;
    const data = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value.trim()]));
    if (Object.values(data).some((value) => !value)) {
      this.registrationStatus.textContent = 'Completa todos los datos para registrar al paciente.';
      return;
    }
    data.fechaNacimiento = new Date(`${data.fechaNacimiento}T12:00:00-06:00`).toISOString();
    await this.control.registerPatient(data);
  }
  render(state) {
    this.notice.textContent = state.error ? gestionError(state.error) : state.message;
    this.nextStepLink.hidden = !state.message.startsWith('Cita creada');
    this.create.hidden = normalizarRol(obtenerAsignacionEmpleado()?.rolNombre) !== 'atencion al publico';
    this.create.disabled = state.writing || !state.clinic;
    const reception = normalizarRol(obtenerAsignacionEmpleado()?.rolNombre) === 'atencion al publico';
    this.add.hidden = !reception;
    this.add.disabled = state.writing || !state.consulta || !reception;
    editableRecord(
      document.querySelector('[data-ui=detail]'),
      () => this.control.editConsulta(false),
      Boolean(state.consulta) && !state.writing && reception,
    );
    this.relationshipSection.hidden = !state.consulta;
    this.relationshipSection.replaceChildren();
    if (state.consulta)
      for (const [name, rows, total, first, key, id, label] of [
        [
          'Procedimientos asociados',
          state.asociaciones,
          state.totalAsociaciones,
          state.firstAsociaciones,
          'firstAsociaciones',
          'idConsultaProcedimiento',
          'idProcedimiento',
        ],
        [
          'Pasos de la consulta',
          state.pasos,
          state.totalPasos,
          state.firstPasos,
          'firstPasos',
          'idConsultaProcedimientoPaso',
          'estado',
        ],
      ]) {
        this.relationshipSection.append(node('h3', `${name} · ${total}`));
        for (const row of rows) {
          const line = node('div', undefined, 'gestion-tools');
          if (key === 'firstPasos') {
            line.append(
              node(
                'span',
                `Estado: ${row.estado ?? 'Sin estado'} · Inicio: ${row.fechaInicio ?? 'Sin fecha'} · Responsable: ${row.idPersonaRol}`,
              ),
            );
            const next =
              row.estado === 'PENDIENTE'
                ? 'EN_CURSO'
                : row.estado === 'EN_CURSO'
                  ? 'COMPLETADO'
                  : null;
            if (next) {
              const transition = node(
                'button',
                next === 'EN_CURSO' ? 'Iniciar actividad' : 'Completar actividad',
                'primary-button',
              );
              transition.type = 'button';
              transition.disabled = state.writing;
              transition.onclick = () => this.control.transitionStep(row, next);
              line.append(transition);
            }
            if (this.onOrders) {
              const orders = node('button', 'Órdenes y resultados', 'secondary-button');
              orders.type = 'button';
              orders.disabled = state.writing;
              orders.onclick = () => this.onOrders(row);
              line.append(orders);
            }
          } else {
            line.append(node('span', `${row[label]} · ${row.fechaInicio ?? 'Sin fecha'}`));
            editableRecord(
              line,
              () => this.control.editProcedure(row),
              !state.writing && reception,
            );
          }
          this.relationshipSection.append(line);
        }
        if (!rows.length) this.relationshipSection.append(node('p', 'Sin registros asociados.'));
        const pager = node('div', undefined, 'gestion-tools');
        const prev = node('button', 'Anterior', 'pagination-button');
        const next = node('button', 'Siguiente', 'pagination-button');
        prev.type = next.type = 'button';
        prev.disabled = state.writing || first === 0;
        next.disabled = state.writing || first + 10 >= total;
        prev.onclick = () => this.control.loadChildren({ [key]: Math.max(0, first - 10) });
        next.onclick = () => this.control.loadChildren({ [key]: first + 10 });
        pager.append(prev, next);
        this.relationshipSection.append(pager);
      }
    if (state.editor && !this.dialog.open) {
      this.build(state);
      showAccessibleDialog(this.dialog);
    }
    if (!state.editor && this.dialog.open) this.dialog.close();
    if (state.editor === 'consulta' && !state.selected && this.patients) {
      if (this.registrationDetails)
        this.registrationDetails.hidden = !state.busquedaRealizada || state.pacientes.length > 0;
      const previous = this.patients.value;
      this.patients.replaceChildren(node('option', 'Selecciona un paciente'));
      this.patients.firstChild.value = '';
      for (const p of state.pacientes) {
        const option = node(
          'option',
          `${p.nombres ?? ''} ${p.apellidos ?? ''}`.trim() || p.idPersonaRol,
        );
        option.value = p.idPersonaRol;
        this.patients.append(option);
      }
      this.patients.value = previous;
      const docs = this.newPatientInputs?.idTipoDocumento;
      if (docs) {
        const selectedType = docs.value;
        docs.replaceChildren(node('option', 'Selecciona tipo de documento'));
        docs.firstChild.value = '';
        for (const type of state.tiposDocumento) {
          const option = node('option', type.nombre);
          option.value = type.idTipoDocumento;
          docs.append(option);
        }
        docs.value = selectedType;
      }
      if (this.initialProcedure) {
        const selectedProcedure = this.initialProcedure.value;
        this.initialProcedure.replaceChildren(node('option', 'Selecciona un procedimiento'));
        this.initialProcedure.firstChild.value = '';
        for (const item of state.procedimientos) {
          const option = node('option', item.nombre || item.idProcedimiento);
          option.value = item.idProcedimiento;
          this.initialProcedure.append(option);
        }
        this.initialProcedure.value = selectedProcedure;
        const buttons = this.initialProcedurePager?.querySelectorAll('button') || [];
        if (buttons.length === 2) {
          buttons[0].disabled = state.firstProcedimientos === 0;
          buttons[1].disabled = state.firstProcedimientos + state.procedimientos.length >= state.totalProcedimientos;
        }
      }
      if (state.message.startsWith('Paciente registrado') && state.pacientes.length)
        this.patients.value = state.pacientes.at(-1).idPersonaRol;
    }
    if (state.editor === 'procedimiento' && !state.selected && this.procedures) {
      const previous = this.procedures.value;
      this.procedures.replaceChildren(node('option', 'Selecciona un procedimiento'));
      this.procedures.firstChild.value = '';
      for (const p of state.procedimientos) {
        const option = node('option', p.nombre ?? p.idProcedimiento);
        option.value = p.idProcedimiento;
        this.procedures.append(option);
      }
      this.procedures.value = previous;
      this.catalogPrev.disabled = state.firstProcedimientos === 0;
      this.catalogNext.disabled = state.firstProcedimientos + 20 >= state.totalProcedimientos;
    }
    this.save.textContent = state.writing ? 'Guardando…' : 'Guardar';
    this.form.setAttribute('aria-busy', String(state.writing));
    this.form.querySelectorAll('input,textarea,select,button').forEach((input) => {
      input.disabled = state.writing;
    });
    if (this.catalogPrev) {
      this.catalogPrev.disabled = state.writing || state.firstProcedimientos === 0;
      this.catalogNext.disabled =
        state.writing || state.firstProcedimientos + 20 >= state.totalProcedimientos;
    }
    if (this.registrationStatus) this.registrationStatus.textContent = state.error ? gestionError(state.error) : state.message;
    this.error.textContent = state.error ? gestionError(state.error) : '';
  }
  destroy() {
    if (!this._mounted) return;
    this._mounted = false;
    editableRecord(document.querySelector('[data-ui=detail]'), () => {}, false);
    this.cards.removeEventListener('dblclick', this.openCard);
    this.unsubscribe();
    if (this.dialog.open) this.dialog.close();
    this.root.replaceChildren();
    this.remove();
  }
  connectedCallback() {
    if (this._mountArgs) {
      const args = this._mountArgs;
      this._mountArgs = null;
      this.mount(...args);
      this._clearFormValidation = [this.form, this.login]
        .filter(Boolean)
        .map((form) => bindFormValidation(form, this));
    }
  }
  disconnectedCallback() {
    this._clearFormValidation?.forEach((clear) => clear());
    this._clearFormValidation = null;
    this.destroy();
  }
}

if (!customElements.get('galenos-consulta-gestion'))
  customElements.define('galenos-consulta-gestion', ConsultaGestionModel);
