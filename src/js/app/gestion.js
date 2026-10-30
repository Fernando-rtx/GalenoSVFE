import { createApiConfig, DefaultDAO, ClinicaDAO, RolDAO, TipoDocumentoDAO, TipoMedioContactoDAO, TipoExamenDAO, ConsultaDAO, ConsultaProcedimientoDAO, ConsultaProcedimientoPasoDAO, PersonaRolDAO, ProcedimientoDAO, PersonaDAO, DocumentoDAO, MedioContactoDAO, DefaultError } from '../index.js';
import { API_V2_ROUTES, API_V2_DASHBOARD_ROUTES } from '../config/api-v2-routes.js';
import ConsultaGestionControl from '../control/ConsultaGestionControl.js';
import ConsultaGestionPage from '../boundary/pages/ConsultaGestionPage.js';
import PersonaControl from '../control/PersonaControl.js';
import PersonaPage from '../boundary/pages/PersonaPage.js';
import CatalogoControl from '../control/CatalogoControl.js';
import CatalogoPage from '../boundary/pages/CatalogoPage.js';

/** Composición adicional dentro del dashboard; las credenciales viven solo en memoria. */
export function mountGestion({ config, dashboard: dashboardApp, defaultConfig }) {
  const root = document.querySelector('#gestion');
  const dashboard = document.querySelector('#main');
  const nav = document.querySelector('[data-navigation]');
  let control;
  let clinical;
  let clinicalPage;
  let personaControl;
  let personaPage;
  const catalogRoot = document.createElement('div');const personaRoot = document.createElement('div');personaRoot.hidden = true;personaRoot.dataset.personas = '';root.append(catalogRoot,personaRoot);
  function showModule(target) {
    const persons = target === 'persona' && personaControl;
    catalogRoot.hidden = Boolean(persons);personaRoot.hidden = !persons;
    if (persons) { personaControl.load();return; }
    page.open(target);
  }
  const clinicalRoot = document.querySelector('[data-consulta-gestion]');
  async function disconnect() {
    clinicalPage?.destroy();clinical?.destroy();clinical = null;clinicalRoot.hidden = true;
    await dashboardApp.control.connect({ clinicaDAO: new ClinicaDAO({ config: defaultConfig }), consultaDAO: new ConsultaDAO({ config: defaultConfig }) });
  }
  let module = 'tipoDocumento';
  const page = new CatalogoPage(catalogRoot, {
    async onLogin(username, password) {
      if (!config?.baseUrl) throw DefaultError.validation('Configura la URL del entorno de gestión.');
      if (!username || username.includes(':')) throw DefaultError.validation('Usuario inválido.');
      const bytes = new TextEncoder().encode(`${username}:${password}`);
      const authorization = `Basic ${btoa(String.fromCharCode(...bytes))}`;
      const api = createApiConfig({ ...config, routes: API_V2_ROUTES, http: { headers: { Authorization: authorization } } });
      const context = await new DefaultDAO({ resource: 'contexto', config: api }).get();
      control?.destroy();
      control = new CatalogoControl({ contexto: context.datos, module: module === 'persona' ? 'tipoDocumento' : module, daos: {
        clinica: new ClinicaDAO({ config: api }), rol: new RolDAO({ config: api }),
        tipoDocumento: new TipoDocumentoDAO({ config: api }), tipoMedioContacto: new TipoMedioContactoDAO({ config: api }),
        tipoExamen: new TipoExamenDAO({ config: api })
      } });
      page.connect(control);
      clinicalPage?.destroy();clinical?.destroy();
      const dashboardConfig = createApiConfig({ ...api, routes: API_V2_DASHBOARD_ROUTES });
      await dashboardApp.control.connect({ clinicaDAO: new ClinicaDAO({ config: dashboardConfig }), consultaDAO: new ConsultaDAO({ config: api }) });
      clinical = new ConsultaGestionControl({ dashboard: dashboardApp.control, contexto: context.datos,
        consultaDAO: new ConsultaDAO({ config: api }), asociacionDAO: new ConsultaProcedimientoDAO({ config: api }),
        pasoDAO: new ConsultaProcedimientoPasoDAO({ config: api }), pacienteDAO: new PersonaRolDAO({ config: api }), procedimientoDAO: new ProcedimientoDAO({ config: api }) });
      clinicalPage = new ConsultaGestionPage(clinicalRoot, clinical);clinicalRoot.hidden = false;
      personaPage?.destroy();personaControl?.destroy();
      personaControl = new PersonaControl({ contexto: context.datos, daos: {
        persona: new PersonaDAO({ config: api }), documento: new DocumentoDAO({ config: api }), medioContacto: new MedioContactoDAO({ config: api }),
        personaRol: new PersonaRolDAO({ config: api }), tipoDocumento: new TipoDocumentoDAO({ config: api }), tipoMedioContacto: new TipoMedioContactoDAO({ config: api }),
        rol: new RolDAO({ config: api }), clinica: new ClinicaDAO({ config: api })
      } });personaPage = new PersonaPage(personaRoot, personaControl);
      showModule(module);
    },
    onLogout() { if(clinical?.state.writing || personaControl?.state.writing)return; control?.destroy();control = null;personaPage?.destroy();personaControl?.destroy();personaControl = null;personaRoot.hidden = true;catalogRoot.hidden = false;page.signedOut();disconnect(); }
  });
  function navigate(event) {
    const anchor = event.target.closest('a');
    if (!anchor || (!anchor.dataset.module && anchor.getAttribute('href') !== '#main')) return;
    event.preventDefault();
    if (control?.state.writing || clinical?.state.writing || personaControl?.state.writing) { page.error(DefaultError.validation('Espera a que termine el guardado.'));return; }
    const isDashboard = !anchor.dataset.module;
    dashboard.hidden = !isDashboard;root.hidden = isDashboard;
    nav.querySelectorAll('a').forEach(link => { link.classList.toggle('nav-current', link === anchor);if (link === anchor) link.setAttribute('aria-current', 'page');else link.removeAttribute('aria-current'); });
    if (!isDashboard) { module = anchor.dataset.module;showModule(module); }
    (isDashboard ? dashboard : root).focus();
  }
  nav.addEventListener('click', navigate);
  return { destroy() { nav.removeEventListener('click', navigate);control?.destroy();clinicalPage?.destroy();clinical?.destroy();personaPage?.destroy();personaControl?.destroy();page.signedOut();root.replaceChildren(); } };
}
