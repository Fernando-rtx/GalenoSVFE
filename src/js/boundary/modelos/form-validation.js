import { gestionError } from './dashboard-presentation.js';
import { notify } from '../notifications.js';

let nextErrorId = 0;

/** Frontera de formularios: restricciones HTML y rechazo de operaciones asíncronas. */
export function bindFormValidation(form, target) {
  const events = new AbortController();
  const previousSubmit = form.onsubmit;
  const previousNoValidate = form.noValidate;
  const messages = new Map();
  form.noValidate = true;

  function clearField(field) {
    const message = messages.get(field);
    if (!message) return;
    message.remove();
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-errormessage');
    messages.delete(field);
  }

  form.addEventListener(
    'invalid',
    (event) => {
      const field = event.target;
      clearField(field);
      const message = document.createElement('span');
      message.id = `galenos-field-error-${++nextErrorId}`;
      message.className = 'action-error';
      message.setAttribute('role', 'alert');
      message.textContent = field.validity.valueMissing
        ? 'Completa este campo obligatorio.'
        : 'Revisa el formato y el valor de este campo.';
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-errormessage', message.id);
      field.after(message);
      messages.set(field, message);
    },
    { capture: true, signal: events.signal },
  );
  form.addEventListener('input', (event) => clearField(event.target), { signal: events.signal });

  form.onsubmit = async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    try {
      await previousSubmit?.call(form, event);
    } catch (error) {
      const message = gestionError(error);
      if (message) notify(target, 'error', message);
    }
  };
  return () => {
    events.abort();
    form.onsubmit = previousSubmit;
    form.noValidate = previousNoValidate;
    [...messages.keys()].forEach(clearField);
  };
}
