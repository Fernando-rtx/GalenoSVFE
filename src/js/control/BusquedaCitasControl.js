import DefaultError from '../entity/DefaultError.js';
export function validarRango(desde, hasta) {
  const valid = (v) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(`${v}T00:00:00Z`)) &&
    new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
  if (!valid(desde) || !valid(hasta) || desde > hasta)
    throw DefaultError.validation('Ingresa un rango de fechas válido.');
}
export class BusquedaCitasControl {
  constructor(identificacion, citas) {
    this.identificacion = identificacion;
    this.citas = citas;
  }
  async buscar(clinica, desde, hasta, first, signal) {
    validarRango(desde, hasta);
    const session = this.identificacion.session;
    if (!session || !session.contexto.asignaciones.some((a) => a.idClinica === clinica))
      throw DefaultError.validation('Selecciona una clínica donde estés registrado.');
    return this.citas.buscar(
      session.token,
      { idClinica: clinica, fechaDesde: desde, fechaHasta: hasta, first, max: 20 },
      signal,
    );
  }
  ticket(id, signal) {
    if (!this.identificacion.session) throw DefaultError.validation('Identifícate primero.');
    return this.citas.ticket(this.identificacion.session.token, id, signal);
  }
}
