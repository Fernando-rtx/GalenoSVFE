import RelacionControl from '../control/RelacionControl.js';
import RelacionPage from '../boundary/pages/RelacionPage.js';
import { createApiConfig, HttpClient, ClinicaService, RolService, TipoDocumentoService, TipoMedioContactoService, TipoExamenService, ConsultaService, ConsultaProcedimientoService, ConsultaProcedimientoPasoService, PersonaRolService, ProcedimientoService, PersonaService, DocumentoService, MedioContactoService, ExamenService, OrdenExamenService, ExamenResultadoService, ProcedimientoPasoService, ExamenTipoExamenService, ProcedimientoPasoExamenService, ProcedimientoPasoSecuenciaService, DefaultError } from '../index.js';
import { API_V2_ROUTES, API_V2_DASHBOARD_ROUTES } from '../config/api-v2-routes.js';
import ConsultaGestionControl from '../control/ConsultaGestionControl.js';
import ConsultaGestionPage from '../boundary/pages/ConsultaGestionPage.js';
import ProcedimientoControl from '../control/ProcedimientoControl.js';
import ProcedimientoPage from '../boundary/pages/ProcedimientoPage.js';
import OrdenControl from '../control/OrdenControl.js';
import OrdenPage from '../boundary/pages/OrdenPage.js';
import PersonaControl from '../control/PersonaControl.js';
import PersonaPage from '../boundary/pages/PersonaPage.js';
import CatalogoControl from '../control/CatalogoControl.js';
import CatalogoPage from '../boundary/pages/CatalogoPage.js';

function mountPage(container, tag, ...args) {
  const page = document.createElement(tag);
  page._mountArgs = args;
  container.append(page);
  return page;
}

