import DefaultError from '../entity/DefaultError.js';
import { isCalendarDate } from './rest-validators.js';

export function fechaClinica(now = new Date(), zone = 'America/El_Salvador') {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function rangoPeriodo(period, now = new Date(), zone) {
  const today = fechaClinica(now, zone);
  if (period === 'today') return { fechaDesde: today, fechaHasta: today };
  const day = new Date(`${today}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + (period === 'past' ? -1 : 1));
  const adjacent = day.toISOString().slice(0, 10);
  return period === 'past'
    ? { fechaDesde: '', fechaHasta: adjacent }
    : { fechaDesde: adjacent, fechaHasta: '' };
}

/** Coordina lecturas independientes y descarta respuestas anteriores por ámbito. */
export default class AcademicCareControl {
  constructor() {
    this.requests = new Map();
    this.queue = [];
    this.selected = null;
  }
  prepararBandeja(session, assignmentId, filters) {
    if (!session || session.contexto.tipo !== 'EMPLEADO')
      throw new DefaultError({
        type: 'http',
        code: 'SESSION_REQUIRED',
        status: 401,
        message: 'Identifícate para continuar.',
      });
    const assignment = session.contexto.asignaciones.find((a) => a.idPersonaRol === assignmentId);
    if (!assignment) throw DefaultError.validation('Selecciona una asignación disponible.');
    if (
      Object.keys(filters).some(
        (key) => !['fechaDesde', 'fechaHasta', 'idTipoDocumento', 'numero'].includes(key),
      )
    )
      throw DefaultError.validation('Filtro de consulta no permitido.');
    for (const date of [filters.fechaDesde, filters.fechaHasta])
      if (date && !isCalendarDate(date)) throw DefaultError.validation('Ingresa una fecha válida.');
    if (filters.fechaDesde && filters.fechaHasta && filters.fechaDesde > filters.fechaHasta)
      throw DefaultError.validation('La fecha inicial debe ser anterior a la fecha final.');
    if (Boolean(filters.idTipoDocumento) !== Boolean(filters.numero?.trim()))
      throw DefaultError.validation(
        'Selecciona tipo y número de documento para filtrar por paciente.',
      );
    return {
      query: {
        idPersona: session.contexto.idPersona,
        idClinica: assignment.idClinica,
        idRol: assignment.idRol,
        ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
      },
      options: {
        headers: {
          Authorization: `Bearer ${session.token}`,
          'X-Persona-Rol': assignment.idPersonaRol,
        },
      },
    };
  }
  seleccionarConsulta(id) {
    const row = this.queue.find((item) => item.idConsulta === id);
    if (!row) throw DefaultError.validation('Selecciona una consulta de la bandeja actual.');
    this.selected = row;
    return row;
  }
  prepararAtencion(session, assignmentId, care, values) {
    const { query, options } = this.prepararBandeja(session, assignmentId, {});
    if (!care || care.idConsulta !== this.selected?.idConsulta)
      throw DefaultError.validation('Abre una consulta de la bandeja antes de registrar atención.');
    const valor = typeof values.valor === 'string' ? values.valor.trim() : '';
    if (!valor || valor.length > 10000)
      throw DefaultError.validation('Registra la atención: entre 1 y 10000 caracteres.');
    const accion = values.accion;
    if (!['GUARDAR_PARCIAL', 'AVANZAR', 'RETROCEDER', 'FINALIZAR'].includes(accion))
      throw DefaultError.validation('Selecciona una acción disponible.');
    const examenes = values.examenes || [];
    if (new Set(examenes).size !== examenes.length
      || examenes.some((id) => !care.examenes.some((exam) => exam.idExamen === id)))
      throw DefaultError.validation('Selecciona únicamente los exámenes permitidos para este paso.');
    const data = { ...query, idConsulta: care.idConsulta,
      idConsultaProcedimientoPaso: care.idConsultaProcedimientoPaso, accion, valor, examenes };
    if (accion === 'AVANZAR') {
      if (!care.siguientes.some((step) => step.idPaso === values.idPasoSiguiente))
        throw DefaultError.validation('Selecciona un siguiente paso permitido.');
      data.idPasoSiguiente = values.idPasoSiguiente;
    }
    if (accion === 'FINALIZAR' && !care.pasoFinal)
      throw DefaultError.validation('Este paso no permite finalizar el procedimiento.');
    if (accion === 'RETROCEDER') {
      if (!care.puedeRetroceder) throw DefaultError.validation('No hay un paso anterior permitido.');
      const previous = care.anteriores;
      if (previous) {
        const selected = values.idConsultaProcedimientoPasoAnterior
          ? previous.find((s) => s.idConsultaProcedimientoPaso === values.idConsultaProcedimientoPasoAnterior)
          : (previous.length === 1 ? previous[0] : null);
        if (!selected) throw DefaultError.validation('Selecciona el paso anterior al que deseas regresar.');
        data.idConsultaProcedimientoPasoAnterior = selected.idConsultaProcedimientoPaso;
      }
    }
    return { data, options };
  }
  async read(scope, work) {
    this.requests.get(scope)?.abort();
    const controller = new AbortController();
    this.requests.set(scope, controller);
    try {
      const response = await work({ signal: controller.signal });
      if (controller.signal.aborted || this.requests.get(scope) !== controller) return null;
      return response;
    } catch (error) {
      if (controller.signal.aborted || error.name === 'AbortError' || error.code === 'CANCELLED')
        return null;
      throw error;
    } finally {
      if (this.requests.get(scope) === controller) this.requests.delete(scope);
    }
  }
  cancel(scope) {
    if (scope !== undefined) {
      this.requests.get(scope)?.abort();
      this.requests.delete(scope);
      return;
    }
    for (const request of this.requests.values()) request.abort();
    this.requests.clear();
  }
}
