import { normalizarFechaNacimiento } from '../../control/fecha-nacimiento.js';
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
    this.nextStepLink = node('a', 'Abrir bandeja de atención');
    this.nextStepLink.href = '#academico';
    this.actions = node('div', undefined, 'gestion-tools');
    this.create = node('button', 'Crear cita', 'primary-button');
    this.createPatient = node('button', 'Registrar paciente', 'secondary-button');
    this.add = node('button', 'Asociar procedimiento', 'secondary-button');
    this.create.onclick = () => control.editConsulta(true);
    this.createPatient.onclick = () => control.editPatient();
    this.add.onclick = () => control.newProcedure();
    this.actions.append(this.create, this.createPatient, this.add);
    this.flowHint = node('p', 'Esta pantalla sirve para programar y revisar citas. Para registrar la recepción y avanzar la atención, abre la Bandeja de consultas del Dashboard.');
    this.flowHint.className = 'reception-flow-hint';
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
    this.backStep = node('button', 'Volver al paciente', 'secondary-button');
    this.backStep.type = 'button';
    this.backStep.hidden = true;
    this.backStep.onclick = () => { this.wizardStep = 1; this.render(this.control.state); };
    this.nextStep = node('button', 'Continuar a la cita', 'primary-button');
    this.nextStep.type = 'button';
    this.nextStep.hidden = true;
    this.nextStep.onclick = () => this.continueToAppointment();
    this.cancel.onclick = () => control.cancel();
    this.dialog.oncancel = (event) => {
      event.preventDefault();
      control.cancel();
    };
    const actions = node('div', undefined, 'gestion-tools');
    actions.append(this.cancel, this.backStep, this.nextStep, this.save);
    this.form.append(this.fields, this.error, actions);
    this.dialog.append(this.form);
    root.append(this.notice, this.nextStepLink, this.flowHint, this.actions, this.relationshipSection, this.dialog);
    this.form.onsubmit = (event) => {
      event.preventDefault();
      if (this.isNewAppointment && this.wizardStep === 1) return this.continueToAppointment();
      if (control.state.editor === 'paciente' && !this.validateBirthInput(this.form.elements.fechaNacimiento)) return;
      return control.save(this.data(control.state));
    };
    const application = root.closest('galenos-application');
    this.cards = application?.querySelector('[data-ui=cards]');
    this.detail = application?.querySelector('[data-ui=detail]');
    this.openCard = (event) => {
      const card = event.target.closest('tarjeta-consulta');
      if (card && !event.composedPath().some((n) => n.matches?.('button')))
        control.openConsulta(card.consulta.idConsulta);
    };
    this.cards.addEventListener('dblclick', this.openCard);
    this.unsubscribe = () => {};
    const unsubscribe = control.subscribe((state) => this.render(state));
    if (typeof unsubscribe === 'function') this.unsubscribe = unsubscribe;
  }
  field(name, label, type = 'text', value = '', required = false, target = this.fields) {
    const input = node(type === 'textarea' ? 'textarea' : 'input');
    input.name = name;
    input.id = 'consulta-gestion-' + name;
    if (type !== 'textarea') input.type = type;
    input.value = value ?? '';
    input.required = required;
    const title = node('label', label);
    title.htmlFor = input.id;
    target.append(title, input);
    if (name === 'fechaNacimiento') this.prepareBirthInput(input);
    return input;
  }
  prepareBirthInput(input) {
    input.type = 'text';
    input.inputMode = 'text';
    input.placeholder = 'DD/MM/AAAA';
    input.maxLength = 10;
    input.autocomplete = 'bday';
    const hint = node('small', 'Escribe DD/MM/AAAA, por ejemplo 05/09/1998.');
    hint.id = input.id + '-hint';
    const message = node('p', '', 'action-error');
    message.id = input.id + '-error';
    message.setAttribute('role', 'alert');
    input.setAttribute('aria-describedby', `${hint.id} ${message.id}`);
    input.after(hint, message);
    this.birthErrors ??= new WeakMap();
    this.birthErrors.set(input, message);
    input.addEventListener('input', () => {
      message.textContent = '';
      input.removeAttribute('aria-invalid');
    });
  }
  validateBirthInput(input) {
    const message = this.birthErrors.get(input);
    try {
      normalizarFechaNacimiento(input.value);
      message.textContent = '';
      input.removeAttribute('aria-invalid');
      return true;
    } catch (error) {
      message.textContent = error.message;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return false;
    }
  }
  continueToAppointment() {
    if (!this.patients?.value) {
      this.patientStepMessage.textContent = 'Busca y selecciona un paciente, o regístralo aquí para continuar.';
      this.patientStepMessage.setAttribute('role', 'alert');
      this.patients?.focus();
      return;
    }
    this.patientSummary.textContent = `Paciente: ${this.patients.selectedOptions[0]?.textContent || ''}`;
    this.wizardStep = 2;
    this.render(this.control.state);
    this.initialProcedure?.focus();
  }
  buildAppointmentWizard() {
    this.isNewAppointment = true;
    this.wizardStep = 1;
    this.fields.append(node('p', 'Primero identifica al paciente. Después defines la cita y su ruta de atención.'));
    this.wizardProgress = node('p', 'Paso 1 de 2 · Paciente');
    this.wizardProgress.className = 'appointment-progress';
    this.wizardProgress.setAttribute('role', 'status');
    this.fields.append(this.wizardProgress);

    this.patientSection = node('section', undefined, 'appointment-stage');
    this.patientSection.append(node('h3', '1. Paciente'));
    const search = this.field('buscar', 'Buscar por nombre o número de documento', 'search', '', false, this.patientSection);
    const searchButton = node('button', 'Buscar paciente', 'secondary-button');
    searchButton.type = 'button';
    searchButton.onclick = () => this.control.searchPatients(search.value);
    this.patientSection.append(searchButton);
    const patientLabel = node('label', 'Resultados');
    patientLabel.htmlFor = 'consulta-paciente';
    this.patients = node('select');
    this.patients.name = 'idPersonaRol';
    this.patients.id = 'consulta-paciente';
    this.patients.required = true;
    this.patients.append(node('option', 'Busca para ver pacientes disponibles'));
    this.patients.firstChild.value = '';
    this.patientSection.append(patientLabel, this.patients);
    this.patients.addEventListener('change', () => {
      this.patientStepMessage.textContent = 'Paciente seleccionado. Continúa para programar la cita.';
      this.patientStepMessage.removeAttribute('role');
    });
    this.patientStepMessage = node('p', 'Busca por nombre o documento antes de registrar a una persona nueva.');
    this.patientStepMessage.className = 'procedure-status';
    this.patientSection.append(this.patientStepMessage);

    this.registerNewPatient = node('button', 'No aparece · Registrar paciente', 'secondary-button');
    this.registerNewPatient.type = 'button';
    this.registerNewPatient.hidden = true;
    this.registrationExpanded = false;
    this.registerNewPatient.onclick = () => {
      this.registrationExpanded = true;
      this.registrationDetails.hidden = false;
      this.newPatientInputs.nombres.focus();
    };
    this.patientSection.append(this.registerNewPatient);
    this.registrationDetails = node('section', undefined, 'inline-registration');
    this.registrationDetails.hidden = true;
    this.registrationDetails.append(node('h4', 'Registrar paciente nuevo'));
    const patientFields = node('div', undefined, 'gestion-fields');
    this.newPatientInputs = {};
    for (const [name, label, type] of [
      ['nombres', 'Nombres', 'text'], ['apellidos', 'Apellidos', 'text'],
      ['fechaNacimiento', 'Fecha de nacimiento', 'date'], ['documento', 'Número de documento', 'text'],
    ]) {
      const input = node('input');
      input.type = type;
      input.name = name;
      input.id = 'consulta-nuevo-' + name;
      input.autocomplete = name === 'documento' ? 'off' : name;
      const labelNode = node('label', label);
      labelNode.htmlFor = input.id;
      patientFields.append(labelNode, input);
      if (name === 'fechaNacimiento') this.prepareBirthInput(input);
      this.newPatientInputs[name] = input;
    }
    const typeLabel = node('label', 'Tipo de documento');
    const docType = node('select');
    docType.name = 'idTipoDocumentoNuevo';
    docType.id = 'consulta-nuevo-tipo-documento';
    typeLabel.htmlFor = docType.id;
    patientFields.append(typeLabel, docType);
    this.newPatientInputs.idTipoDocumento = docType;
    this.registrationStatus = node('p');
    this.registrationStatus.setAttribute('role', 'status');
    const register = node('button', 'Guardar paciente y continuar', 'secondary-button');
    register.type = 'button';
    register.onclick = () => this.registerPatient();
    patientFields.append(register, this.registrationStatus);
    this.registrationDetails.append(patientFields);
    this.patientSection.append(this.registrationDetails);
    this.fields.append(this.patientSection);

    this.appointmentSection = node('section', undefined, 'appointment-stage');
    this.appointmentSection.hidden = true;
    this.appointmentSection.append(node('h3', '2. Cita y recepción'));
    this.patientSummary = node('p');
    this.patientSummary.className = 'appointment-patient-summary';
    this.appointmentSection.append(this.patientSummary, node('p', 'La primera actividad de la ruta se asignará a recepción.'));
    const procedureLabel = node('label', 'Ruta de atención');
    procedureLabel.htmlFor = 'consulta-procedimiento-inicial';
    this.initialProcedure = node('select');
    this.initialProcedure.name = 'idProcedimiento';
    this.initialProcedure.id = 'consulta-procedimiento-inicial';
    this.initialProcedure.required = true;
    this.appointmentSection.append(procedureLabel, this.initialProcedure);
    this.initialProcedureStatus = node('p', 'Cargando rutas de atención…');
    this.initialProcedureStatus.className = 'procedure-status';
    this.initialProcedureStatus.setAttribute('role', 'status');
    this.initialProcedureStatus.setAttribute('aria-live', 'polite');
    this.initialProcedureRetry = node('button', 'Reintentar carga', 'secondary-button');
    this.initialProcedureRetry.type = 'button';
    this.initialProcedureRetry.hidden = true;
    this.initialProcedureRetry.onclick = () => this.control.loadProcedures(this.control.state.firstProcedimientos);
    this.appointmentSection.append(this.initialProcedureStatus, this.initialProcedureRetry);
    this.initialProcedurePager = node('div', undefined, 'gestion-tools');
    const prev = node('button', 'Rutas anteriores', 'text-button');
    const next = node('button', 'Más rutas', 'text-button');
    prev.type = next.type = 'button';
    prev.onclick = () => this.control.loadProcedures(this.control.state.firstProcedimientos - 20);
    next.onclick = () => this.control.loadProcedures(this.control.state.firstProcedimientos + 20);
    this.initialProcedurePager.append(prev, next);
    this.appointmentSection.append(this.initialProcedurePager);
    this.field('referenciaExterna', 'Referencia externa (opcional)', 'text', '', false, this.appointmentSection);
    this.field('fechaInicio', 'Fecha y hora de la cita', 'datetime-local', localDate(new Date().toISOString()), true, this.appointmentSection);
    this.field('fechaFin', 'Fin (opcional)', 'datetime-local', '', false, this.appointmentSection);
    this.field('observaciones', 'Indicaciones para recepción (opcional)', 'textarea', '', false, this.appointmentSection);
    this.fields.append(this.appointmentSection);
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
            : state.editor === 'paciente'
              ? 'Registrar paciente'
            : value
              ? 'Editar consulta'
            : 'Programar cita',
      ),
    );
    this.isNewAppointment = state.editor === 'consulta' && !value;
    if (state.editor === 'paciente') {
      this.patientDocType = node('select');
      this.patientDocType.name = 'idTipoDocumento';
      this.patientDocType.id = 'consulta-registro-tipo-documento';
      this.patientDocType.required = true;
      const typeLabel = node('label', 'Tipo de documento');
      typeLabel.htmlFor = this.patientDocType.id;
      this.fields.append(typeLabel, this.patientDocType);
      for (const [name, label, type, required] of [
        ['nombres', 'Nombres', 'text', true], ['apellidos', 'Apellidos', 'text', true],
        ['fechaNacimiento', 'Fecha de nacimiento', 'date', true], ['documento', 'Número de documento', 'text', true],
      ]) this.field(name, label, type, '', required);
      this.fields.append(node('p', 'Se creará una persona con rol Paciente en la clínica seleccionada.'));
    }
    if (state.editor === 'consulta') {
      if (value)
        this.fields.append(node('p', 'Paciente: ' + (value.personaNombre ?? value.idPersonaRol)));
      else this.buildAppointmentWizard();
      if (value) {
        const reference = this.field(
          'referenciaExterna',
          'Referencia externa',
          'text',
          value?.referenciaExterna,
        );
        reference.maxLength = 255;
      }
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
        this.procedureStatus = node('p', 'Cargando procedimientos…');
        this.procedureStatus.className = 'procedure-status';
        this.procedureStatus.setAttribute('role', 'status');
        this.procedureStatus.setAttribute('aria-live', 'polite');
        this.fields.append(this.procedureStatus);
        this.procedureRetry = node('button', 'Reintentar carga', 'secondary-button');
        this.procedureRetry.type = 'button';
        this.procedureRetry.hidden = true;
        this.procedureRetry.onclick = () => this.control.loadProcedures(this.control.state.firstProcedimientos);
        this.fields.append(this.procedureRetry);
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
    if (state.editor !== 'paciente' && !this.isNewAppointment) {
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
    }
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
    } else if (state.editor !== 'paciente' && !this.isNewAppointment) this.field('observaciones', 'Observaciones', 'textarea', value?.observaciones);
  }
  data(state) {
    const f = this.form.elements;
    if (state.editor === 'paciente') {
      return {
        nombres: f.nombres.value.trim(),
        apellidos: f.apellidos.value.trim(),
        fechaNacimiento: `${normalizarFechaNacimiento(f.fechaNacimiento.value)}T18:00:00.000Z`,
        idTipoDocumento: f.idTipoDocumento.value,
        documento: f.documento.value.trim(),
      };
    }
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
    if (!this.validateBirthInput(fields.fechaNacimiento)) return;
    const data = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value.trim()]));
    if (Object.values(data).some((value) => !value)) {
      this.registrationStatus.textContent = 'Completa todos los datos para registrar al paciente.';
      return;
    }
    data.fechaNacimiento = `${normalizarFechaNacimiento(data.fechaNacimiento)}T18:00:00.000Z`;
    await this.control.registerPatient(data);
  }
  renderRelationships(state, reception) {
    this.relationshipSection.hidden = !state.consulta;
    this.relationshipSection.replaceChildren();
    if (state.consulta) {
      const patient = state.consulta.personaNombre || 'Paciente sin nombre registrado';
      const clinic = state.consulta.clinicaNombre ? ` · ${state.consulta.clinicaNombre}` : '';
      this.relationshipSection.append(node('p', `Paciente: ${patient}${clinic}`, 'appointment-patient-summary'));
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
            const assignment = obtenerAsignacionEmpleado();
            const responsible = assignment?.idPersonaRol === row.idPersonaRol
              ? `${assignment.rolNombre || 'Empleado'} · Tú`
              : 'Personal asignado';
            const stateName = ({ PENDIENTE: 'Pendiente', EN_CURSO: 'En curso', COMPLETADO: 'Completado' })[row.estado] || 'Sin estado';
            line.append(
              node(
                'span',
                `${stateName} · Inicio: ${row.fechaInicio ? new Date(row.fechaInicio).toLocaleString() : 'Sin fecha'} · Responsable: ${responsible}`,
              ),
            );
            if (row.estado !== 'COMPLETADO') {
              const attend = node('a', 'Atender consulta', 'primary-button');
              attend.href = '#academico';
              line.append(attend);
            }
          } else {
            line.append(node('span', `Ruta de atención · ${row.fechaInicio ? new Date(row.fechaInicio).toLocaleString() : 'Sin fecha'}`));
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
    }
  }
  render(state) {
    this.notice.textContent = state.error ? gestionError(state.error) : state.message;
    const reception = normalizarRol(obtenerAsignacionEmpleado()?.rolNombre) === 'atencion al publico';
    this.nextStepLink.hidden = !reception;
    this.flowHint.hidden = !reception;
    this.create.hidden = normalizarRol(obtenerAsignacionEmpleado()?.rolNombre) !== 'atencion al publico';
    this.create.disabled = state.writing || !state.clinic;
    this.createPatient.hidden = !reception;
    this.createPatient.disabled = state.writing || !state.clinic || !reception;
    this.add.hidden = !reception;
    this.add.disabled = state.writing || !state.consulta || !reception;
    editableRecord(
      this.detail,
      () => this.control.editConsulta(false),
      Boolean(state.consulta) && !state.writing && reception,
    );
    this.renderRelationships(state, reception);
    if (state.editor && !this.dialog.open) {
      this.build(state);
      showAccessibleDialog(this.dialog);
    }
    if (!state.editor && this.dialog.open) this.dialog.close();
    if (this.isNewAppointment && state.editor === 'consulta') {
      const onPatient = this.wizardStep === 1;
      this.patientSection.hidden = !onPatient;
      this.appointmentSection.hidden = onPatient;
      this.wizardProgress.textContent = onPatient ? 'Paso 1 de 2 · Paciente' : 'Paso 2 de 2 · Cita y recepción';
      this.backStep.hidden = onPatient;
      this.nextStep.hidden = !onPatient;
      this.save.hidden = onPatient;
      this.save.textContent = state.writing ? 'Guardando…' : 'Crear cita';
      this.initialProcedure.required = !onPatient;
      this.form.elements.fechaInicio.required = !onPatient;
    } else {
      this.backStep.hidden = true;
      this.nextStep.hidden = true;
      this.save.hidden = false;
    }
    if (state.editor === 'consulta' && !state.selected && this.patients) {
      if (this.registrationDetails) {
        this.registrationDetails.hidden = !state.busquedaRealizada || state.pacientes.length > 0 || !this.registrationExpanded;
        this.registerNewPatient.hidden = !state.busquedaRealizada || state.pacientes.length > 0;
      }
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
        this.updateProcedureStatus(this.initialProcedureStatus, state);
        this.initialProcedureRetry.hidden = state.procedimientosStatus !== 'error';
        const buttons = this.initialProcedurePager?.querySelectorAll('button') || [];
        if (buttons.length === 2) {
          buttons[0].disabled = state.firstProcedimientos === 0;
          buttons[1].disabled = state.firstProcedimientos + state.procedimientos.length >= state.totalProcedimientos;
          this.initialProcedurePager.hidden = state.procedimientosStatus !== 'ready' || state.totalProcedimientos <= 20;
        }
      }
      if (state.message.startsWith('Paciente registrado') && state.pacientes.length) {
        this.patients.value = state.pacientes.at(-1).idPersonaRol;
        if (this.wizardStep === 1) this.continueToAppointment();
      }
    }
    if (state.editor === 'paciente' && this.patientDocType) {
      const previous = this.patientDocType.value;
      this.patientDocType.replaceChildren(node('option', 'Selecciona tipo de documento'));
      this.patientDocType.firstChild.value = '';
      for (const type of state.tiposDocumento) {
        const option = node('option', type.nombre);
        option.value = type.idTipoDocumento;
        this.patientDocType.append(option);
      }
      this.patientDocType.value = previous;
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
      this.updateProcedureStatus(this.procedureStatus, state);
      this.procedureRetry.hidden = state.procedimientosStatus !== 'error';
      this.catalogPrev.disabled = state.firstProcedimientos === 0;
      this.catalogNext.disabled = state.firstProcedimientos + 20 >= state.totalProcedimientos;
      this.catalogPager.hidden = state.procedimientosStatus !== 'ready' || state.totalProcedimientos <= 20;
    }
    this.save.textContent = state.writing ? 'Guardando…' : 'Guardar';
    if (state.editor === 'paciente') this.save.textContent = state.writing ? 'Guardando…' : 'Registrar paciente';
    this.form.setAttribute('aria-busy', String(state.writing));
    this.form.querySelectorAll('input,textarea,select,button').forEach((input) => {
      input.disabled = state.writing;
    });
    if (this.catalogPrev) {
      this.catalogPrev.disabled = state.writing || state.firstProcedimientos === 0;
      this.catalogNext.disabled =
        state.writing || state.firstProcedimientos + 20 >= state.totalProcedimientos;
    }
    if (this.registrationStatus) this.registrationStatus.textContent = state.error ? '' : state.message;
    this.error.textContent = state.error ? gestionError(state.error) : '';
  }
  updateProcedureStatus(target, state) {
    if (!target) return;
    const count = state.totalProcedimientos;
    const messages = {
      idle: 'Las rutas disponibles aparecerán aquí.',
      loading: 'Cargando rutas de atención…',
      ready: `${count} ${count === 1 ? 'ruta disponible' : 'rutas disponibles'}. La primera actividad se asigna a recepción.`,
      empty: 'No hay rutas activas para esta clínica. Revisa la configuración de procedimientos.',
      error: 'No se pudieron cargar las rutas. Revisa tu conexión y vuelve a intentar.',
    };
    target.textContent = messages[state.procedimientosStatus] || messages.idle;
  }
  destroy() {
    if (!this._mounted) return;
    this._mounted = false;
    editableRecord(
      this.detail,
      () => {},
      false,
    );
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
