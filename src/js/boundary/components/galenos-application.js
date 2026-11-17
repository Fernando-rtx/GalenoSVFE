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

/** Cascarón de la SPA compuesto con Web Components y elementos HTML nativos. */
const applicationMarkup = String.raw`<galenos-notifications></galenos-notifications>
    <a class="skip-link" href="#workspace">Saltar al contenido</a>
    <galenos-dashboard class="app-shell public-portal" data-dashboard>
      <header class="layout-header">
        <div class="layout-logo">
          <button
            type="button"
            class="layout-menu-toggle"
            hidden
            aria-label="Menú de navegación"
            aria-expanded="true"
            aria-controls="layoutNavigation"
          >
            ☰</button
          ><a class="brand" href="#academico" aria-label="GalenosSV, dashboard"
            ><picture>
              <source srcset="/resources/imagenes/galenos-sv-logo.webp" type="image/webp" />
              <img
                src="/resources/imagenes/galenos-sv-logo.png"
                class="layout-logo-image"
                alt="Galenos SV — Clínica General"
                width="2048"
                height="768"
              />
            </picture></a>
        </div>
        <div class="layout-clinic" data-clinic-header>
          <div class="clinic-select">
            <label for="clinica">Clínica de trabajo</label
            ><select id="clinica" data-ui="clinica">
              <option value="">Selecciona una clínica</option>
            </select>
            <p class="field-hint" data-ui="clinicStatus" role="status"></p>
            <button type="button" class="text-button" data-ui="retryClinicas" hidden>
              Reintentar conexión
            </button>
          </div>
        </div>
        <div class="layout-tools">
          <button type="button" class="secondary-button" data-install hidden>
            Instalar aplicación
          </button>
          <div class="language-control">
            <button
              type="button"
              id="languageToggle"
              class="header-icon-button"
              aria-label="Cambiar idioma"
              aria-describedby="language-note"
              title="Cambiar idioma"
              aria-haspopup="true"
              aria-expanded="false"
              aria-controls="languageOptions"
            >
              <img src="/resources/iconos/traductor.svg" alt="" class="header-icon-image" />
            </button>
            <div
              id="languageOptions"
              class="language-options"
              role="group"
              aria-label="Idioma"
              hidden
            >
              <button type="button" class="language-option" data-language="es" aria-pressed="true">
                Español
              </button>
              <button type="button" class="language-option" data-language="en" aria-pressed="false">
                English
              </button>
            </div>
          </div>
          <span class="sr-only" id="language-note">Selecciona el idioma de la aplicación.</span>
          <button
            type="button"
            id="themeToggle"
            class="header-icon-button layout-theme-toggle"
            aria-label="Cambiar a modo claro"
            title="Cambiar a modo claro"
          >
            <img src="/resources/iconos/temasoscuro.svg" alt="" class="theme-icon-image" data-theme-icon />
          </button>
          <a
            href="#empleados"
            class="header-icon-button header-login"
            aria-label="Iniciar sesión"
            title="Iniciar sesión"
          >
            <img src="/resources/iconos/login.svg" alt="" class="header-icon-image" />
          </a>
        </div>
      </header>
      <aside class="sidebar" id="layoutNavigation" hidden>
        <p class="nav-label">NAVEGACIÓN</p>
        <nav aria-label="Principal" data-navigation>
          <a href="#academico">Bandeja de consultas</a>
          <a href="#pacientes">Búsqueda de citas</a>
          <a href="#atencion">Programar cita</a>
        </nav>
        <p class="sidebar-footer">Programación para Internet<br />Universidad de El Salvador</p>
      </aside>
      <div class="workspace" id="workspace" tabindex="-1">
        <section data-portales aria-label="Identificación académica">
          <busqueda-citas></busqueda-citas>
          <inicio-sesion hidden></inicio-sesion>
        </section>
        <section id="academic-care" aria-label="Atención académica" hidden>
          <galenos-academic-app></galenos-academic-app>
        </section>
        <main id="main" tabindex="-1" hidden>
          <div class="page-heading">
            <div>
              <p class="eyebrow">PANEL DE CONSULTAS</p>
              <h1 data-workspace-title>Consultas</h1>
              <p class="subtitle" data-workspace-subtitle>Consulta los registros de tu clínica de trabajo.</p>
            </div>
            <span class="heading-symbol" aria-hidden="true">✚</span>
          </div>
          <p class="record-hint" data-workspace-hint>
            Selecciona una tarjeta para consultar su detalle.
          </p>
          <p class="startup-status" data-ui="startupStatus" role="status"></p>

          <section class="metrics" aria-label="Resumen de consultas">
            <div class="metric">
              <span>Clínica seleccionada</span
              ><strong class="clinic-name" data-ui="selectedClinic">Sin seleccionar</strong>
            </div>
            <div class="metric">
              <span>Total con estos filtros</span><strong data-ui="total">—</strong
              ><small>consultas</small>
            </div>
            <div class="metric">
              <span>En esta página</span><strong data-ui="visible">—</strong
              ><small>resultados</small>
            </div>
          </section>
          <section class="panel filters-panel" aria-labelledby="filters-heading">
            <div class="section-heading">
              <div>
                <span class="step-label">02 / BÚSQUEDA</span>
                <h2 id="filters-heading">Encuentra lo que necesitas</h2>
              </div>
              <span class="muted small">Filtros opcionales</span>
            </div>
            <form data-ui="filters">
              <fieldset data-ui="filtersFieldset" disabled>
                <legend class="sr-only">Filtros de consultas</legend>
                <div class="filter-grid">
                  <div>
                    <label for="fechaDesde">Desde</label
                    ><input type="date" id="fechaDesde" data-ui="fechaDesde" />
                  </div>
                  <div>
                    <label for="fechaHasta">Hasta</label
                    ><input type="date" id="fechaHasta" data-ui="fechaHasta" />
                  </div>
                  <div class="role-filter">
                    <label for="pacienteNombre">Nombre del paciente</label
                    ><input
                      type="text"
                      id="pacienteNombre"
                      data-ui="pacienteNombre"
                      placeholder="Escribe el nombre o apellido"
                      autocomplete="off"
                      spellcheck="false"
                    /><input type="hidden" data-ui="idPersonaRol" />
                    <select data-ui="pacienteResultados" aria-label="Pacientes encontrados" hidden></select>
                    <span class="field-hint">Opcional · busca pacientes de la clínica seleccionada</span>
                  </div>
                  <button class="primary-button" type="submit">
                    Aplicar filtros <span aria-hidden="true">→</span></button
                  ><button type="button" class="secondary-button" data-ui="clearFilters">
                    Limpiar
                  </button>
                </div>
              </fieldset>
            </form>
            <p class="action-error" role="alert" data-ui="actionError" hidden></p>
          </section>
          <section
            class="gestion consulta-gestion"
            data-consulta-gestion
            hidden
            aria-label="Gestión de consultas"
          ></section>
          <section
            class="gestion panel"
            data-ordenes
            hidden
            aria-label="Órdenes y resultados"
          ></section>
          <div class="content-grid">
            <section
              class="panel results-panel"
              aria-labelledby="results-heading"
              data-ui="results"
            >
              <div class="section-heading">
                <div>
                  <span class="step-label">03 / RESULTADOS</span>
                  <h2 id="results-heading">Consultas</h2>
                </div>
                <label class="page-size-label" for="pageSize"
                  >Por página
                  <select id="pageSize" data-ui="pageSize" disabled>
                    <option value="2">2</option>
                    <option value="5">5</option>
                    <option value="10" selected>10</option>
                    <option value="20">20</option>
                  </select></label
                >
              </div>
              <div class="result-status" role="status" data-ui="resultStatus">
                Selecciona una clínica para consultar sus registros.
              </div>
              <button class="secondary-button retry" type="button" data-ui="retryConsultas" hidden>
                Volver a cargar consultas
              </button>
              <div class="cards" data-ui="cards" hidden></div>
              <div class="table-scroll" data-ui="table" hidden>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Persona</th>
                      <th scope="col">Rol</th>
                      <th scope="col">Inicio · UTC</th>
                      <th scope="col"><span class="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody data-ui="rows"></tbody>
                </table>
              </div>
              <footer class="pagination">
                <p data-ui="pageInfo" role="status">Sin resultados cargados</p>
                <div>
                  <button
                    class="pagination-button"
                    type="button"
                    data-ui="previous"
                    aria-label="Página anterior"
                    disabled
                  >
                    ← <span>Anterior</span></button
                  ><button
                    class="pagination-button"
                    type="button"
                    data-ui="next"
                    aria-label="Página siguiente"
                    disabled
                  >
                    <span>Siguiente</span> →
                  </button>
                </div>
              </footer>
            </section>
            <aside class="panel detail-panel" aria-labelledby="detail-heading" data-ui="detail">
              <span class="detail-icon" aria-hidden="true">≡</span
              ><span class="step-label">VISTA DE DETALLE</span>
              <h2 id="detail-heading" data-ui="detailName">Detalle de consulta</h2>
              <p class="detail-status" data-ui="detailStatus" role="status">
                Selecciona una consulta para ver su información.
              </p>
              <dl data-ui="detailData" hidden></dl>
              <button type="button" class="secondary-button" data-ui="retryDetalle" hidden>
                Volver a cargar detalle
              </button>
              <p class="detail-footnote">
                Las fechas se muestran en UTC. Los datos ausentes se indican como “Sin especificar”.
              </p>
            </aside>
          </div>
          <footer class="page-footer">
            <details>
              <summary>Instalación manual</summary>
              <p>
                Si tu navegador ofrece “Añadir a pantalla de inicio” o “Instalar aplicación”,
                utiliza esa opción. Requiere HTTPS o localhost.
              </p>
            </details>
            <span>GalenosSV <span aria-hidden="true">·</span> Gestión clínica</span
            ><span>Acceso limitado a usuarios autorizados.</span>
          </footer>
        </main>
        <section id="gestion" class="gestion" tabindex="-1" aria-label="Gestión" hidden></section>
      </div>
    </galenos-dashboard>
    <noscript>Activa JavaScript para utilizar el dashboard de consultas.</noscript>`;

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
  
