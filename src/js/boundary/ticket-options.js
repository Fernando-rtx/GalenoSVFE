import { isAppInstalled, requestInstallation, installationInstructions } from './pwa.js';
import { showAccessibleDialog } from './modelos/form-validation.js';

/** Modal de ticket de un solo uso, con DOM ligero para conservar el tema. */
class GalenosTicketOptions extends HTMLElement {
  connectedCallback() {
    if (this.events) return;
    const previous = focusedElement();
    const events = this.events = new AbortController();
    const on = (node, type, handler) => node.addEventListener(type, handler, { signal: events.signal });
    const dialog = document.createElement('dialog');
    dialog.className = 'gestion-dialog ticket-options';
    dialog.innerHTML = `<h2>Descarga tu ticket</h2>
        <p>Instala GalenosSV para abrirla como una app.</p>
        <p>Puedes instalar GalenosSV o continuar con tu ticket PDF.</p>
        <p data-install-status role="status" aria-live="polite"></p>
        <div class="gestion-tools">
          <button type="button" class="primary-button" data-ticket-install>Instalar app</button>
          <button type="button" class="secondary-button" data-ticket-pdf>Descargar ticket PDF</button>
          <button type="button" class="text-button" data-ticket-cancel>Cancelar</button>
        </div>`;
    this.append(dialog);
    const install = dialog.querySelector('[data-ticket-install]');
    if (isAppInstalled()) {
      install.textContent = 'App instalada';
      install.disabled = true;
    }

    let download = false;
    on(dialog, 'close', () => {
      const resolve = this.resolveChoice;
      this.resolveChoice = null;
      this.remove();
      if (previous?.isConnected) previous.focus();
      resolve?.(download);
    });
    on(dialog.querySelector('[data-ticket-pdf]'), 'click', () => {
      download = true;
      dialog.close();
    });
    on(dialog.querySelector('[data-ticket-cancel]'), 'click', () => dialog.close());
    on(install, 'click', async () => {
      install.disabled = true;
      const outcome = await requestInstallation();
      if (events.signal.aborted || !dialog.open) return;
      const message = dialog.querySelector('[data-install-status]');
      if (outcome === 'accepted') message.textContent = 'Instalación solicitada. Sigue las indicaciones del navegador.';
      else if (outcome === 'installed') message.textContent = 'La app ya está instalada.';
      else if (outcome === 'dismissed') message.textContent = 'Instalación cancelada. Puedes descargar tu ticket PDF.';
      else message.textContent = installationInstructions();
      if (outcome === 'installed') install.textContent = 'App instalada';
      install.disabled = outcome === 'installed' || outcome === 'accepted';
    });
    showAccessibleDialog(dialog);
  }

  disconnectedCallback() {
    this.events?.abort();
    this.events = null;
    this.replaceChildren();
    this.resolveChoice?.(false);
    this.resolveChoice = null;
  }
}

function focusedElement() {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

if (!customElements.get('galenos-ticket-options'))
  customElements.define('galenos-ticket-options', GalenosTicketOptions);

/** Ofrece instalar la PWA sin impedir la descarga independiente del PDF. */
export function offerTicketDownload() {
  const host = document.createElement('galenos-ticket-options');
  const parent = document.querySelector('galenos-application') || document.body;
  return new Promise((resolve) => {
    host.resolveChoice = resolve;
    parent.append(host);
  });
}
