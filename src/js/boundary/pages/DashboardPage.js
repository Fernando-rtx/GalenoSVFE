import { consultaCardModel, errorMessage, formatDate } from './dashboard-presentation.js';

/** Página Boundary. Recibe Control; no importa DAO, configuración HTTP ni Fetch. */
export default class DashboardPage {
  constructor(root, control) {
    this.root = root;
    this.control = control;
    this._events = new AbortController();
    this._closed = false;
    this._clinicRows = null;
    this._consultaRows = null;
    this._usingCards = null;
    this.nodes = {};
    root.querySelectorAll('[data-ui]').forEach(node => { this.nodes[node.dataset.ui] = node; });
    const on = (node, event, callback) => node.addEventListener(event, callback, { signal: this._events.signal });
    const perform = action => {
      this.nodes.actionError.hidden = true;
      return Promise.resolve().then(action).catch(error => {
        if (this._closed) return;
        this.nodes.actionError.textContent = errorMessage(error);
        this.nodes.actionError.hidden = false;
      });
    };
    on(this.nodes.clinica, 'change', () => perform(() => control.selectClinica(this.nodes.clinica.value || null)));
    on(this.nodes.filters, 'submit', event => {
      event.preventDefault();
      const filters = {};
      ['fechaDesde', 'fechaHasta', 'idPersonaRol'].forEach(key => {
        const value = this.nodes[key].value.trim();
        if (value) filters[key] = value;
      });
      perform(() => control.setFilters(filters));
    });
    on(this.nodes.clearFilters, 'click', () => perform(() => control.setFilters({})));
    on(this.nodes.previous, 'click', () => perform(() => control.setPage(Math.max(0, control.state.first - control.state.max))));
    on(this.nodes.next, 'click', () => perform(() => control.setPage(control.state.first + control.state.max)));
    on(this.nodes.pageSize, 'change', () => perform(() => control.setPage(0, Number(this.nodes.pageSize.value))));
    on(this.nodes.retryClinicas, 'click', () => perform(() => control.loadClinicas()));
    on(this.nodes.retryConsultas, 'click', () => perform(() => control.loadConsultas()));
    on(this.nodes.retryDetalle, 'click', () => perform(() => control.selectConsulta(control.state.idConsulta)));
    // El evento compuesto de la tarjeta atraviesa su Shadow DOM y llega a la página.
    on(root, 'consulta-seleccionada', event => perform(() => control.selectConsulta(event.detail && event.detail.idConsulta)));
    on(this.nodes.rows, 'click', event => {
      const button = event.target.closest('button[data-consulta]');
      if (button && this.nodes.rows.contains(button)) perform(() => control.selectConsulta(button.dataset.consulta));
    });
    this._unsubscribe = control.subscribe(state => this.render(state));
    customElements.whenDefined('tarjeta-consulta').then(() => {
      if (!this._closed) this.render(control.state);
    });
  }

