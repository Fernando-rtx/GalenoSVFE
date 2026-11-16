export const NOTIFICATION_EVENT = 'galenos:notificacion';

export function notify(target, tipo, mensaje, options = {}) {
  if (typeof mensaje !== 'string' || !mensaje.trim()) return;
  if (!target || typeof target.dispatchEvent !== 'function') return;
  target.dispatchEvent(
    new CustomEvent(NOTIFICATION_EVENT, {
      detail: { tipo, mensaje, id: options.id },
      bubbles: true,
      composed: true,
    }),
  );
}

// Clasificación segura: nunca se publica el cuerpo clínico de una respuesta REST.
export function notifyFailure(target, error, options = {}) {
  if (error?.name === 'AbortError' || error?.code === 'ABORTED') return;
  const messages = {
    401: 'La sesión venció. Identifícate para continuar.',
    403: 'No tienes permiso para realizar esta operación con la asignación actual.',
    409: 'La operación entra en conflicto con el estado actual. Actualiza el paso antes de continuar.',
  };
  const warning = messages[error?.status];
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  notify(target, warning || offline ? 'advertencia' : 'error', warning || (offline
    ? 'Sin conexión. No se pueden guardar cambios. El texto permanece en el formulario.'
    : 'No se pudo completar la operación. Revisa la conexión y los datos e intenta nuevamente.'), options);
}

export function dismissNotification(target, id) {
  notify(target, 'cerrar', 'Cerrar aviso', { id });
}
