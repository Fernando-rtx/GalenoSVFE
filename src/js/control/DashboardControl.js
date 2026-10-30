import DefaultError from '../entity/DefaultError.js';
import { isUuid, isCalendarDate, orderedDates, restRange } from './rest-validators.js';

const immutableRows = rows => Object.freeze(rows.map(row => Object.freeze({ ...row })));
const emptyRows = () => Object.freeze([]);

/** Estado y coordinación del dashboard. No conoce DOM, tarjetas ni Fetch. */
export default class DashboardControl {
  constructor({ clinicaDAO, consultaDAO, pageSize = 10 }) {
    if (!clinicaDAO || typeof clinicaDAO.findRange !== 'function' || !consultaDAO ||
        typeof consultaDAO.findRange !== 'function' || typeof consultaDAO.findById !== 'function') {
      throw DefaultError.validation('Se requieren ClinicaDAO y ConsultaDAO.', 'INVALID_CONFIG');
    }
    this._validatePage(0, pageSize);
    this.clinicaDAO = clinicaDAO;
    this.consultaDAO = consultaDAO;
    this._listeners = new Set();
    this._requests = {};
    this._disposed = false;
    this.state = Object.freeze({
      clinicas: emptyRows(), clinicasStatus: 'idle', clinicasError: null,
      idClinica: null, filtros: Object.freeze({}), first: 0, max: pageSize,
      consultas: emptyRows(), totalDatos: 0, consultasStatus: 'idle', consultasError: null,
      idConsulta: null, detalle: null, detalleStatus: 'idle', detalleError: null
    });
  }

  subscribe(listener) {
    if (this._disposed) throw DefaultError.validation('Dashboard cerrado.');
    this._listeners.add(listener);
    listener(this.state);
    return () => this._listeners.delete(listener);
  }

  _set(changes) {
    if (this._disposed) return;
    this.state = Object.freeze({ ...this.state, ...changes });
    this._listeners.forEach(listener => listener(this.state));
  }

  _cancel(key) {
    const request = this._requests[key];
    delete this._requests[key];
    if (request) request.abort();
  }

  _begin(key) {
    this._cancel(key);
    if (this._disposed) throw DefaultError.validation('Dashboard cerrado.');
    const request = new AbortController();
    this._requests[key] = request;
    return request;
  }

  _current(key, request) {
    return !this._disposed && this._requests[key] === request && !request.signal.aborted;
  }

  _error(error) {
    return error instanceof DefaultError ? error : DefaultError.processing('No se pudo procesar la operación.', error);
  }

  _validatePage(first, max) {
    if (!Number.isSafeInteger(first) || first < 0 || !Number.isSafeInteger(max) || max < 1 || !restRange(first, max)) {
      throw DefaultError.validation('Paginación inválida.');
    }
  }

  /** Cambio explícito de identidad/transporte, sin sustituir el dashboard ni sus componentes. */
  async connect({ clinicaDAO, consultaDAO }) {
    ['clinicas', 'consultas', 'detalle'].forEach(key => this._cancel(key));
    this.clinicaDAO = clinicaDAO;this.consultaDAO = consultaDAO;
    const previous = { idClinica: this.state.idClinica, first: this.state.first, filtros: this.state.filtros };
    await this.loadClinicas();
    if (this.state.clinicasStatus !== 'ready') {
      await this._loadConsultas({ idClinica: null, first: 0, filtros: Object.freeze({}) });return;
    }
    const available = this.state.clinicas.some(row => row.idClinica === previous.idClinica);
    await this._loadConsultas(available ? previous : { idClinica: null, first: 0, filtros: Object.freeze({}) });
  }

  async loadClinicas() {
    const request = this._begin('clinicas');
    this._set({ clinicasStatus: 'loading', clinicasError: null });
    try {
      const rows = new Map();
      let first = 0;
      let response;
      do {
        response = await this.clinicaDAO.findRange(first, this.state.max, { signal: request.signal });
        if (!this._current('clinicas', request)) return;
        response.datos.forEach(row => rows.set(row.idClinica, row));
        first += response.datos.length;
      } while (response.datos.length > 0 && first < response.totalDatos);
      this._set({ clinicas: immutableRows([...rows.values()]), clinicasStatus: 'ready' });
    } catch (error) {
      if (this._current('clinicas', request)) this._set({ clinicasStatus: 'error', clinicasError: this._error(error) });
    }
  }

