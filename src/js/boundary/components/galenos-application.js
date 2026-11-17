import { mountPortal } from '../portal-academico.js';
import './galenos-academic-app.js';
import './galenos-notifications.js';
import { mountAppearance } from '../appearance.js';
import { mountGestion } from '../gestion.js';
import { mountDashboard } from '../dashboard.js';
import { gestionConfig as defaults } from '../../control/environment.example.js';
import { API_V2_ROUTES, API_V2_DASHBOARD_ROUTES } from '../../control/api-v2-routes.js';
import { ClinicaService, createApiConfig } from '../../index.js';
import { obtenerContextoEmpleado, obtenerAsignacionEmpleado } from '../../control/contexto-empleado.js';
import { registerPwa } from '../pwa.js';
import { mountLanguage } from '../language.js';

import { applicationMarkup } from './application-markup.js';

export class GalenosApplication extends HTMLElement {
  connectedCallback() {
    if (this.hasAttribute('data-mounted')) return;
    this.setAttribute('data-mounted', '');
    this.innerHTML = `
      <link rel="stylesheet" href="/resources/estilos/dashboard.css">
      <link rel="stylesheet" href="/resources/estilos/gestion.css">
      <link rel="stylesheet" href="/resources/estilos/galenos.css">
      ${applicationMarkup}`;
    this.disposeApplication = mountApplication(this);
  }

  disconnectedCallback() {
    this.disposeApplication?.();
    this.disposeApplication = null;
    this.removeAttribute('data-mounted');
  }
}

if (!customElements.get('galenos-application'))
  customElements.define('galenos-application', GalenosApplication);

