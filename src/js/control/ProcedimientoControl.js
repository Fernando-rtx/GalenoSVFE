/** Plantillas de procedimiento: pasos, rol y exámenes mediante los Service existentes. */
export default class ProcedimientoControl {
  constructor({ pasoService, rolService, examenService, contexto }) {
    Object.assign(this, { pasoService, rolService, examenService, contexto });
    this.listeners = new Set();
    this.request = null;
    this.closed = false;
    this.state = {
      parent: null,
      rows: [],
      total: 0,
      first: 0,
      roles: [],
      examenes: [],
      origins: [],
      editor: null,
      writing: false,
      error: null,
      message: '',
    };
  }
  subscribe(fn) {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }
  set(change) {
    if (this.closed) return;
    this.state = Object.freeze({ ...this.state, ...change });
    this.listeners.forEach((fn) => fn(this.state));
  }
  async open(parent) {
    if (this.state.writing) return;
    this.set({ parent, rows: [], total: 0, first: 0, editor: null, error: null });
    await this.load();
  }
  async load(first = this.state.first) {
    if (!this.state.parent || this.state.writing) return;
    this.request?.abort();
    const request = new AbortController();
    this.request = request;
    try {
      const r = await this.pasoService.findRange(first, 10, {
        signal: request.signal,
        query: { idProcedimiento: this.state.parent.idProcedimiento },
      });
      if (!request.signal.aborted) this.set({ rows: r.datos, total: r.totalDatos, first });
    } catch (error) {
      if (!request.signal.aborted) this.set({ error });
    }
  }
  async edit(data = null) {
    if (this.state.writing || !this.contexto.puedeEscribir) return;
    this.set({ editor: { data }, roles: [], examenes: [], origins: [], error: null });
    this.request?.abort();
    const request = new AbortController();
    this.request = request;
    const all = async (service, query = {}) => {
      const rows = [];
      let page,
        first = 0;
      do {
        page = await service.findRange(first, 20, { signal: request.signal, query });
        rows.push(...page.datos);
        first += page.datos.length;
      } while (page.datos.length && first < page.totalDatos);
      return rows;
    };
    try {
      const [roles, examenes, origins] = await Promise.all([
        all(this.rolService),
        all(this.examenService),
        all(this.pasoService, { idProcedimiento: this.state.parent.idProcedimiento }),
      ]);
      if (!request.signal.aborted) this.set({ roles, examenes, origins });
    } catch (error) {
      if (!request.signal.aborted) this.set({ error });
    }
  }
  cancel() {
    if (!this.state.writing) {
      this.request?.abort();
      this.set({ editor: null, error: null });
    }
  }
  async save(data) {
    if (this.state.writing || !this.state.editor || !this.contexto.puedeEscribir) return;
    const selected = this.state.editor.data;
    this.set({ writing: true, error: null });
    try {
      if (selected) await this.pasoService.update(selected.idProcedimientoPaso, data);
      else
        await this.pasoService.create({
          ...data,
          idProcedimiento: this.state.parent.idProcedimiento,
        });
      this.set({ writing: false, editor: null, message: 'Paso guardado en PostgreSQL.' });
      await this.load(0);
    } catch (error) {
      this.set({ writing: false, error });
    }
  }
  async remove(row) {
    if (this.state.writing || !this.contexto.puedeEscribir) return;
    this.set({ writing: true, error: null });
    try {
      await this.pasoService.deleteById(row.idProcedimientoPaso);
      this.set({ writing: false, message: 'Paso terminal eliminado.' });
      await this.load(0);
    } catch (error) {
      this.set({ writing: false, error });
    }
  }
  destroy() {
    this.closed = true;
    this.request?.abort();
    this.listeners.clear();
  }
}
