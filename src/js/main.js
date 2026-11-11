import { mountPortal } from './boundary/portal-academico.js';
import { mountAppearance } from './boundary/appearance.js';
import { mountGestion } from './boundary/gestion.js';
import { mountDashboard } from './boundary/dashboard.js';
import { gestionConfig as defaults } from './control/environment.example.js';
import { API_V2_ROUTES, API_V2_DASHBOARD_ROUTES } from './control/api-v2-routes.js';
import { ClinicaService, createApiConfig } from './index.js';
import { obtenerContextoEmpleado } from './control/contexto-empleado.js';
import { registerPwa } from './boundary/pwa.js';
let portals = [];
let appearance;
let dashboard;
let gestion;
let environment;
const root = document.querySelector('[data-dashboard]');
function closeGestion() {
  gestion?.destroy();
  dashboard?.destroy();
  gestion = null;
  dashboard = null;
}
async function start() {
  try {
    const local = await import('./control/environment.local.js').catch((error) => {
      if (!(error instanceof TypeError)) throw error;
      return {};
    });
    environment = local.gestionConfig ?? local.config ?? defaults;
    appearance = mountAppearance(root);
    portals = [...document.querySelectorAll('busqueda-citas,inicio-sesion')].map((view) =>
      mountPortal(view, environment),
    );
    navigate();
  } catch {
    document.querySelector('[data-ui="startupStatus"]').textContent =
      'No se pudo iniciar la aplicación. Revisa la configuración.';
  }
}
function navigate() {
  const portal = ['#pacientes', '#empleados', ''].includes(location.hash);
  const employee = location.hash === '#empleados';
  const context = obtenerContextoEmpleado();
  if (!portal && !context) {
    location.hash = '#empleados';
    return;
  }
  document.querySelector('[data-portales]').hidden = !portal;
  document.querySelector('busqueda-citas').hidden = employee;
  document.querySelector('inicio-sesion').hidden = !employee;
  document.querySelector('[data-clinic-header]').hidden = portal;
  if (portal) {
    closeGestion();
    document.querySelector('#main').hidden = true;
    document.querySelector('#gestion').hidden = true;
    for (const link of document.querySelectorAll('[data-navigation] a')) {
      const active = link.hash === (employee ? '#empleados' : '#pacientes');
      link.classList.toggle('nav-current', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  } else if (!dashboard && environment) {
    // Servicios, controles, componentes y módulos de gestión originales.
    // El servidor verifica permisos, aunque el usuario abra rutas manualmente.
    const identificacion = portals.find((p) => p.identidad.portal === 'empleado').identidad;
    const assignment =
      context.asignaciones.find((a) => a.idPersonaRol === identificacion.asignacionActiva) ??
      context.asignaciones[0];
    const session = identificacion.session;
    const config = createApiConfig({
      ...environment,
      routes: API_V2_ROUTES,
      http: {
        headers: {
          Authorization: `Bearer ${session.token}`,
          'X-Persona-Rol': assignment.idPersonaRol,
        },
      },
    });
    const clinicConfig = createApiConfig({ ...config, routes: API_V2_DASHBOARD_ROUTES });
    dashboard = mountDashboard({
      root,
      config,
      clinicaService: new ClinicaService({ config: clinicConfig }),
    });
    gestion = mountGestion({ config, dashboard });
    const mounted = dashboard;
    mounted.ready
      .then(() => {
        if (dashboard === mounted && mounted.control.state.clinicasStatus === 'ready')
          return mounted.control.selectClinica(assignment.idClinica);
      })
      .catch(() => {
        document.querySelector('[data-ui="startupStatus"]').textContent =
          'No se pudo cargar la clínica asignada. Reintenta la conexión.';
      });
  }
}
window.addEventListener('hashchange', navigate);
window.addEventListener('pagehide', () => {
  closeGestion();
  appearance?.destroy();
  portals.forEach((p) => p.destroy());
  portals = [];
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    for (const view of document.querySelectorAll('busqueda-citas,inicio-sesion'))
      view.context(null);
    start();
  }
});
start();
registerPwa();