/** Composición adicional dentro del dashboard; las credenciales viven solo en memoria. */
export function mountGestion({ config, dashboard: dashboardApp, defaultConfig, onSessionChange = () => {} }) {
  const root = document.querySelector('#gestion');
  const hint = document.createElement('p');hint.className='record-hint';hint.textContent='Doble clic en un registro para abrirlo. Con teclado, utiliza Enter o la barra espaciadora.';root.append(hint);
  const dashboard = document.querySelector('#main');
  const nav = document.querySelector('[data-navigation]');
  let control;
  let clinical;
  let clinicalPage;
  let orders;
  let ordersPage;
  const ordersRoot = document.querySelector('[data-ordenes]');
  let relations;
  let relationsPage;
  const relationsRoot=document.createElement("div");relationsRoot.hidden=true;root.append(relationsRoot);
  function openRelations(kind,parent){catalogRoot.hidden=true;personaRoot.hidden=true;flowRoot.hidden=true;relationsRoot.hidden=false;relations.open(kind,parent);}
  let flow;
  let flowPage;
  const flowRoot=document.createElement("div");flowRoot.hidden=true;root.append(flowRoot);
  let personaControl;
  let personaPage;
  const catalogRoot = document.createElement('div');catalogRoot.dataset.catalogos='';const personaRoot = document.createElement('div');personaRoot.hidden = true;personaRoot.dataset.personas = '';root.append(catalogRoot,personaRoot);
  function showModule(target) {
    flowRoot.hidden=true;relationsRoot.hidden=true;
    const persons = target === 'persona' && personaControl;
    catalogRoot.hidden = Boolean(persons);personaRoot.hidden = !persons;
    if (persons) { personaControl.load();return; }
    page.open(target);
  }
  const clinicalRoot = document.querySelector('[data-consulta-gestion]');
  async function disconnect() {
    ordersPage?.destroy();orders?.destroy();ordersRoot.hidden = true;
    clinicalPage?.destroy();clinical?.destroy();clinical = null;clinicalRoot.hidden = true;
    document.querySelector('[data-ui="startupStatus"]').textContent = 'Inicia sesión desde el menú de gestión para seleccionar tu clínica.';
    await dashboardApp.control.connect({ clinicaDAO: new ClinicaService({ config: defaultConfig }), consultaDAO: new ConsultaService({ config: defaultConfig }), autoLoad: Boolean(defaultConfig.baseUrl) });
  }
  let module = 'tipoDocumento';
  const page = mountPage(catalogRoot, 'galenos-catalogos', {
    onRelations(parent,kind) { if(kind==='examen'){openRelations('examenTipoExamen',parent);return;}if(!flow)return;catalogRoot.hidden=true;personaRoot.hidden=true;flowRoot.hidden=false;flow.open(parent); },
    async onLogin(username, password) {
      if (!config?.baseUrl) throw DefaultError.validation('Configura la URL del entorno de gestión.');
      if (!username || username.includes(':')) throw DefaultError.validation('Usuario inválido.');
      const bytes = new TextEncoder().encode(`${username}:${password}`);
      const authorization = `Basic ${btoa(String.fromCharCode(...bytes))}`;
      const api = createApiConfig({ ...config, routes: API_V2_ROUTES, http: { headers: { Authorization: authorization } } });
      const context = await new HttpClient({ resource: 'contexto', config: api }).get();
      document.querySelector('[data-ui="startupStatus"]').textContent = '';
      control?.destroy();
      control = new CatalogoControl({ contexto: context.datos, module: module === 'persona' ? 'tipoDocumento' : module, daos: {
        clinica: new ClinicaService({ config: api }), rol: new RolService({ config: api }),
        tipoDocumento: new TipoDocumentoService({ config: api }), tipoMedioContacto: new TipoMedioContactoService({ config: api }),
        tipoExamen: new TipoExamenService({ config: api }), examen: new ExamenService({ config: api }), procedimiento: new ProcedimientoService({ config: api })
      } });
      page.connect(control);
      onSessionChange(context.datos);
      clinicalPage?.destroy();clinical?.destroy();
      const dashboardConfig = createApiConfig({ ...api, routes: API_V2_DASHBOARD_ROUTES });
      await dashboardApp.control.connect({ clinicaDAO: new ClinicaService({ config: dashboardConfig }), consultaDAO: new ConsultaService({ config: api }) });
      clinical = new ConsultaGestionControl({ dashboard: dashboardApp.control, contexto: context.datos,
        consultaDAO: new ConsultaService({ config: api }), asociacionDAO: new ConsultaProcedimientoService({ config: api }),
        pasoDAO: new ConsultaProcedimientoPasoService({ config: api }), pacienteDAO: new PersonaRolService({ config: api }), procedimientoDAO: new ProcedimientoService({ config: api }) });
      ordersPage?.destroy();orders?.destroy();
      orders = new OrdenControl({ dashboard: dashboardApp.control, contexto: context.datos, ordenDAO: new OrdenExamenService({config:api}), resultadoDAO: new ExamenResultadoService({config:api}) });
      ordersPage = mountPage(ordersRoot, 'galenos-ordenes', orders);
      clinicalPage = mountPage(clinicalRoot, 'galenos-consulta-gestion', clinical, {onOrders: paso => orders.open(paso)});clinicalRoot.hidden = false;
      personaPage?.destroy();personaControl?.destroy();
      personaControl = new PersonaControl({ contexto: context.datos, daos: {
        persona: new PersonaService({ config: api }), documento: new DocumentoService({ config: api }), medioContacto: new MedioContactoService({ config: api }),
        personaRol: new PersonaRolService({ config: api }), tipoDocumento: new TipoDocumentoService({ config: api }), tipoMedioContacto: new TipoMedioContactoService({ config: api }),
        rol: new RolService({ config: api }), clinica: new ClinicaService({ config: api })
      } });personaPage = mountPage(personaRoot, 'galenos-personas', personaControl);
      flowPage?.destroy();flow?.destroy();flow=new ProcedimientoControl({pasoDAO:new ProcedimientoPasoService({config:api}),rolDAO:new RolService({config:api}),examenDAO:new ExamenService({config:api}),contexto:context.datos});flowPage=mountPage(flowRoot, 'galenos-procedimientos', flow,()=>showModule('procedimiento'),openRelations);
      relationsPage?.destroy();relations?.destroy();relations=new RelacionControl({contexto:context.datos,daos:{examenTipoExamen:new ExamenTipoExamenService({config:api}),procedimientoPasoExamen:new ProcedimientoPasoExamenService({config:api}),procedimientoPasoSecuencia:new ProcedimientoPasoSecuenciaService({config:api}),tipoExamen:new TipoExamenService({config:api}),examen:new ExamenService({config:api}),procedimientoPaso:new ProcedimientoPasoService({config:api})}});relationsPage=mountPage(relationsRoot, 'galenos-relaciones', relations,()=>{relationsRoot.hidden=true;if(relations.state.kind==='examenTipoExamen')showModule('examen');else{flowRoot.hidden=false;flow.load();}});
      showModule(module);
    },
    onLogout() { if(clinical?.state.writing || personaControl?.state.writing || orders?.state.writing || flow?.state.writing || relations?.state.writing)return; control?.destroy();control = null;personaPage?.destroy();personaControl?.destroy();personaControl = null;flowPage?.destroy();flow?.destroy();flow=null;flowRoot.hidden=true;relationsPage?.destroy();relations?.destroy();relations=null;relationsRoot.hidden=true;personaRoot.hidden = true;catalogRoot.hidden = false;page.signedOut();onSessionChange(null);disconnect(); }
  });
  function navigate(event, updateHistory = true) {
    const anchor = event.target.closest('a');
    if (!anchor || (!anchor.dataset.module && anchor.getAttribute('href') !== '#main')) return;
    event.preventDefault();
    if (control?.state.writing || clinical?.state.writing || personaControl?.state.writing || orders?.state.writing || flow?.state.writing || relations?.state.writing) { page.error(DefaultError.validation('Espera a que termine el guardado.'));return; }
    if (updateHistory && location.hash !== anchor.getAttribute('href')) history.pushState(null,'',anchor.getAttribute('href'));
    const isDashboard = !anchor.dataset.module;
    dashboard.hidden = !isDashboard;root.hidden = isDashboard;
    nav.querySelectorAll('a').forEach(link => { link.classList.toggle('nav-current', link.getAttribute('href') === anchor.getAttribute('href'));if (link.getAttribute('href') === anchor.getAttribute('href')) link.setAttribute('aria-current', 'page');else link.removeAttribute('aria-current'); });
    if (!isDashboard) { module = anchor.dataset.module;showModule(module); }
    (isDashboard ? dashboard : root).focus();
  }
  const brand = document.querySelector('.brand');
  brand?.addEventListener('click',navigate);
  nav.addEventListener('click', navigate);
  function openHash() {
    const anchor = Array.from(nav.querySelectorAll('a')).find(a => a.getAttribute('href') === location.hash)
      || nav.querySelector('a[href="#main"]');
    if (anchor) navigate({ target: anchor, preventDefault() {} }, false);
  }
  window.addEventListener('hashchange',openHash);
  window.addEventListener('popstate',openHash);
  openHash();
  return { openSession() { nav.querySelector('[data-module="rol"]').click(); (control ? page.logout : page.login.elements.usuario).focus(); }, destroy() { brand?.removeEventListener('click',navigate);nav.removeEventListener('click', navigate);window.removeEventListener('hashchange',openHash);window.removeEventListener('popstate',openHash);control?.destroy();clinicalPage?.destroy();clinical?.destroy();personaPage?.destroy();personaControl?.destroy();ordersPage?.destroy();orders?.destroy();flowPage?.destroy();flow?.destroy();relationsPage?.destroy();relations?.destroy();page.signedOut();root.replaceChildren(); } };
}
