import RelacionControl from '../control/RelacionControl.js';
import RelacionModel from './modelos/RelacionModel.js';
import {
  ClinicaService,
  RolService,
  TipoDocumentoService,
  TipoMedioContactoService,
  TipoExamenService,
  ConsultaService,
  ConsultaProcedimientoService,
  ConsultaProcedimientoPasoService,
  PersonaRolService,
  ProcedimientoService,
  PersonaService,
  DocumentoService,
  MedioContactoService,
  ExamenService,
  OrdenExamenService,
  ExamenResultadoService,
  ProcedimientoPasoService,
  ExamenTipoExamenService,
  ProcedimientoPasoExamenService,
  ProcedimientoPasoSecuenciaService,
  DefaultError,
} from '../index.js';
import ConsultaGestionControl from '../control/ConsultaGestionControl.js';
import ConsultaGestionModel from './modelos/ConsultaGestionModel.js';
import ProcedimientoControl from '../control/ProcedimientoControl.js';
import ProcedimientoModel from './modelos/ProcedimientoModel.js';
import OrdenControl from '../control/OrdenControl.js';
import OrdenModel from './modelos/OrdenModel.js';
import PersonaControl from '../control/PersonaControl.js';
import PersonaModel from './modelos/PersonaModel.js';
import CatalogoControl from '../control/CatalogoControl.js';
import CatalogoModel from './modelos/CatalogoModel.js';

function mountPage(container, tag, ...args) {
  const page = document.createElement(tag);
  page._mountArgs = args;
  container.append(page);
  return page;
}

