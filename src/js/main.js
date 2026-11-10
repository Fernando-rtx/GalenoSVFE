import { mountAppearance } from './boundary/appearance.js';
import { mountGestion } from './boundary/gestion.js';
import { mountDashboard } from './boundary/dashboard.js';
import { gestionConfig as localDefault } from './control/environment.example.js';
import { API_V2_DASHBOARD_ROUTES, API_V2_ROUTES } from './control/api-v2-routes.js';
import { ClinicaService, createApiConfig } from './index.js';
import './boundary/components/tarjeta_consulta.js';
import './boundary/components/galenos-notifications.js';
import { registerPwa } from './boundary/pwa.js';

const root = document.querySelector('[data-dashboard]');
let appearance;
let dashboard;
let gestion;
let closed = false;

async function start() {
  try {
    const local = await import('./control/environment.local.js').catch((error) => {
      if (!(error instanceof TypeError)) throw error;
      return {};
    });
    const environment = local.gestionConfig ?? local.config ?? localDefault;
    if (closed) return;
    appearance?.destroy();
    appearance = mountAppearance(root);
    const config = createApiConfig({ ...environment, routes: API_V2_ROUTES });
    const clinicConfig = createApiConfig({ ...config, routes: API_V2_DASHBOARD_ROUTES });
    dashboard = mountDashboard({
      root,
      config,
      clinicaService: new ClinicaService({ config: clinicConfig }),
    });
    gestion = mountGestion({ config, dashboard });
    await dashboard.ready;
  } catch (error) {
    document.querySelector('[data-ui="startupStatus"]').textContent =
      'No se pudo iniciar el dashboard. Revisa la configuración de conexión.';
  }
}
window.addEventListener('pagehide', () => {
  closed = true;
  if (dashboard) dashboard.destroy();
  gestion?.destroy();
  appearance?.destroy();
});
// Restaurar una página guardada en la caché de navegación crea solicitudes nuevas.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    closed = false;
    start();
  }
});
start();
registerPwa();
