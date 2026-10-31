import { mountGestion } from './gestion.js';
import { mountDashboard } from './dashboard.js';
import { config as defaultConfig } from '../config/environment.example.js';
import '../boundary/components/tarjeta_consulta.js';

const root = document.querySelector('[data-dashboard]');
let dashboard;
let gestion;
let closed = false;

async function start() {
  let config = defaultConfig;
  let gestionConfig = null;
  let authenticatedOnly = false;
  try {
    const environment = await import('../config/environment.local.js');
    config = environment.config;
    gestionConfig = environment.gestionConfig;
    authenticatedOnly = environment.authenticatedOnly === true;
  } catch (error) {
    // Sin archivo local no se supone un backend: el DAO informa la configuración pendiente.
    // Los errores de una configuración existente también se presentan, sin URL alternativa.
    document.querySelector('[data-ui="startupStatus"]').textContent = 'Revisa la configuración local de conexión con el servidor.';
  }
  if (closed) return;
  try {
    dashboard = mountDashboard({ root, config, autoLoad: !authenticatedOnly });
    gestion = mountGestion({ config: gestionConfig, dashboard, defaultConfig: config });
    if (authenticatedOnly) document.querySelector('[data-ui="startupStatus"]').textContent = 'Inicia sesión desde el menú de gestión para seleccionar tu clínica.';
    await dashboard.ready;
  } catch (error) {
    document.querySelector('[data-ui="startupStatus"]').textContent = 'No se pudo iniciar el dashboard. Revisa la configuración de conexión.';
  }
}
window.addEventListener('pagehide', () => { closed = true; if (dashboard) dashboard.destroy(); gestion?.destroy(); });
// Restaurar una página guardada en la caché de navegación crea solicitudes nuevas.
window.addEventListener('pageshow', event => { if (event.persisted) { closed = false; start(); } });
start();
