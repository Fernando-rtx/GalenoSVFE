import { isAppInstalled, requestInstallation } from './pwa.js';
import { showAccessibleDialog } from './modelos/form-validation.js';

/** Ofrece instalar la PWA sin impedir la descarga independiente del PDF. */
export function offerTicketDownload() {
  const previous = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'gestion-dialog ticket-options';
  dialog.innerHTML = `<h2>Descarga tu ticket</h2>
    <p>Para más información, descarga la app.</p>
    <p>Puedes instalar GalenosSV o continuar con tu ticket PDF.</p>
    <p data-install-status role="status" aria-live="polite"></p>
    <div class="gestion-tools">
      <button type="button" class="primary-button" data-ticket-install>Descargar app</button>
      <button type="button" class="secondary-button" data-ticket-pdf>Descargar ticket PDF</button>
      <button type="button" class="text-button" data-ticket-cancel>Cancelar</button>
    </div>`;
  const install = dialog.querySelector('[data-ticket-install]');
  if (isAppInstalled()) {
    install.textContent = 'App instalada';
    install.disabled = true;
  }
  return new Promise((resolve) => {
    let download = false;
    dialog.addEventListener('close', () => {
      dialog.remove();
      previous?.focus();
      resolve(download);
    }, { once: true });
    dialog.querySelector('[data-ticket-pdf]').onclick = () => {
      download = true;
      dialog.close();
    };
    dialog.querySelector('[data-ticket-cancel]').onclick = () => dialog.close();
    install.onclick = async () => {
      install.disabled = true;
      const outcome = await requestInstallation();
      const message = dialog.querySelector('[data-install-status]');
      if (outcome === 'accepted') message.textContent = 'Instalación solicitada. Sigue las indicaciones del navegador.';
      else if (outcome === 'installed') message.textContent = 'La app ya está instalada.';
      else if (outcome === 'dismissed') message.textContent = 'Instalación cancelada. Puedes descargar tu ticket PDF.';
      else message.textContent = 'Para instalar la app, abre el menú del navegador y selecciona “Instalar aplicación” o “Añadir a pantalla de inicio”. Si esa opción no aparece, continúa usando la versión web y descarga tu ticket PDF.';
      install.disabled = outcome === 'installed' || outcome === 'accepted';
    };
    document.body.append(dialog);
    showAccessibleDialog(dialog);
  });
}
