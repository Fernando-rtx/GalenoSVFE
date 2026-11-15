import '../components/tarjeta_consulta.js';
export class PortalAcademicoModel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  connectedCallback() {
    if (!this.shadowRoot.firstChild) this.render();
  }
  render() {
    const patient = this.portal === 'paciente';
    this.toggleAttribute('data-employee', !patient);
    this.shadowRoot.innerHTML = `<link rel="stylesheet" href="/resources/estilos/portal-academico.css">${patient ? '' : '<img class="portal-logo" src="/resources/imagenes/galenos-sv-logo.png" alt="GalenosSV"><p class="eyebrow">Portal de empleados</p>'}<h1>${patient ? 'Consulta tus citas' : 'Acceso de empleados'}</h1><p>${patient ? 'Identifícate para consultar tus citas y descargar tu ticket.' : 'Identifícate con tu documento y elige el rol y la clínica donde vas a trabajar.'}</p>
    <p role="status" aria-live="polite"></p><button type="button" data-retry hidden>Reintentar conexión</button>
    <form data-login novalidate><label for="tipo">Tipo de documento</label><select id="tipo" required aria-describedby="tipo-error"><option value="">Selecciona un tipo</option></select><p id="tipo-error" class="field-error"></p><p id="documento-hint" data-hint>Selecciona el tipo que corresponde a tu documento.</p><label for="valor">Número de documento</label><input id="valor" required disabled autocomplete="off" spellcheck="false" aria-describedby="documento-hint valor-error"><p id="valor-error" class="field-error"></p><button type="submit">${patient ? 'Consultar paciente' : 'Ingresar'}</button>${patient ? '' : '<p class="academic-note">Identificación académica sin contraseña para el examen. No es autenticación de producción.</p>'}</form>
    <section data-context hidden aria-label="Asignaciones disponibles"><h2 data-name></h2><p data-context-note></p><ul data-assignments></ul>${patient ? '' : '<label for="asignacion">Rol y clínica de trabajo</label><select id="asignacion" aria-describedby="asignacion-note"></select><p id="asignacion-note">Solo puedes elegir asignaciones vigentes de tu persona.</p><div class="assignment-summary" data-selected></div><button type="button" data-continue>Entrar al dashboard</button>'}<button type="button" class="secondary" data-refresh>Actualizar contexto</button><button type="button" class="secondary" data-logout>Cerrar sesión</button></section>
    ${patient ? '<form data-search hidden novalidate><label for="clinica">Clínica</label><select id="clinica" required><option value="">Selecciona una clínica</option></select><label for="desde">Fecha inicial</label><input id="desde" type="date" required><label for="hasta">Fecha final</label><input id="hasta" type="date" required><button type="submit">Buscar citas</button></form><div data-results></div><button type="button" data-prev hidden>Anterior</button><button type="button" data-next hidden>Siguiente</button>' : ''}`;
    this.shadowRoot.addEventListener('submit', (e) => {
      e.preventDefault();
      this.emit(e.target.matches('[data-login]') ? 'identificar' : 'buscar');
    });
    for (const [selector, name] of [
      ['[data-retry]', 'reintentar'],
      ['[data-logout]', 'salir'],
      ['[data-refresh]', 'actualizar'],
      ['[data-continue]', 'continuar'],
      ['[data-prev]', 'anterior'],
      ['[data-next]', 'siguiente'],
    ])
      this.shadowRoot.querySelector(selector)?.addEventListener('click', () => this.emit(name));
    this.shadowRoot.querySelector('#asignacion')?.addEventListener('change', () => {
      this.selectedSummary();
      this.emit('asignacion');
    });
    this.shadowRoot.querySelector('#tipo').addEventListener('change', () => {
      const value = this.shadowRoot.querySelector('#valor');
      value.value = '';
      this.clearValidation();
      value.disabled = !this.value('tipo');
      this.emit('tipo');
    });
    for (const id of ['clinica', 'desde', 'hasta'])
      this.shadowRoot
        .querySelector(`#${id}`)
        ?.addEventListener('change', () => this.clearResults());
  }
  emit(name) {
    this.dispatchEvent(new CustomEvent(`portal-${name}`, { bubbles: true, composed: true }));
  }
  value(id) {
    return this.shadowRoot.getElementById(id)?.value ?? '';
  }
  status(message) {
    this.shadowRoot.querySelector('[role=status]').textContent = message;
  }
  clearValidation() {
    for (const id of ['tipo', 'valor']) {
      this.shadowRoot.getElementById(id).removeAttribute('aria-invalid');
      this.shadowRoot.getElementById(`${id}-error`).textContent = '';
    }
  }
  validation(error) {
    const field = error.code?.startsWith('DOCUMENT_TYPE_')
      ? 'tipo'
      : ['DOCUMENT_REQUIRED', 'DOCUMENT_FORMAT'].includes(error.code) ||
          error.message === 'Formato de documento inválido'
        ? 'valor'
        : null;
    if (!field) return;
    this.shadowRoot.getElementById(field).setAttribute('aria-invalid', 'true');
    this.shadowRoot.getElementById(`${field}-error`).textContent = error.message;
    this.pendingFocus = `#${field}`;
  }
  focusPending() {
    if (this.pendingFocus && this.getClientRects().length)
      this.shadowRoot.querySelector(this.pendingFocus)?.focus();
    this.pendingFocus = null;
  }
  retry(visible) {
    this.shadowRoot.querySelector('[data-retry]').hidden = !visible;
  }
  busy(value) {
    this.shadowRoot.querySelector('form[data-login]').setAttribute('aria-busy', String(value));
    this.shadowRoot.querySelector('[data-context]').setAttribute('aria-busy', String(value));
    this.shadowRoot.querySelector('[role=status]').classList.toggle('loading', value);
    for (const el of this.shadowRoot.querySelectorAll('button,input,select')) el.disabled = value;
    if (!value && !this.value('tipo')) this.shadowRoot.querySelector('#valor').disabled = true;
  }
  tipos(rows) {
    const select = this.shadowRoot.querySelector('#tipo');
    const previous = select.value;
    select.length = 1;
    for (const row of rows) select.add(new Option(row.nombre, row.idTipoDocumento));
    if (rows.some((row) => row.idTipoDocumento === previous)) select.value = previous;
  }
  hint(value) {
    this.shadowRoot.querySelector('[data-hint]').textContent = value ?? '';
  }
  context(context, selected) {
    this.shadowRoot.querySelector('[data-context]').hidden = !context;
    this.shadowRoot.querySelector('[data-login]').hidden = Boolean(context);
    this.shadowRoot.querySelector('[data-search]')?.toggleAttribute('hidden', !context);
    this.clearResults();
    if (!context) {
      this.shadowRoot.querySelector('#valor').value = '';
      this.shadowRoot.querySelector('[data-name]').textContent = '';
      this.shadowRoot.querySelector('[data-assignments]').replaceChildren();
      this.shadowRoot.querySelector('#asignacion')?.replaceChildren();
      this.shadowRoot.querySelector('[data-selected]')?.replaceChildren();
      this.pendingFocus = '#tipo';
      return;
    }
    this.shadowRoot.querySelector('#valor').value = '';
    this.shadowRoot.querySelector('[data-name]').textContent = context.personaNombre;
    this.shadowRoot.querySelector('[data-context-note]').textContent =
      `Asignaciones disponibles · ${context.zonaHoraria}`;
    const list = this.shadowRoot.querySelector('[data-assignments]');
    list.replaceChildren();
    const clinics = new Map();
    for (const a of context.asignaciones) {
      const li = document.createElement('li');
      li.textContent = `${a.rolNombre} · ${a.clinicaNombre}`;
      list.append(li);
      clinics.set(a.idClinica, a.clinicaNombre);
    }
    const assignments = this.shadowRoot.querySelector('#asignacion');
    if (assignments) {
      assignments.replaceChildren();
      for (const a of context.asignaciones)
        assignments.add(new Option(`${a.rolNombre} · ${a.clinicaNombre}`, a.idPersonaRol));
      if (context.asignaciones.some((a) => a.idPersonaRol === selected))
        assignments.value = selected;
      this.selectedSummary();
      this.pendingFocus = '#asignacion';
    }
    const select = this.shadowRoot.querySelector('#clinica');
    if (select) {
      select.length = 1;
      for (const [id, name] of clinics) select.add(new Option(name, id));
    }
  }
  selectedSummary() {
    const summary = this.shadowRoot.querySelector('[data-selected]');
    if (summary)
      summary.textContent = `Vas a trabajar como ${this.shadowRoot.querySelector('#asignacion').selectedOptions[0]?.textContent ?? ''}`;
  }
  clearResults() {
    this.shadowRoot.querySelector('[data-results]')?.replaceChildren();
    for (const sel of ['[data-prev]', '[data-next]'])
      this.shadowRoot.querySelector(sel)?.setAttribute('hidden', '');
  }
  results(rows, total, first, zona) {
    this.clearResults();
    for (const datos of rows) {
      const card = document.createElement('tarjeta-consulta');
      card.consulta = { ...datos, rolNombre: 'Paciente', portalPaciente: true, zonaHoraria: zona };
      this.shadowRoot.querySelector('[data-results]').append(card);
    }
    this.shadowRoot.querySelector('[data-prev]').hidden = first === 0;
    this.shadowRoot.querySelector('[data-next]').hidden = first + rows.length >= total;
    this.status(
      total
        ? `${total} citas encontradas. Mostrando ${first + 1} a ${first + rows.length}.`
        : 'No hay citas en el rango seleccionado.',
    );
  }
}
