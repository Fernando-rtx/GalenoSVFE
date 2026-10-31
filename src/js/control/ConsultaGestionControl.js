import DefaultError from '../entity/DefaultError.js';

/** Escrituras y relaciones de la consulta seleccionada en el dashboard existente. */
export default class ConsultaGestionControl {
  constructor({ dashboard, consultaDAO, asociacionDAO, pasoDAO, pacienteDAO, procedimientoDAO, contexto }) {
    Object.assign(this, { dashboard, consultaDAO, asociacionDAO, pasoDAO, pacienteDAO, procedimientoDAO, contexto });
    this.listeners = new Set();this.requests = {};this.closed = false;
    this.state = { clinic: null, consulta: null, editor: null, selected: null, writing: false, error: null, message: '',
      pacientes: [], procedimientos: [], asociaciones: [], pasos: [], firstAsociaciones: 0, totalAsociaciones: 0, firstPasos: 0, totalPasos: 0 };
    this.unsubscribe = dashboard.subscribe(state => {
      if (state.idClinica !== this.state.clinic) {
        this.cancelReads();this.set({ clinic: state.idClinica, consulta: null, editor: null, pacientes: [], asociaciones: [], pasos: [], error: null });
      }
      if (state.detalle?.idConsulta !== this.state.consulta?.idConsulta) {
        this.set({ consulta: state.detalle, asociaciones: [], pasos: [], firstAsociaciones: 0, firstPasos: 0 });
        if (state.detalle) this.loadChildren();
      } else if (state.detalle && state.detalle !== this.state.consulta) this.set({ consulta: state.detalle });
    });
  }
  subscribe(listener) { this.listeners.add(listener);listener(this.state);return () => this.listeners.delete(listener); }
  set(changes) { if (this.closed) return;this.state = Object.freeze({ ...this.state, ...changes });this.listeners.forEach(fn => fn(this.state)); }
  cancelReads() { Object.values(this.requests).forEach(request => request.abort());this.requests = {}; }
  async read(key, action, success) {
    this.requests[key]?.abort();const request = new AbortController();this.requests[key] = request;
    try { const result = await action(request.signal);if (!this.closed && this.requests[key] === request && !request.signal.aborted) success(result); }
    catch (error) { if (!request.signal.aborted && !this.closed) this.set({ error }); }
  }
  async searchPatients(buscar) {
    if (!this.state.clinic || !buscar.trim()) { this.set({ pacientes: [] });return; }
    const clinic = this.state.clinic;
    await this.read('pacientes', signal => this.pacienteDAO.get({ signal, query: { idClinica: clinic, buscar } }), result => this.set({ pacientes: result.datos }));
  }
  async editConsulta(create = false) {
    if (this.state.writing || !this.contexto.puedeEscribir) return;
    if (!this.state.clinic) { this.set({ error: DefaultError.validation('Selecciona una clínica autorizada.') });return; }
    this.set({ editor: 'consulta', selected: create ? null : this.state.consulta, error: null, message: '', pacientes: [] });
  }
  async newProcedure() {
    if (!this.state.consulta || this.state.writing || !this.contexto.puedeEscribir) return;
    this.set({ editor: 'procedimiento', selected: null, error: null, message: '', procedimientos: [], firstProcedimientos: 0, totalProcedimientos: 0 });
    await this.loadProcedures(0);
  }
  async loadProcedures(first) {
    await this.read('catalogo', signal => this.procedimientoDAO.findRange(first, 20, { signal, query: { activo: true } }), result => this.set({ procedimientos: result.datos, firstProcedimientos: first, totalProcedimientos: result.totalDatos }));
  }
  editProcedure(row) { if (!this.state.writing && this.contexto.puedeEscribir) this.set({ editor: 'procedimiento', selected: row, error: null, message: '' }); }
  editStep(row) { if (!this.state.writing && this.contexto.puedeEscribir) this.set({ editor: 'paso', selected: row, error: null, message: '' }); }
  cancel() { if (!this.state.writing) { this.requests.pacientes?.abort();this.requests.catalogo?.abort();this.set({ editor: null, error: null }); } }
  async loadChildren(changes = {}) {
    const { consulta, clinic } = this.state;if (!consulta) return;
    this.set(changes);
    const query = { idClinica: clinic, idConsulta: consulta.idConsulta };
    await Promise.all([
      this.read('asociaciones', signal => this.asociacionDAO.findRange(this.state.firstAsociaciones, 10, { signal, query }), r => this.set({ asociaciones: r.datos, totalAsociaciones: r.totalDatos })),
      this.read('pasos', signal => this.pasoDAO.findRange(this.state.firstPasos, 10, { signal, query }), r => this.set({ pasos: r.datos, totalPasos: r.totalDatos }))
    ]);
  }
  async save(data) {
    if (this.state.writing || !this.state.editor || !this.contexto.puedeEscribir) return;
    const { editor, selected, clinic, consulta } = this.state;const options = { query: { idClinica: clinic } };
    this.set({ writing: true, error: null, message: '' });
    try {
      let saved;
      if (editor === 'consulta') saved = selected ? await this.consultaDAO.update(selected.idConsulta, data, options) : await this.consultaDAO.create(data, options);
      if (editor === 'procedimiento') saved = selected ? await this.asociacionDAO.update(selected.idConsultaProcedimiento, data, options) : await this.asociacionDAO.create({ ...data, idConsulta: consulta.idConsulta }, options);
      if (editor === 'paso') saved = await this.pasoDAO.update(selected.idConsultaProcedimientoPaso, data, options);
      this.set({ writing: false, editor: null, message: 'Cambios guardados en PostgreSQL.' });
      if (clinic !== this.state.clinic) return;
      if (editor === 'consulta') {
        const id = saved.datos.idConsulta;
        await this.dashboard.loadConsultas();
        await this.dashboard.openConsulta(id);
      } else await this.loadChildren();
    } catch (error) { this.set({ writing: false, error }); }
  }
  destroy() { this.closed = true;this.unsubscribe();this.cancelReads();this.listeners.clear(); }
}
