import DefaultError from '../entity/DefaultError.js';
import { obtenerAsignacionEmpleado, obtenerSesionEmpleado } from './contexto-empleado.js';

const normalizarRol = (value) => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

/** Escrituras y relaciones de la consulta seleccionada en el dashboard existente. */
export default class ConsultaGestionControl {
  constructor({
    dashboard,
    consultaService,
    asociacionService,
    pasoService,
    pacienteService,
    atencionPacienteService,
    atencionCitaService,
    tipoDocumentoService,
    procedimientoService,
  }) {
    Object.assign(this, {
      dashboard,
      consultaService,
      asociacionService,
      pasoService,
      pacienteService,
      atencionPacienteService,
      atencionCitaService,
      tipoDocumentoService,
      procedimientoService,
    });
    this.listeners = new Set();
    this.requests = {};
    this.closed = false;
    this.state = {
      clinic: null,
      consulta: null,
      editor: null,
      selected: null,
      writing: false,
      error: null,
      message: '',
      pacientes: [],
      busquedaRealizada: false,
      tiposDocumento: [],
      procedimientos: [],
      asociaciones: [],
      pasos: [],
      firstAsociaciones: 0,
      totalAsociaciones: 0,
      firstPasos: 0,
      totalPasos: 0,
    };
    this.unsubscribe = dashboard.subscribe((state) => {
      if (state.idClinica !== this.state.clinic) {
        this.cancelReads();
        this.set({
          clinic: state.idClinica,
          consulta: null,
          editor: null,
          pacientes: [],
          asociaciones: [],
          pasos: [],
          error: null,
        });
      }
      if (state.detalle?.idConsulta !== this.state.consulta?.idConsulta) {
        this.set({
          consulta: state.detalle,
          asociaciones: [],
          pasos: [],
          firstAsociaciones: 0,
          firstPasos: 0,
        });
        if (state.detalle) this.loadChildren();
      } else if (state.detalle && state.detalle !== this.state.consulta)
        this.set({ consulta: state.detalle });
    });
  }
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }
  set(changes) {
    if (this.closed) return;
    this.state = Object.freeze({ ...this.state, ...changes });
    this.listeners.forEach((fn) => fn(this.state));
  }
  cancelReads() {
    Object.values(this.requests).forEach((request) => request.abort());
    this.requests = {};
  }
  employeeOptions(clinic = this.state.clinic, extra = {}) {
    const assignment = obtenerAsignacionEmpleado();
    const session = obtenerSesionEmpleado();
    if (!session?.token || !assignment || assignment.idClinica !== clinic)
      throw DefaultError.validation('Selecciona una clínica de tu sesión de empleado.');
    return { ...extra, headers: { ...(extra.headers || {}), Authorization: `Bearer ${session.token}`, 'X-Persona-Rol': assignment.idPersonaRol } };
  }
  async read(key, action, success) {
    this.requests[key]?.abort();
    const request = new AbortController();
    this.requests[key] = request;
    try {
      const result = await action(request.signal);
      if (!this.closed && this.requests[key] === request && !request.signal.aborted)
        success(result);
    } catch (error) {
      if (!request.signal.aborted && !this.closed) this.set({ error });
    }
  }
  async searchPatients(buscar) {
    if (!this.state.clinic || !buscar.trim()) {
      this.set({ pacientes: [], busquedaRealizada: false });
      return;
    }
    const clinic = this.state.clinic;
    await this.read(
      'pacientes',
      (signal) => this.pacienteService.get(this.employeeOptions(clinic, { signal, query: { idClinica: clinic, buscar } })),
      (result) => this.set({ pacientes: result.datos, busquedaRealizada: true }),
    );
  }
  async openConsulta(idConsulta) {
    if (this.state.writing) return;
    await this.dashboard.selectConsulta(idConsulta);
    if (!this.closed && this.state.consulta?.idConsulta === idConsulta) this.editConsulta(false);
  }
  async editConsulta(create = false) {
    if (this.state.writing) return;
    if (!this.state.clinic) {
      this.set({ error: DefaultError.validation('Selecciona una clínica autorizada.') });
      return;
    }
    if (create && normalizarRol(obtenerAsignacionEmpleado()?.rolNombre) !== 'atencion al publico') {
      this.set({ error: DefaultError.validation('Solo Atención al público puede asignar citas.') });
      return;
    }
    this.set({
      editor: 'consulta',
      selected: create ? null : this.state.consulta,
      error: null,
      message: '',
      pacientes: [],
    });
    if (create) await Promise.all([this.loadPatientDocumentTypes(), this.loadProcedures(0)]);
  }
  async editPatient() {
    if (this.state.writing) return;
    if (!this.state.clinic || normalizarRol(obtenerAsignacionEmpleado()?.rolNombre) !== 'atencion al publico') {
      this.set({ error: DefaultError.validation('El registro de pacientes está disponible para Atención al público en una clínica seleccionada.') });
      return;
    }
    this.set({ editor: 'paciente', selected: null, error: null, message: '' });
    await this.loadPatientDocumentTypes();
  }
  async loadPatientDocumentTypes() {
    if (!this.tipoDocumentoService) return;
    await this.read('tiposDocumento', (signal) => this.tipoDocumentoService.findRange(0, 100, { signal }),
      (result) => this.set({ tiposDocumento: result.datos.filter((row) => row.activo) }));
  }
  async registerPatient(data, { closeEditor = false } = {}) {
    if (this.state.writing || !this.state.clinic) return;
    const assignment = obtenerAsignacionEmpleado();
    const session = obtenerSesionEmpleado();
    if (normalizarRol(assignment?.rolNombre) !== 'atencion al publico' || !session?.token || assignment.idClinica !== this.state.clinic) {
      this.set({ error: DefaultError.validation('Esta acción requiere una sesión activa de Atención al público en la clínica seleccionada.') });
      return;
    }
    this.set({ writing: true, error: null, message: '' });
    try {
      const result = await this.atencionPacienteService.create(data, {
        query: { idClinica: this.state.clinic },
        headers: { Authorization: `Bearer ${session.token}`, 'X-Persona-Rol': assignment.idPersonaRol },
      });
      this.set({ writing: false, editor: closeEditor ? null : this.state.editor,
        pacientes: [...this.state.pacientes, result.datos],
        message: closeEditor
          ? 'Paciente registrado. Para asignarle una cita, elige Nueva consulta y búscalo por nombre o documento.'
          : 'Paciente registrado. Ya puedes seleccionarlo para asignar su cita.' });
    } catch (error) {
      this.set({ writing: false, error });
    }
  }
  async newProcedure() {
    if (!this.state.consulta || this.state.writing) return;
    if (normalizarRol(obtenerAsignacionEmpleado()?.rolNombre) !== 'atencion al publico') {
      this.set({ error: DefaultError.validation('Solo Atención al público puede asociar el procedimiento inicial.') });
      return;
    }
    this.set({
      editor: 'procedimiento',
      selected: null,
      error: null,
      message: '',
      procedimientos: [],
      firstProcedimientos: 0,
      totalProcedimientos: 0,
    });
    await this.loadProcedures(0);
  }
  async loadProcedures(first) {
    await this.read(
      'catalogo',
      (signal) =>
        this.procedimientoService.findRange(first, 20, this.employeeOptions(this.state.clinic, { signal, query: { idClinica: this.state.clinic, activo: true } })),
      (result) =>
        this.set({
          procedimientos: result.datos,
          firstProcedimientos: first,
          totalProcedimientos: result.totalDatos,
        }),
    );
  }
  editProcedure(row) {
    if (!this.state.writing && normalizarRol(obtenerAsignacionEmpleado()?.rolNombre) === 'atencion al publico')
      this.set({ editor: 'procedimiento', selected: row, error: null, message: '' });
  }
  editStep(row) {
    if (!this.state.writing)
      this.set({ editor: 'paso', selected: row, error: null, message: '' });
  }
  async transitionStep(row, estado) {
    if (
      this.state.writing ||
      !this.state.clinic ||
      !this.state.consulta
    )
      return;
    if (
      !(
        (row.estado === 'PENDIENTE' && estado === 'EN_CURSO') ||
        (row.estado === 'EN_CURSO' && estado === 'COMPLETADO')
      )
    )
      return;
    const clinic = this.state.clinic;
    this.set({ writing: true, error: null, message: '' });
    try {
      await this.pasoService.update(
        row.idConsultaProcedimientoPaso,
        {
          idConsultaProcedimiento: row.idConsultaProcedimiento,
          idPersonaRol: row.idPersonaRol,
          fechaInicio: row.fechaInicio,
          fechaFin: estado === 'COMPLETADO' ? new Date().toISOString() : null,
          estado,
        },
        this.employeeOptions(clinic, { query: { idClinica: clinic } }),
      );
      this.set({
        writing: false,
        message: estado === 'EN_CURSO' ? 'Actividad iniciada.' : 'Actividad completada.',
      });
      if (clinic === this.state.clinic) await this.loadChildren();
    } catch (error) {
      this.set({ writing: false, error });
      if (error.status === 409 && clinic === this.state.clinic) {
        await this.loadChildren();
        this.set({ error });
      }
    }
  }
  cancel() {
    if (!this.state.writing) {
      this.requests.pacientes?.abort();
      this.requests.catalogo?.abort();
      this.set({ editor: null, error: null });
    }
  }
  async loadChildren(changes = {}) {
    const { consulta, clinic } = this.state;
    if (!consulta) return;
    this.set(changes);
    const query = { idClinica: clinic, idConsulta: consulta.idConsulta };
    const options = this.employeeOptions(clinic, { query });
    await Promise.all([
      this.read(
        'asociaciones',
        (signal) =>
          this.asociacionService.findRange(this.state.firstAsociaciones, 10, { ...options, signal }),
        (r) => this.set({ asociaciones: r.datos, totalAsociaciones: r.totalDatos }),
      ),
      this.read(
        'pasos',
        (signal) => this.pasoService.findRange(this.state.firstPasos, 10, { ...options, signal }),
        (r) => this.set({ pasos: r.datos, totalPasos: r.totalDatos }),
      ),
    ]);
  }
  async save(data) {
    if (this.state.writing || !this.state.editor) return;
    const { editor, selected, clinic, consulta } = this.state;
    if (editor === 'paciente') return this.registerPatient(data, { closeEditor: true });
    this.set({ writing: true, error: null, message: '' });
    try {
      const options = this.employeeOptions(clinic, { query: { idClinica: clinic } });
      const nuevaCita = editor === 'consulta' && !selected;
      let saved;
      if (editor === 'consulta')
        saved = selected
          ? await this.consultaService.update(selected.idConsulta, data, options)
          : await this.atencionCitaService.create(data, options);
      if (editor === 'procedimiento')
        saved = selected
          ? await this.asociacionService.update(selected.idConsultaProcedimiento, data, options)
          : await this.asociacionService.create(
              { ...data, idConsulta: consulta.idConsulta },
              options,
            );
      if (editor === 'paso')
        saved = await this.pasoService.update(selected.idConsultaProcedimientoPaso, data, options);
      this.set({ writing: false, editor: null, message: nuevaCita
        ? 'Cita creada con su procedimiento. Registra el resultado de recepción y avanza al siguiente paso.'
        : 'Cambios guardados en PostgreSQL.' });
      if (clinic !== this.state.clinic) return;
      if (editor === 'consulta') {
        const id = saved.datos.idConsulta;
        await this.dashboard.loadConsultas();
        await this.dashboard.openConsulta(id);
      } else await this.loadChildren();
    } catch (error) {
      this.set({ writing: false, error });
    }
  }
  destroy() {
    this.closed = true;
    this.unsubscribe();
    this.cancelReads();
    this.listeners.clear();
  }
}
