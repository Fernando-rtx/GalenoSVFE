// Punto compartido para HU3/HU4. Estado efímero; no exporta tokens al DOM.
let control;
export function conectarEmpleado(value) {
  control = value;
}
export function obtenerContextoEmpleado() {
  return control?.session ? structuredClone(control.session.contexto) : null;
}
export async function actualizarContextoEmpleado(signal) {
  if (!control?.session) throw new Error('Identifica al empleado primero.');
  await control.actualizar(signal);
  return obtenerContextoEmpleado();
}
export async function solicitudEmpleado(path, idPersonaRol, options = {}) {
  const session = control?.session;
  const asignacion = session?.contexto.asignaciones.find((a) => a.idPersonaRol === idPersonaRol);
  if (!asignacion) throw new Error('Selecciona una asignación del empleado identificado.');
  return control.http.request(path, { ...options, token: session.token, asignacion: idPersonaRol });
}
