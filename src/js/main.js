import { mountPortal } from './boundary/portal-academico.js';
import './boundary/components/galenos-notifications.js';
import { mountAppearance } from './boundary/appearance.js';
import { gestionConfig as defaults } from './control/environment.example.js';
import { API_V2_ROUTES } from './control/api-v2-routes.js';
import { createApiConfig } from './control/api-config.js';
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
let academicAppLoad;
let academicAppConfigured = false;
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
  dashboardGeneration += 1;
  dashboardLoad = null;
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
    const empleado = portals.find((portal) => portal.identidad.portal === 'empleado').identidad;
    unsubscribeEmployee?.();
    unsubscribeEmployee = empleado.subscribe((motivo) => {
      closeGestion();
      document.querySelector('galenos-academic-app')?.clearEmployee(motivo !== 'asignacion');
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
    void mountAcademicApp();
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
    void mountEmployeeDashboard(context);
  }
}
function mountAcademicApp() {
  if (academicAppLoad) return academicAppLoad;
  academicAppLoad = (async () => {
    await import('./boundary/components/galenos-academic-app.js');
    if (location.hash !== '#academico' || !obtenerContextoEmpleado()) return;
    const app = document.querySelector('galenos-academic-app');
    if (!academicAppConfigured) {
      app.configure(academicConfig, academicSessions);
      academicAppConfigured = true;
    } else {
      app.refreshSessions();
    }
    app.show('dashboard');
  })()
    .catch((error) => {
      document.querySelector('[data-ui="startupStatus"]').textContent =
        'No se pudo cargar el área de empleado. Reintenta la conexión.';
      console.error('No se pudo cargar el área de empleado.', error);
    })
    .finally(() => {
      academicAppLoad = null;
    });
  return academicAppLoad;
}
let dashboardLoad;
let dashboardGeneration = 0;
let employeeStyles;
async function mountEmployeeDashboard(context) {
  if (dashboardLoad) return dashboardLoad;
  const generation = dashboardGeneration;
  dashboardLoad = (async () => {
    if (!employeeStyles) {
      employeeStyles = Promise.all(
        ['/resources/estilos/dashboard.css', '/resources/estilos/gestion.css'].map((href) => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = href;
          document.head.append(link);
          return new Promise((resolve, reject) => {
            link.addEventListener('load', resolve, { once: true });
            link.addEventListener('error', () => reject(new Error(`No se pudo cargar ${href}`)), {
              once: true,
            });
          });
        }),
      ).catch((error) => {
        employeeStyles = null;
        throw error;
      });
    }
    await employeeStyles;
    const [{ mountGestion }, { mountDashboard }, { API_V2_DASHBOARD_ROUTES }, { ClinicaService }] =
      await Promise.all([
        import('./boundary/gestion.js'),
        import('./boundary/dashboard.js'),
        import('./control/api-v2-routes.js'),
        import('./control/ClinicaService.js'),
      ]);
    if (
      generation !== dashboardGeneration ||
      !obtenerContextoEmpleado() ||
      ['#pacientes', '#empleados'].includes(location.hash)
    )
      return;
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
  })().catch((error) => {
    if (generation === dashboardGeneration) {
      dashboardLoad = null;
      document.querySelector('[data-ui="startupStatus"]').textContent =
        'No se pudo cargar el dashboard. Reintenta la conexión.';
      console.error('No se pudo cargar el dashboard del empleado.', error);
    }
  });
  return dashboardLoad;
}
window.addEventListener('hashchange', navigate);
window.addEventListener('pagehide', () => {
  unsubscribeEmployee?.();
  document.querySelector('galenos-academic-app')?.clearEmployee();
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
