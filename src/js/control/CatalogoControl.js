import DefaultError from '../entity/DefaultError.js';

/** Coordinación de los catálogos; los DAO conservan todo el transporte HTTP. */
export default class CatalogoControl {
  constructor({ daos, contexto, module = 'tipoDocumento', pageSize = 10 }) {
    this.daos = daos;
    this.listeners = new Set();
    this.read = null;
    this.closed = false;
    this.state = Object.freeze({ contexto, module, first: 0, max: pageSize, nombre: '', rows: [], total: 0,
      status: 'idle', writing: false, selected: null, editor: null, error: null, message: '' });
  }
  subscribe(listener) { this.listeners.add(listener); listener(this.state); return () => this.listeners.delete(listener); }
  set(changes) {
    if (this.closed) return;
    this.state = Object.freeze({ ...this.state, ...changes });
    this.listeners.forEach(listener => listener(this.state));
  }
  async open(module) {
    if (this.state.writing) throw DefaultError.validation('Espera a que termine el guardado.');
    if (!Object.hasOwn(this.daos, module)) throw DefaultError.validation('Módulo no disponible.');
    this.set({ module, first: 0, nombre: '', selected: null, editor: null, message: '' });
    await this.load();
  }
  async load(changes = {}) {
    if (this.state.writing) return;
    this.read?.abort();
    const request = new AbortController(); this.read = request;
    this.set({ ...changes, status: 'loading', error: null });
    const { module, first, max, nombre } = this.state;
    try {
      const result = await this.daos[module].findRange(first, max, { signal: request.signal, query: nombre ? { nombre } : {} });
      if (this.closed || this.read !== request || request.signal.aborted) return;
      this.set({ rows: result.datos, total: result.totalDatos, status: 'ready' });
    } catch (error) {
      if (this.read === request && !request.signal.aborted) this.set({ error, status: 'error' });
    }
  }
  async edit(id) {
    if (this.state.writing) return;
    this.read?.abort();
    const request = new AbortController();this.read = request;
    try {
      const result = await this.daos[this.state.module].findById(id, { signal: request.signal });
      if (this.read === request && !request.signal.aborted) this.set({ selected: result.datos, editor: 'edit', error: null });
    } catch (error) {
      if (this.read === request && !request.signal.aborted) this.set({ error });
    }
  }
  create() {
    if (!this.state.contexto.puedeEscribir || this.state.writing) return;
    this.set({ selected: null, editor: 'create', error: null });
  }
  cancel() { if (!this.state.writing) this.set({ selected: null, editor: null, error: null }); }
  async save(data) {
    if (!this.state.contexto.puedeEscribir) throw DefaultError.validation('La sesión solo permite lectura.');
    if (this.state.writing || !this.state.editor) return;
    const { module, editor, selected } = this.state;
    const dao = this.daos[module];
    const idField = 'id' + module[0].toUpperCase() + module.slice(1);
    this.set({ writing: true, error: null, message: '' });
    try {
      if (editor === 'create') await dao.create(data);
      else await dao.update(selected[idField], data);
      this.set({ writing: false, editor: null, selected: null, message: 'Cambios guardados en PostgreSQL.' });
      await this.load({ first: 0 });
    } catch (error) { this.set({ writing: false, error }); }
  }
  async remove() {
    const { module, selected } = this.state;
    if (!selected || this.state.writing || !this.state.contexto.puedeEscribir) return;
    const idField = 'id' + module[0].toUpperCase() + module.slice(1);
    this.set({ writing: true, error: null });
    try {
      await this.daos[module].deleteById(selected[idField]);
      this.set({ writing: false, editor: null, selected: null, message: 'Registro eliminado.' });
      await this.load({ first: 0 });
    } catch (error) { this.set({ writing: false, error }); }
  }
  destroy() { this.closed = true; this.read?.abort(); this.listeners.clear(); }
}