function mountApplication(root) {
  let portals = [];
  let appearance;
  let dashboard;
  let gestion;
  let environment;
  let academicConfig;
  let academicSessions;
  let unsubscribeEmployee;
  let language;
  const brand = root.querySelector('.brand');
  const skipLink = root.querySelector('.skip-link');
  const navigation = root.querySelector('[data-navigation]');
  const dashboardRoot = root.querySelector('[data-dashboard]');
  const onBrandClick = (event) => {
    if (location.hash === '#academico') {
      event.preventDefault();
      navigate();
    }
  };
  const onSkipClick = (event) => {
    event.preventDefault();
    root.querySelector('#workspace').focus();
  };
  brand.addEventListener('click', onBrandClick);
  skipLink.addEventListener('click', onSkipClick);
  function closeGestion() {
    gestion?.destroy();
    dashboard?.destroy();
    gestion = null;
    dashboard = null;
  }
  async function start() {
    try {
      language?.destroy();
      language = mountLanguage(root);
      // Preserve ignored per-machine settings used by the local Liberty setup.
      const local = await import('../../control/environment.local.js').catch((error) => {
        if (!(error instanceof TypeError)) throw error;
        return {};
      });
      const localConfig = local.gestionConfig ?? local.config ?? local;
      const runtimeConfig = globalThis.GALENOS_CONFIG;
      const runtime = runtimeConfig?.gestionConfig ?? runtimeConfig?.config ?? runtimeConfig ?? {};
      environment = { ...defaults, ...localConfig, ...runtime };
      academicConfig = createApiConfig({ ...environment, routes: API_V2_ROUTES });
      appearance = mountAppearance(dashboardRoot);
      portals = [...root.querySelectorAll('busqueda-citas,inicio-sesion')].map((view) =>
        mountPortal(view, environment),
      );
      academicSessions = {
        patient: () => portals.find((portal) => portal.identidad.portal === 'paciente')?.identidad.session ?? null,
        assignment: () => obtenerAsignacionEmpleado()?.idPersonaRol,
        selectAssignment: (id) => portals.find((portal) => portal.identidad.portal === 'empleado')?.identidad.seleccionarAsignacion(id),
        invalidate: () => {
          const portal = portals.find((portal) => portal.identidad.portal === 'empleado');
          portal.identidad.invalidar();
          location.hash = '#empleados';
          root.querySelector('inicio-sesion').status('La sesión expiró o ya no es válida. Identifícate de nuevo.');
        },
        logout: async () => {
          const portal = portals.find((portal) => portal.identidad.portal === 'empleado');
          try { await portal.identidad.salir(); }
          catch (error) {
            root.querySelector('inicio-sesion').status(error.message);
            throw error;
          } finally {
            root.querySelector('inicio-sesion').context(null);
            location.hash = '#empleados';
          }
        },
        employee: () => portals.find((portal) => portal.identidad.portal === 'empleado')?.identidad.session ?? null,
      };
      root.querySelector('galenos-academic-app')?.configure(academicConfig, academicSessions);
      const empleado = portals.find((portal) => portal.identidad.portal === 'empleado').identidad;
      unsubscribeEmployee?.();
      unsubscribeEmployee = empleado.subscribe((motivo) => {
        closeGestion();
        const academicApp = root.querySelector('galenos-academic-app');
        if (typeof academicApp?.clearEmployee === 'function')
          academicApp.clearEmployee(motivo !== 'asignacion');
        if (!empleado.session) {
          root.querySelector('inicio-sesion').context(null);
          if (!['#empleados', '#pacientes'].includes(location.hash)) location.hash = '#pacientes';
        }
      });
      navigate();
    } catch {
      root.querySelector('[data-ui="startupStatus"]').textContent =
        'No se pudo iniciar la aplicación. Revisa la configuración.';
    }
  }
  function navigate() {
    if (!location.hash) history.replaceState(null, '', '#pacientes');
    const academic = location.hash === '#academico';
    const context = obtenerContextoEmpleado();
    const assignment = obtenerAsignacionEmpleado();
    const contractedEmployee = Boolean(context && assignment);
    const reception = String(assignment?.rolNombre ?? '').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ')
      .toLocaleLowerCase() === 'atencion al publico';
    dashboardRoot.classList.toggle('public-portal', !contractedEmployee);
    root.querySelector('#layoutNavigation').hidden = !contractedEmployee;
    root.querySelector('.layout-menu-toggle').hidden = !contractedEmployee;
    const patientAppointmentsLink = root.querySelector('[data-navigation] a[href="#pacientes"]');
    const schedulingLink = root.querySelector('[data-navigation] a[href="#atencion"]');
    if (patientAppointmentsLink) patientAppointmentsLink.hidden = contractedEmployee;
    if (schedulingLink) schedulingLink.hidden = !contractedEmployee || !reception;
    if (['#main', '#atencion'].includes(location.hash) && contractedEmployee && !reception) {
      location.hash = '#academico';
      return;
    }
    if (contractedEmployee && location.hash === '#pacientes') {
      location.hash = '#academico';
      return;
    }
    if (academic && !contractedEmployee) {
      location.hash = '#pacientes';
      return;
    }
    if (academic) document.title = 'Dashboard · GalenosSV';
    else if (location.hash === '#empleados') document.title = 'Login · GalenosSV';
    else if (location.hash === '#pacientes') document.title = 'Búsqueda de citas · GalenosSV';
    const brand = root.querySelector('.brand');
    if (academic) brand.setAttribute('aria-current', 'page');
    else brand.removeAttribute('aria-current');
    if (academic) {
      const app = root.querySelector('galenos-academic-app');
      app?.refreshSessions();
      app?.show('dashboard');
    }
    const portal = ['#pacientes', '#empleados', ''].includes(location.hash) || academic;
    const employee = location.hash === '#empleados';
    const loginLink = root.querySelector('.header-login');
    loginLink.classList.toggle('is-active', employee);
    if (employee) loginLink.setAttribute('aria-current', 'page');
    else loginLink.removeAttribute('aria-current');
    if (!portal && !context) {
      location.hash = '#empleados';
      return;
    }
    root.querySelector('[data-portales]').hidden = !portal || academic;
    root.querySelector('#academic-care').hidden = !academic;
    root.querySelector('busqueda-citas').hidden = employee;
    root.querySelector('inicio-sesion').hidden = !employee;
    root.querySelector('[data-clinic-header]').hidden = portal;
    if (portal) {
      closeGestion();
      root.querySelector('#main').hidden = true;
      root.querySelector('#gestion').hidden = true;
      for (const link of root.querySelectorAll('[data-navigation] a')) {
        const active = link.hash === (academic ? '#academico' : employee ? '#empleados' : '#pacientes');
        link.classList.toggle('nav-current', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    } else if (!dashboard && environment) {
      const identificacion = portals.find((p) => p.identidad.portal === 'empleado')?.identidad;
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
          root: dashboardRoot,
          config,
          clinicaService: new ClinicaService({ config: clinicConfig }),
        });
        gestion = mountGestion({ config, dashboard, scope: root });
        const mounted = dashboard;
        mounted.ready
          .then(async () => {
            if (dashboard !== mounted || mounted.control.state.clinicasStatus !== 'ready') return;
            await mounted.control.selectClinica(assignment.idClinica);
            if (dashboard === mounted)
              root.querySelector('[data-ui="startupStatus"]').textContent = '';
          })
          .catch((error) => {
            root.querySelector('[data-ui="startupStatus"]').textContent =
              'No se pudo cargar la clínica asignada. Reintenta la conexión.';
            console.error('No se pudo cargar la clínica asignada.', error);
          });
      } catch (error) {
        console.error('No se pudo montar la consulta del empleado.', error);
        gestion?.destroy();
        dashboard?.destroy();
        gestion = null;
        dashboard = null;
        root.querySelector('[data-ui="startupStatus"]').textContent =
          'No se pudo abrir Consultas. Revisa la conexión y vuelve a intentar.';
      }
    }
  }
  const onNavigationClick = (event) => {
    const link = event.target.closest('a[href="#main"], a[href="#atencion"]');
    if (link && !dashboard && environment && obtenerAsignacionEmpleado()) navigate();
  };
  navigation.addEventListener('click', onNavigationClick);
  window.addEventListener('hashchange', navigate);
  const onPageHide = () => {
    unsubscribeEmployee?.();
    language?.destroy();
    const academicApp = root.querySelector('galenos-academic-app');
    if (typeof academicApp?.clearEmployee === 'function') academicApp.clearEmployee();
    closeGestion();
    appearance?.destroy();
    portals.forEach((p) => p.destroy());
    portals = [];
  };
  const onPageShow = (event) => {
    if (event.persisted) {
      for (const view of root.querySelectorAll('busqueda-citas,inicio-sesion'))
        view.context(null);
      start();
    }
  };
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  start();
  registerPwa(root);
  return () => {
    onPageHide();
    brand.removeEventListener('click', onBrandClick);
    skipLink.removeEventListener('click', onSkipClick);
    navigation.removeEventListener('click', onNavigationClick);
    window.removeEventListener('hashchange', navigate);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
  };
}
  