  render(state) {
    const n = this.nodes;
    if (this._clinicRows !== state.clinicas) {
      const prompt = document.createElement('option');
      prompt.value = '';
      prompt.textContent = 'Selecciona una clínica';
      n.clinica.replaceChildren(prompt);
      state.clinicas.forEach(clinica => {
        const option = document.createElement('option');
        option.value = clinica.idClinica;
        option.textContent = clinica.nombre ?? 'Clínica sin nombre';
        n.clinica.append(option);
      });
      this._clinicRows = state.clinicas;
    }
    n.clinica.value = state.idClinica || '';
    n.clinica.disabled = state.clinicasStatus !== 'ready' || state.clinicas.length === 0;
    n.clinicStatus.textContent = state.clinicasStatus === 'loading' ? 'Cargando clínicas…' :
      state.clinicasStatus === 'error' ? errorMessage(state.clinicasError) :
      state.clinicasStatus === 'ready' && !state.clinicas.length ? 'No hay clínicas disponibles.' : '';
    n.retryClinicas.hidden = state.clinicasStatus !== 'error';
    n.filtersFieldset.disabled = !state.idClinica;
    if (this._filters !== state.filtros) {
      ['fechaDesde', 'fechaHasta', 'idPersonaRol'].forEach(key => { n[key].value = state.filtros[key] || ''; });
      this._filters = state.filtros;
    }
    const clinic = state.clinicas.find(row => row.idClinica === state.idClinica);
    n.selectedClinic.textContent = clinic ? (clinic.nombre ?? 'Sin nombre') : 'Sin seleccionar';
    n.total.textContent = state.consultasStatus === 'ready' ? String(state.totalDatos) : '—';
    n.visible.textContent = state.consultasStatus === 'ready' ? String(state.consultas.length) : '—';
    n.resultStatus.textContent = state.consultasStatus === 'loading' ? 'Cargando consultas…' :
      state.consultasStatus === 'error' ? errorMessage(state.consultasError) :
      state.consultasStatus === 'idle' ? 'Selecciona una clínica para consultar sus registros.' :
      !state.consultas.length ? (state.totalDatos ? 'No hay consultas en esta página.' : 'No hay consultas para los filtros seleccionados.') : '';
    n.resultStatus.hidden = !n.resultStatus.textContent;
    n.retryConsultas.hidden = state.consultasStatus !== 'error';
    n.results.setAttribute('aria-busy', String(state.consultasStatus === 'loading'));
    const useCards = Boolean(customElements.get('tarjeta-consulta'));
    n.cards.hidden = !useCards || !state.consultas.length;
    n.table.hidden = useCards || !state.consultas.length;
    if (this._consultaRows !== state.consultas || this._usingCards !== useCards) {
      n.rows.replaceChildren();
      n.cards.replaceChildren();
      state.consultas.forEach(consulta => {
        if (useCards) {
          const card = document.createElement('tarjeta-consulta');
          card.consulta = consultaCardModel(consulta);
          n.cards.append(card);
        } else {
          // Lista nativa de esta página; no simula ni registra tarjetas de Rodrigo.
          const row = document.createElement('tr');
          [consulta.personaNombre ?? 'Persona sin nombre', consulta.rolNombre ?? 'Sin especificar', formatDate(consulta.fechaInicio)].forEach(text => {
            const cell = document.createElement('td');
            cell.textContent = text;
            row.append(cell);
          });
          const cell = document.createElement('td');
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'text-button';
          button.dataset.consulta = consulta.idConsulta;
          button.textContent = 'Ver detalle';
          button.setAttribute('aria-label', `Ver detalle de ${consulta.personaNombre ?? 'persona sin nombre'}`);
          cell.append(button);
          row.append(cell);
          n.rows.append(row);
        }
      });
      this._consultaRows = state.consultas;
      this._usingCards = useCards;
    }
    n.rows.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.consulta === state.idConsulta)));
    n.pageSize.value = String(state.max);
    n.pageSize.disabled = !state.idClinica;
    const ready = state.consultasStatus === 'ready';
    n.previous.disabled = !ready || state.first === 0;
    n.next.disabled = !ready || state.first + state.max >= state.totalDatos;
    n.pageInfo.textContent = !ready ? 'Sin resultados cargados' : !state.consultas.length ? `0 de ${state.totalDatos} consultas` :
      `${state.first + 1}–${state.first + state.consultas.length} de ${state.totalDatos} consultas`;
    n.detailStatus.textContent = state.detalleStatus === 'loading' ? 'Cargando detalle…' : state.detalleStatus === 'error' ? errorMessage(state.detalleError) :
      state.detalleStatus === 'idle' ? 'Selecciona una consulta para ver su información.' : '';
    n.detailStatus.hidden = !n.detailStatus.textContent;
    n.detailData.hidden = state.detalleStatus !== 'ready';
    n.retryDetalle.hidden = state.detalleStatus !== 'error';
    n.detail.setAttribute('aria-busy', String(state.detalleStatus === 'loading'));
    if (state.detalleStatus === 'ready') {
      n.detailName.textContent = state.detalle.personaNombre ?? 'Persona sin nombre';
      n.detailData.replaceChildren();
      const fields = [
        ['Rol', state.detalle.rolNombre], ['Clínica', state.detalle.clinicaNombre],
        ['Inicio', formatDate(state.detalle.fechaInicio)], ['Fin', formatDate(state.detalle.fechaFin)],
        ['Identificador de consulta', state.detalle.idConsulta], ['Asignación PersonaRol', state.detalle.idPersonaRol]
      ];
      fields.forEach(([label, value]) => {
        const term = document.createElement('dt'); term.textContent = label;
        const description = document.createElement('dd'); description.textContent = value ?? 'Sin especificar';
        n.detailData.append(term, description);
      });
    } else n.detailName.textContent = 'Detalle de consulta';
  }

  destroy() {
    this._closed = true;
    this._events.abort();
    this._unsubscribe();
    this.control.destroy();
  }
}
