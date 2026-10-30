import { createApiConfig, DefaultDAO, ClinicaDAO, RolDAO, TipoDocumentoDAO, TipoMedioContactoDAO, TipoExamenDAO, DefaultError } from '../index.js';
import { API_V2_ROUTES } from '../config/api-v2-routes.js';
import CatalogoControl from '../control/CatalogoControl.js';
import CatalogoPage from '../boundary/pages/CatalogoPage.js';

/** Composición adicional dentro del dashboard; las credenciales viven solo en memoria. */
export function mountGestion({ config }) {
  const root = document.querySelector('#gestion');
  const dashboard = document.querySelector('#main');
  const nav = document.querySelector('[data-navigation]');
  let control;
  let module = 'tipoDocumento';
  const page = new CatalogoPage(root, {
    async onLogin(username, password) {
      if (!config?.baseUrl) throw DefaultError.validation('Configura la URL del entorno de gestión.');
      if (!username || username.includes(':')) throw DefaultError.validation('Usuario inválido.');
      const bytes = new TextEncoder().encode(`${username}:${password}`);
      const authorization = `Basic ${btoa(String.fromCharCode(...bytes))}`;
      const api = createApiConfig({ ...config, routes: API_V2_ROUTES, http: { headers: { Authorization: authorization } } });
      const context = await new DefaultDAO({ resource: 'contexto', config: api }).get();
      control?.destroy();
      control = new CatalogoControl({ contexto: context.datos, module, daos: {
        clinica: new ClinicaDAO({ config: api }), rol: new RolDAO({ config: api }),
        tipoDocumento: new TipoDocumentoDAO({ config: api }), tipoMedioContacto: new TipoMedioContactoDAO({ config: api }),
        tipoExamen: new TipoExamenDAO({ config: api })
      } });
      page.connect(control);
      await control.load();
    },
    onLogout() { control?.destroy();control = null;page.signedOut(); }
  });
  function navigate(event) {
    const anchor = event.target.closest('a');
    if (!anchor || (!anchor.dataset.module && anchor.getAttribute('href') !== '#main')) return;
    event.preventDefault();
    if (control?.state.writing) { page.error(DefaultError.validation('Espera a que termine el guardado.'));return; }
    const isDashboard = !anchor.dataset.module;
    dashboard.hidden = !isDashboard;root.hidden = isDashboard;
    nav.querySelectorAll('a').forEach(link => { link.classList.toggle('nav-current', link === anchor);if (link === anchor) link.setAttribute('aria-current', 'page');else link.removeAttribute('aria-current'); });
    if (!isDashboard) { module = anchor.dataset.module;page.open(module); }
    (isDashboard ? dashboard : root).focus();
  }
  nav.addEventListener('click', navigate);
  return { destroy() { nav.removeEventListener('click', navigate);control?.destroy();page.signedOut();root.replaceChildren(); } };
}
