let installEvent = null;
let installButton = null;
let installed = false;

export const isAppInstalled = () => installed || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/** Las instrucciones dependen del navegador; el aviso nativo depende de beforeinstallprompt. */
export function installationInstructions(browser = navigator) {
  const userAgent = browser.userAgent || '';
  if (/iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && browser.maxTouchPoints > 1))
    return 'En iPhone o iPad, abre GalenosSV en Safari y pulsa Compartir → Añadir a pantalla de inicio → Añadir.';
  if (/Macintosh/.test(userAgent) && /Safari/.test(userAgent) && !/Chrome|Chromium|Edg|OPR/.test(userAgent))
    return 'En Safari para Mac, selecciona Archivo → Añadir al Dock… (o Compartir → Añadir al Dock) y confirma con Añadir. Safari no permite abrir esa ventana desde este botón.';
  return 'El navegador no ha ofrecido el aviso de instalación. Abre su menú y busca Instalar GalenosSV o Instalar aplicación. Si no aparece, puedes seguir usando la versión web y descargar tu ticket PDF.';
}

export async function requestInstallation() {
  if (isAppInstalled()) return 'installed';
  const prompt = installEvent;
  if (!prompt) return 'unavailable';
  installEvent = null;
  installButton?.setAttribute('hidden', '');
  try {
    await prompt.prompt();
    return (await prompt.userChoice).outcome;
  } catch {
    return 'unavailable';
  }
}

// El listener se registra antes de esperar la configuración asíncrona.
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installEvent = event;
  installButton?.removeAttribute('hidden');
});
window.addEventListener('appinstalled', () => {
  installed = true;
  installEvent = null;
  if (installButton) installButton.hidden = true;
});

export function registerPwa(scope = document) {
  const button = (installButton = scope.querySelector('[data-install]'));
  if (button) {
    button.hidden = !installEvent || window.matchMedia('(display-mode: standalone)').matches;
    button.addEventListener('click', async () => {
      await requestInstallation();
    });
  }
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              document.dispatchEvent(
                new CustomEvent('galenos:notificacion', {
                  detail: {
                    tipo: 'informacion',
                    mensaje: 'Hay una nueva versión disponible. Recarga la página para actualizar.',
                  },
                  bubbles: true,
                  composed: true,
                }),
              );
            }
          });
        });
      })
      .catch(() => {
        document.dispatchEvent(
          new CustomEvent('galenos:notificacion', {
            detail: {
              tipo: 'advertencia',
              mensaje: 'No se pudo habilitar el acceso sin conexión.',
            },
            bubbles: true,
            composed: true,
          }),
        );
      });
  }
}