  async selectClinica(idClinica) {
    if (idClinica !== null && !this.state.clinicas.some(clinica => clinica.idClinica === idClinica)) {
      throw DefaultError.validation('Selecciona una clínica disponible.');
    }
    return this._loadConsultas({ idClinica, first: 0, filtros: Object.freeze({}) });
  }

  async setFilters(filters) {
    const names = ['fechaDesde', 'fechaHasta', 'idPersonaRol'];
    if (!filters || typeof filters !== 'object' || Array.isArray(filters) ||
        Object.keys(filters).some(key => !names.includes(key)) ||
        ['fechaDesde', 'fechaHasta'].some(key => filters[key] !== undefined && !isCalendarDate(filters[key])) ||
        (filters.idPersonaRol !== undefined && !isUuid(filters.idPersonaRol)) || !orderedDates(filters)) {
      throw DefaultError.validation('Revisa las fechas y el UUID de PersonaRol.', 'INVALID_QUERY');
    }
    const clean = {};
    names.forEach(key => { if (filters[key] !== undefined) clean[key] = filters[key]; });
    return this._loadConsultas({ filtros: Object.freeze(clean), first: 0 });
  }

  async setPage(first, max = this.state.max) {
    this._validatePage(first, max);
    if (!this.state.idClinica) throw DefaultError.validation('Selecciona una clínica.');
    return this._loadConsultas({ first, max });
  }

  loadConsultas() { return this._loadConsultas(); }

  async _loadConsultas(changes = {}) {
    this._cancel('consultas');
    this._cancel('detalle');
    const clinic = changes.idClinica === undefined ? this.state.idClinica : changes.idClinica;
    this._set({ ...changes, consultas: emptyRows(), totalDatos: 0, consultasError: null,
      idConsulta: null, detalle: null, detalleStatus: 'idle', detalleError: null,
      consultasStatus: clinic ? 'loading' : 'idle' });
    if (!this.state.idClinica || this._disposed) return;
    const request = this._begin('consultas');
    const { idClinica, filtros, first, max } = this.state;
    try {
      const response = await this.consultaDAO.findRange(first, max, {
        query: { ...filtros, idClinica }, signal: request.signal
      });
      if (!this._current('consultas', request)) return;
      this._set({ consultas: immutableRows(response.datos), totalDatos: response.totalDatos, consultasStatus: 'ready' });
    } catch (error) {
      if (this._current('consultas', request)) this._set({ consultasStatus: 'error', consultasError: this._error(error) });
    }
  }

  async selectConsulta(idConsulta) {
    if (this.state.consultasStatus !== 'ready' || !this.state.consultas.some(row => row.idConsulta === idConsulta)) {
      throw DefaultError.validation('Selecciona una consulta de la página actual.');
    }
    return this.openConsulta(idConsulta);
  }

  /** Recupera por UUID una consulta recién guardada aunque quede fuera de la página filtrada. */
  async openConsulta(idConsulta) {
    if (!this.state.idClinica || !isUuid(idConsulta)) throw DefaultError.validation('Consulta o clínica inválidas.');
    const request = this._begin('detalle');
    this._set({ idConsulta, detalle: null, detalleStatus: 'loading', detalleError: null });
    try {
      const response = await this.consultaDAO.findById(idConsulta, {
        query: { idClinica: this.state.idClinica }, signal: request.signal
      });
      if (!this._current('detalle', request)) return;
      this._set({ detalle: Object.freeze({ ...response.datos }), detalleStatus: 'ready' });
    } catch (error) {
      if (this._current('detalle', request)) this._set({ detalleStatus: 'error', detalleError: this._error(error) });
    }
  }

  destroy() {
    this._disposed = true;
    ['clinicas', 'consultas', 'detalle'].forEach(key => this._cancel(key));
    this._listeners.clear();
  }
}
