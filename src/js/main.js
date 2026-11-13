import { gestionConfig as localDefault } from './control/environment.example.js';
import { API_V2_ROUTES } from './control/api-v2-routes.js';
import { createApiConfig } from './control/api-config.js';
import './boundary/components/galenos-academic-app.js';
import './boundary/components/galenos-notifications.js';
import { registerPwa } from './boundary/pwa.js';

async function start() {
  try {
    const local = await import('./control/environment.local.js').catch(() => ({}));
    const environment = local.gestionConfig ?? local.config ?? localDefault;
    const config = createApiConfig({ ...environment, routes: API_V2_ROUTES });
    document.querySelector('galenos-academic-app')?.configure(config);
  } catch (error) {
    document.querySelector('galenos-academic-app')?.setAttribute('data-config-error', 'true');
  }
}
start();
registerPwa();
