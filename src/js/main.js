import { mountPortal } from './boundary/portal-academico.js';
import './boundary/components/galenos-academic-app.js';
import './boundary/components/galenos-notifications.js';
import { mountAppearance } from './boundary/appearance.js';
import { mountGestion } from './boundary/gestion.js';
import { mountDashboard } from './boundary/dashboard.js';
import { gestionConfig as defaults } from './control/environment.example.js';
import { API_V2_ROUTES, API_V2_DASHBOARD_ROUTES } from './control/api-v2-routes.js';
import { ClinicaService, createApiConfig } from './index.js';
import { obtenerContextoEmpleado, obtenerAsignacionEmpleado } from './control/contexto-empleado.js';
import { registerPwa } from './boundary/pwa.js';
import { mountLanguage } from './boundary/language.js';
mountLanguage();
let portals = [];
let appearance;
let dashboard;
let gestion;
let environment;
let academicConfig;
let academicSessions;
let unsubscribeEmployee;
const root = document.querySelector('[data-dashboard]');
document.querySelector('.brand').addEventListener('click', (event) => {
  if (location.hash === '#academico') {
    event.preventDefault();
    navigate();
  }
});
document.querySelector('.skip-link').addEventListener('click', (event) => {
  event.preventDefault();
  document.querySelector('#workspace').focus();
});
function closeGestion() {
  gestion?.destroy();
  dashboard?.destroy();
  gestion = null;
  dashboard = null;
}
async function start() {
  try {
    // Preserve ignored per-machine settings used by the local Liberty setup.
    const local = await import('./control/environment.local.js').catch((error) => {
      if (!(error instanceof TypeError)) throw error;
      return {};
    });
    const localConfig = local.gestionConfig ?? local.config ?? local;
    const runtimeConfig = globalThis.GALENOS_CONFIG;
    const runtime = runtimeConfig?.gestionConfig ?? runtimeConfig?.config ?? runtimeConfig ?? {};
    environment = { ...defaults, ...localConfig, ...runtime };
    academicConfig = createApiConfig({ ...environment, routes: API_V2_ROUTES });
    appearance = mountAppearance(root);
    portals = [...document.querySelectorAll('busqueda-citas,inicio-sesion')].map((view) =>
      mountPortal(view, environment),
    );
    academicSessions = {
      patient: () => portals.find((portal) => portal.identidad.portal === 'paciente')?.identidad.session ?? null,
      assignment: () => obtenerAsignacionEmpleado()?.idPersonaRol,
      selectAssignment: (id) => portals.find((portal) => portal.identidad.portal === 'empleado')?.identidad.seleccionarAsignacion(id),
      invalidate: () => {
        const portal = portals.find((portal) => portal.identidad.portal === 'empleado');
        portal.identidad.invalidar();
        document.querySelector('inicio-sesion').status('La sesión expiró o ya no es válida. Identifícate de nuevo.');
      },
      logout: async () => {
        const portal = portals.find((portal) => portal.identidad.portal === 'empleado');
        try { await portal.identidad.salir(); }
        catch (error) {
          document.querySelector('inicio-sesion').status(error.message);
          throw error;
        } finally {
          document.querySelector('inicio-sesion').context(null);
          location.hash = '#empleados';
        }
      },
      employee: () => portals.find((portal) => portal.identidad.portal === 'empleado')?.identidad.session ?? null,
    };
    document.querySelector('galenos-academic-app')?.configure(academicConfig, academicSessions);
    const empleado = portals.find((portal) => portal.identidad.portal === 'empleado').identidad;
    unsubscribeEmployee?.();
    unsubscribeEmployee = empleado.subscribe((motivo) => {
      closeGestion();
      const academicApp = document.querySelector('galenos-academic-app');
      if (typeof academicApp?.clearEmployee === 'function')
        academicApp.clearEmployee(motivo !== 'asignacion');
      if (!empleado.session) {
        document.querySelector('inicio-sesion').context(null);
        if (!['#empleados', '#pacientes'].includes(location.hash)) location.hash = '#pacientes';
      }
    });
    navigate();
  } catch {
    document.querySelector('[data-ui="startupStatus"]').textContent =
      'No se pudo iniciar la aplicación. Revisa la configuración.';
  }
}
function navigate() {
  if (!location.hash) history.replaceState(null, '', '#pacientes');
  const academic = location.hash === '#academico';
  const context = obtenerContextoEmpleado();
  const contractedEmployee = Boolean(context && obtenerAsignacionEmpleado());
  root.classList.toggle('public-portal', !contractedEmployee);
  document.querySelector('#layoutNavigation').hidden = !contractedEmployee;
  document.querySelector('.layout-menu-toggle').hidden = !contractedEmployee;
  if (academic && !contractedEmployee) {
    location.hash = '#pacientes';
    return;
  }
  if (academic) document.title = 'Dashboard · GalenosSV';
  else if (location.hash === '#empleados') document.title = 'Login · GalenosSV';
  else if (location.hash === '#pacientes') document.title = 'Búsqueda de citas · GalenosSV';
  const brand = document.querySelector('.brand');
  if (academic) brand.setAttribute('aria-current', 'page');
  else brand.removeAttribute('aria-current');
  if (academic) {
    const app = document.querySelector('galenos-academic-app');
    app?.refreshSessions();
    app?.show('dashboard');
  }
  const portal = ['#pacientes', '#empleados', ''].includes(location.hash) || academic;
  const employee = location.hash === '#empleados';
  const loginLink = document.querySelector('.header-login');
  loginLink.classList.toggle('is-active', employee);
  if (employee) loginLink.setAttribute('aria-current', 'page');
  else loginLink.removeAttribute('aria-current');
  if (!portal && !context) {
    location.hash = '#empleados';
    return;
  }
  document.querySelector('[data-portales]').hidden = !portal || academic;
  document.querySelector('#academic-care').hidden = !academic;
  document.querySelector('busqueda-citas').hidden = employee;
  document.querySelector('inicio-sesion').hidden = !employee;
  document.querySelector('[data-clinic-header]').hidden = portal;
  if (portal) {
    closeGestion();
    document.querySelector('#main').hidden = true;
    document.querySelector('#gestion').hidden = true;
    for (const link of document.querySelectorAll('[data-navigation] a')) {
      const active = link.hash === (academic ? '#academico' : employee ? '#empleados' : '#pacientes');
      link.classList.toggle('nav-current', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  } else if (!dashboard && environment) {
    const identificacion = portals.find((p) => p.identidad.portal === 'empleado')?.identidad;
    const assignment = obtenerAsignacionEmpleado();
    if (!identificacion?.session || !assignment) return;
    const config = createApiConfig({
      ...environment,
      routes: API_V2_ROUTES,
      http: {
        headers: {
          Authorization: `Bearer ${identificacion.session.token}`,
          'X-Persona-Rol': assignment.idPersonaRol,
        },
      },
    });
    const clinicConfig = createApiConfig({ ...config, routes: API_V2_DASHBOARD_ROUTES });
    try {
      dashboard = mountDashboard({
        root,
        config,
        clinicaService: new ClinicaService({ config: clinicConfig }),
      });
      gestion = mountGestion({ config, dashboard });
      const mounted = dashboard;
      mounted.ready
        .then(async () => {
          if (dashboard !== mounted || mounted.control.state.clinicasStatus !== 'ready') return;
          await mounted.control.selectClinica(assignment.idClinica);
          if (dashboard === mounted)
            document.querySelector('[data-ui="startupStatus"]').textContent = '';
        })
        .catch((error) => {
          document.querySelector('[data-ui="startupStatus"]').textContent =
            'No se pudo cargar la clínica asignada. Reintenta la conexión.';
          console.error('No se pudo cargar la clínica asignada.', error);
        });
    } catch (error) {
      console.error('No se pudo montar la consulta del empleado.', error);
      gestion?.destroy();
      dashboard?.destroy();
      gestion = null;
      dashboard = null;
      document.querySelector('[data-ui="startupStatus"]').textContent =
        'No se pudo abrir Consultas. Revisa la conexión y vuelve a intentar.';
    }
  }
}
document.querySelector('[data-navigation]').addEventListener('click', (event) => {
  const link = event.target.closest('a[href="#main"], a[href="#atencion"]');
  if (link && !dashboard && environment && obtenerAsignacionEmpleado()) navigate();
});
window.addEventListener('hashchange', navigate);
window.addEventListener('pagehide', () => {
  unsubscribeEmployee?.();
  const academicApp = document.querySelector('galenos-academic-app');
  if (typeof academicApp?.clearEmployee === 'function') academicApp.clearEmployee();
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
