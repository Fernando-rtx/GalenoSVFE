/** Órdenes y resultados anidados en un paso de la consulta del dashboard. */
export default class OrdenControl {
  constructor({ ordenService, resultadoService, dashboard }) {
    Object.assign(this, { ordenService, resultadoService });
    this.listeners = new Set();
    this.request = null;
    this.closed = false;
    this.state = {
      clinic: null,
      paso: null,
      orden: null,
      rows: [],
      total: 0,
      first: 0,
      editor: null,
      writing: false,
      error: null,
      message: '',
    };
    this.unsubscribe = dashboard.subscribe((s) => {
      if (s.idClinica !== this.state.clinic || s.idConsulta !== this.consulta) {
        this.request?.abort();
        this.consulta = s.idConsulta;
        this.set({ clinic: s.idClinica, paso: null, orden: null, rows: [], editor: null });
      }
    });
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
  async open(paso) {
    if (this.state.writing) return;
    this.set({ paso, orden: null, rows: [], total: 0, first: 0, editor: null, error: null });
    await this.load();
  }
  async results(orden) {
    if (this.state.writing) return;
    this.set({ orden, rows: [], total: 0, first: 0, editor: null, error: null });
    await this.load();
  }
  async back() {
    if (this.state.writing) return;
    this.set({ orden: null, rows: [], total: 0, first: 0, editor: null, error: null });
    await this.load();
  }
  async load(first = this.state.first) {
    if (!this.state.paso || this.state.writing) return;
    this.request?.abort();
    const request = new AbortController();
    this.request = request;
    const { clinic, paso, orden } = this.state;
    this.set({ first, error: null });
    const service = orden ? this.resultadoService : this.ordenService;
    try {
      const r = await service.findRange(first, 10, {
        signal: request.signal,
        query: {
          idClinica: clinic,
          ...(orden
            ? { idOrden: orden.idOrdenExamen }
            : { idPaso: paso.idConsultaProcedimientoPaso }),
        },
      });
      if (this.request === request && !request.signal.aborted)
        this.set({ rows: r.datos, total: r.totalDatos });
    } catch (error) {
      if (!request.signal.aborted) this.set({ error });
    }
  }
  edit(data = null) {
    if (!this.state.writing)
      this.set({ editor: { data }, error: null, message: '' });
  }
  cancel() {
    if (!this.state.writing) this.set({ editor: null, error: null });
  }
  async save(data) {
    if (this.state.writing || !this.state.editor) return;
    const { clinic, paso, orden, editor } = this.state;
    const service = orden ? this.resultadoService : this.ordenService;
    const parent = orden
      ? { idOrdenExamen: orden.idOrdenExamen }
      : { idConsultaProcedimientoPaso: paso.idConsultaProcedimientoPaso };
    const idKey = orden ? 'idExamenResultado' : 'idOrdenExamen';
    this.set({ writing: true, error: null });
    try {
      if (editor.data)
        await service.update(
          editor.data[idKey],
          { ...data, ...parent },
          { query: { idClinica: clinic } },
        );
      else await service.create({ ...data, ...parent }, { query: { idClinica: clinic } });
      this.set({ writing: false, editor: null, message: 'Cambios guardados en PostgreSQL.' });
      if (clinic === this.state.clinic) await this.load(0);
    } catch (error) {
      this.set({ writing: false, error });
    }
  }
  destroy() {
    this.closed = true;
    this.unsubscribe();
    this.request?.abort();
    this.listeners.clear();
  }
}
