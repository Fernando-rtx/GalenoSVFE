import '../components/tarjeta_consulta.js';
export class PortalAcademicoModel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  connectedCallback() {
    this.render();
  }
  render() {
    const patient = this.portal === 'paciente';
    this.shadowRoot.innerHTML = `<link rel="stylesheet" href="/resources/estilos/portal-academico.css"><h1>${patient ? 'Consulta tus citas' : 'Portal de empleados'}</h1><p>${patient ? 'Identifícate para consultar tus citas y descargar tu ticket.' : 'Identificación académica por documento, sin contraseña. Simulación para el examen.'}</p>
    <p role="status" aria-live="polite"></p><button type="button" data-retry hidden>Reintentar conexión</button>
    <form data-login novalidate><label for="tipo">Tipo de documento</label><select id="tipo" required><option value="">Selecciona un tipo</option></select><p id="documento-hint" data-hint></p><label for="valor">Número de documento</label><input id="valor" required disabled autocomplete="off" aria-describedby="documento-hint"><button type="submit">${patient ? 'Consultar paciente' : 'Iniciar sesión'}</button></form>
    <section data-context hidden><h2 data-name></h2><p data-context-note></p><ul data-assignments></ul>${patient ? '' : '<label for=asignacion>Asignación de trabajo</label><select id=asignacion></select>'}<button type="button" data-refresh>Actualizar contexto</button><button type="button" data-logout>Cerrar sesión</button></section>
    ${patient ? '<form data-search hidden novalidate><label for="clinica">Clínica</label><select id="clinica" required><option value="">Selecciona una clínica</option></select><label for="desde">Fecha inicial</label><input id="desde" type="date" required><label for="hasta">Fecha final</label><input id="hasta" type="date" required><button type="submit">Buscar citas</button></form><div data-results></div><button type="button" data-prev hidden>Anterior</button><button type="button" data-next hidden>Siguiente</button>' : ''}`;
    this.shadowRoot.addEventListener('submit', (e) => {
      e.preventDefault();
      this.emit(e.target.matches('[data-login]') ? 'identificar' : 'buscar');
    });
    for (const [selector, name] of [
      ['[data-retry]', 'reintentar'],
      ['[data-logout]', 'salir'],
      ['[data-refresh]', 'actualizar'],
      ['[data-prev]', 'anterior'],
      ['[data-next]', 'siguiente'],
    ])
      this.shadowRoot.querySelector(selector)?.addEventListener('click', () => this.emit(name));
    this.shadowRoot
      .querySelector('#asignacion')
      ?.addEventListener('change', () => this.emit('asignacion'));
    this.shadowRoot.querySelector('#tipo').addEventListener('change', () => {
      const value = this.shadowRoot.querySelector('#valor');
      value.value = '';
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
  retry(visible) {
    this.shadowRoot.querySelector('[data-retry]').hidden = !visible;
  }
  busy(value) {
    this.shadowRoot.querySelector('form[data-login]').setAttribute('aria-busy', String(value));
    for (const el of this.shadowRoot.querySelectorAll('button,input,select')) el.disabled = value;
    if (!value && !this.value('tipo')) this.shadowRoot.querySelector('#valor').disabled = true;
  }
  tipos(rows) {
    const select = this.shadowRoot.querySelector('#tipo');
    select.length = 1;
    for (const row of rows) select.add(new Option(row.nombre, row.idTipoDocumento));
  }
  hint(value) {
    this.shadowRoot.querySelector('[data-hint]').textContent = value ?? '';
  }
  context(context) {
    this.shadowRoot.querySelector('[data-context]').hidden = !context;
    this.shadowRoot.querySelector('[data-login]').hidden = Boolean(context);
    this.shadowRoot.querySelector('[data-search]')?.toggleAttribute('hidden', !context);
    this.clearResults();
    if (!context) {
      this.shadowRoot.querySelector('#valor').value = '';
      return;
    }
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
      const previous = assignments.value;
      assignments.replaceChildren();
      for (const a of context.asignaciones)
        assignments.add(new Option(`${a.rolNombre} · ${a.clinicaNombre}`, a.idPersonaRol));
      if (context.asignaciones.some((a) => a.idPersonaRol === previous))
        assignments.value = previous;
    }
    const select = this.shadowRoot.querySelector('#clinica');
    if (select) {
      select.length = 1;
      for (const [id, name] of clinics) select.add(new Option(name, id));
    }
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
