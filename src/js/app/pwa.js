let installEvent = null;

// El listener se registra antes de esperar la configuración asíncrona.
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installEvent = event;
  document.querySelector('[data-install]')?.removeAttribute('hidden');
});
window.addEventListener('appinstalled', () => {
  installEvent = null;
  const button = document.querySelector('[data-install]');
  if (button) button.hidden = true;
});

export function registerPwa() {
  const button = document.querySelector('[data-install]');
  if (button) {
    button.hidden = !installEvent || window.matchMedia('(display-mode: standalone)').matches;
    button.addEventListener('click', async () => {
      const prompt = installEvent;
      if (!prompt) return;
      installEvent = null;
      button.hidden = true;
      await prompt.prompt();
      await prompt.userChoice;
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
