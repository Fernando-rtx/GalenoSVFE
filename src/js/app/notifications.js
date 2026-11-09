export const NOTIFICATION_EVENT = 'galenos:notificacion';

export function notify(target, tipo, mensaje) {
  if (!target || typeof target.dispatchEvent !== 'function') return;
  target.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, {
    detail: { tipo, mensaje }, bubbles: true, composed: true
  }));
}