/** Compone los módulos de gestión del dashboard académico. */
export function mountGestion({ config: api, dashboard: dashboardApp }) {
  const root = document.querySelector('#gestion');
  const hint = document.createElement('p');
  hint.className = 'record-hint';
  hint.textContent =
    'Doble clic en un registro para abrirlo. Con teclado, utiliza Enter o la barra espaciadora.';
  root.append(hint);
  const dashboard = document.querySelector('#main');
  const nav = document.querySelector('[data-navigation]');
  const ordersRoot = document.querySelector('[data-ordenes]');
  const relationsRoot = document.createElement('div');
  relationsRoot.hidden = true;
  root.append(relationsRoot);
  function openRelations(kind, parent) {
    catalogRoot.hidden = true;
    personaRoot.hidden = true;
    flowRoot.hidden = true;
    relationsRoot.hidden = false;
    relations.open(kind, parent);
  }
  const flowRoot = document.createElement('div');
  flowRoot.hidden = true;
  root.append(flowRoot);
  const catalogRoot = document.createElement('div');
  catalogRoot.dataset.catalogos = '';
  const personaRoot = document.createElement('div');
  personaRoot.hidden = true;
  personaRoot.dataset.personas = '';
  root.append(catalogRoot, personaRoot);
  function showModule(target) {
    flowRoot.hidden = true;
    relationsRoot.hidden = true;
    const persons = target === 'persona';
    catalogRoot.hidden = persons;
    personaRoot.hidden = !persons;
    if (persons) {
      personaControl.load();
      return;
    }
    page.open(target);
  }
  const clinicalRoot = document.querySelector('[data-consulta-gestion]');
  const page = mountPage(catalogRoot, 'galenos-catalogos', {
    onRelations(parent, kind) {
      if (kind === 'examen') {
        openRelations('examenTipoExamen', parent);
        return;
      }
      catalogRoot.hidden = true;
      personaRoot.hidden = true;
      flowRoot.hidden = false;
      flow.open(parent);
    },
  });
  const control = new CatalogoControl({
    services: {
      clinica: new ClinicaService({ config: api }),
      rol: new RolService({ config: api }),
      tipoDocumento: new TipoDocumentoService({ config: api }),
      tipoMedioContacto: new TipoMedioContactoService({ config: api }),
      tipoExamen: new TipoExamenService({ config: api }),
      examen: new ExamenService({ config: api }),
      procedimiento: new ProcedimientoService({ config: api }),
    },
  });
  page.connect(control);
  const clinical = new ConsultaGestionControl({
    dashboard: dashboardApp.control,
    consultaService: new ConsultaService({ config: api }),
    asociacionService: new ConsultaProcedimientoService({ config: api }),
    pasoService: new ConsultaProcedimientoPasoService({ config: api }),
    pacienteService: new PersonaRolService({ config: api }),
    procedimientoService: new ProcedimientoService({ config: api }),
  });
  const orders = new OrdenControl({
    dashboard: dashboardApp.control,
    ordenService: new OrdenExamenService({ config: api }),
    resultadoService: new ExamenResultadoService({ config: api }),
  });
  const ordersPage = mountPage(ordersRoot, 'galenos-ordenes', orders);
  const clinicalPage = mountPage(clinicalRoot, 'galenos-consulta-gestion', clinical, {
    onOrders: (paso) => orders.open(paso),
  });
  clinicalRoot.hidden = false;
  const personaControl = new PersonaControl({
    services: {
      persona: new PersonaService({ config: api }),
      documento: new DocumentoService({ config: api }),
      medioContacto: new MedioContactoService({ config: api }),
      personaRol: new PersonaRolService({ config: api }),
      tipoDocumento: new TipoDocumentoService({ config: api }),
      tipoMedioContacto: new TipoMedioContactoService({ config: api }),
      rol: new RolService({ config: api }),
      clinica: new ClinicaService({ config: api }),
    },
  });
  const personaPage = mountPage(personaRoot, 'galenos-personas', personaControl);
  const flow = new ProcedimientoControl({
    pasoService: new ProcedimientoPasoService({ config: api }),
    rolService: new RolService({ config: api }),
    examenService: new ExamenService({ config: api }),
  });
  const flowPage = mountPage(
    flowRoot,
    'galenos-procedimientos',
    flow,
    () => showModule('procedimiento'),
    openRelations,
  );
  const relations = new RelacionControl({
    services: {
      examenTipoExamen: new ExamenTipoExamenService({ config: api }),
      procedimientoPasoExamen: new ProcedimientoPasoExamenService({ config: api }),
      procedimientoPasoSecuencia: new ProcedimientoPasoSecuenciaService({ config: api }),
      tipoExamen: new TipoExamenService({ config: api }),
      examen: new ExamenService({ config: api }),
      procedimientoPaso: new ProcedimientoPasoService({ config: api }),
    },
  });
  const relationsPage = mountPage(relationsRoot, 'galenos-relaciones', relations, () => {
    relationsRoot.hidden = true;
    if (relations.state.kind === 'examenTipoExamen') showModule('examen');
    else {
      flowRoot.hidden = false;
      flow.load();
    }
  });
  function navigate(event, updateHistory = true) {
    const anchor = event.target.closest('a');
    if (
      !anchor ||
      (!anchor.dataset.module && !['#main', '#atencion'].includes(anchor.getAttribute('href')))
    )
      return;
    event.preventDefault();
    if (
      control?.state.writing ||
      clinical?.state.writing ||
      personaControl?.state.writing ||
      orders?.state.writing ||
      flow?.state.writing ||
      relations?.state.writing
    ) {
      page.error(DefaultError.validation('Espera a que termine el guardado.'));
      return;
    }
    if (updateHistory && location.hash !== anchor.getAttribute('href'))
      history.pushState(null, '', anchor.getAttribute('href'));
    const isDashboard = !anchor.dataset.module;
    const isClinical = anchor.getAttribute('href') === '#atencion';
    document.querySelector('[data-workspace-title]').textContent = isClinical
      ? 'Atención clínica'
      : 'Consultas';
    document.querySelector('[data-workspace-subtitle]').textContent = isClinical
      ? 'Selecciona una consulta para revisar procedimientos, actividades, órdenes y resultados.'
      : 'Consulta los registros de tu clínica de trabajo.';
    document.querySelector('[data-workspace-hint]').textContent = isClinical
      ? 'Selecciona una tarjeta para consultar el seguimiento de la atención.'
      : 'Selecciona una tarjeta para consultar su detalle.';
    document.title = `${isClinical ? 'Atención clínica' : 'Consultas'} · GalenosSV`;
    dashboard.hidden = !isDashboard;
    root.hidden = isDashboard;
    nav.querySelectorAll('a').forEach((link) => {
      link.classList.toggle(
        'nav-current',
        link.getAttribute('href') === anchor.getAttribute('href'),
      );
      if (link.getAttribute('href') === anchor.getAttribute('href'))
        link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (!isDashboard) {
      showModule(anchor.dataset.module);
    }
    (isDashboard ? dashboard : root).focus();
  }
  const brand = document.querySelector('.brand');
  brand?.addEventListener('click', navigate);
  nav.addEventListener('click', navigate);
  function openHash() {
    const anchor =
      Array.from(nav.querySelectorAll('a')).find((a) => a.getAttribute('href') === location.hash) ||
      nav.querySelector('a[href="#main"]');
    if (anchor) navigate({ target: anchor, preventDefault() {} }, false);
  }
  window.addEventListener('hashchange', openHash);
  window.addEventListener('popstate', openHash);
  openHash();
  return {
    destroy() {
      brand?.removeEventListener('click', navigate);
      nav.removeEventListener('click', navigate);
      window.removeEventListener('hashchange', openHash);
      window.removeEventListener('popstate', openHash);
      control?.destroy();
      clinicalPage?.destroy();
      clinical?.destroy();
      personaPage?.destroy();
      personaControl?.destroy();
      ordersPage?.destroy();
      orders?.destroy();
      flowPage?.destroy();
      flow?.destroy();
      relationsPage?.destroy();
      relations?.destroy();
      root.replaceChildren();
    },
  };
}
