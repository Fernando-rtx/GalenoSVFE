// Solo recursos públicos del shell. Ninguna ruta REST se guarda en Cache Storage.
const CACHE = 'galenossv-shell-v2';
const PREFIX = 'galenossv-shell-';
const ASSETS = new Set(["/", "/js/app/appearance.js", "/js/app/dashboard.js", "/js/app/gestion.js", "/js/app/main.js", "/js/app/notifications.js", "/js/app/pwa.js", "/js/boundary/components/galenos-notifications.js", "/js/boundary/components/tarjeta_consulta.js", "/js/boundary/components/tarjeta_simple.js", "/js/boundary/editable-record.js", "/js/boundary/format-utc-date.js", "/js/boundary/pages/CatalogoPage.js", "/js/boundary/pages/ConsultaGestionPage.js", "/js/boundary/pages/DashboardPage.js", "/js/boundary/pages/OrdenPage.js", "/js/boundary/pages/PersonaPage.js", "/js/boundary/pages/ProcedimientoPage.js", "/js/boundary/pages/RelacionPage.js", "/js/boundary/pages/dashboard-presentation.js", "/js/config/api-config.js", "/js/config/api-routes.js", "/js/config/api-v2-routes.js", "/js/config/environment.example.js", "/js/control/CatalogoControl.js", "/js/control/ConsultaGestionControl.js", "/js/control/DashboardControl.js", "/js/control/DefaultDAO.js", "/js/control/OrdenControl.js", "/js/control/PersonaControl.js", "/js/control/ProcedimientoControl.js", "/js/control/RelacionControl.js", "/js/control/dao/ClinicaDAO.js", "/js/control/dao/ConsultaDAO.js", "/js/control/dao/ConsultaProcedimientoDAO.js", "/js/control/dao/ConsultaProcedimientoPasoDAO.js", "/js/control/dao/DocumentoDAO.js", "/js/control/dao/ExamenDAO.js", "/js/control/dao/ExamenResultadoDAO.js", "/js/control/dao/ExamenTipoExamenDAO.js", "/js/control/dao/MedioContactoDAO.js", "/js/control/dao/OrdenExamenDAO.js", "/js/control/dao/PersonaDAO.js", "/js/control/dao/PersonaRolDAO.js", "/js/control/dao/ProcedimientoDAO.js", "/js/control/dao/ProcedimientoPasoDAO.js", "/js/control/dao/ProcedimientoPasoExamenDAO.js", "/js/control/dao/ProcedimientoPasoSecuenciaDAO.js", "/js/control/dao/RolDAO.js", "/js/control/dao/TipoDocumentoDAO.js", "/js/control/dao/TipoExamenDAO.js", "/js/control/dao/TipoMedioContactoDAO.js", "/js/control/query-parameters.js", "/js/control/rest-validators.js", "/js/entity/DefaultError.js", "/js/entity/DefaultResponse.js", "/js/index.js", "/js/services/ClinicaService.js", "/js/services/ConsultaProcedimientoPasoService.js", "/js/services/ConsultaProcedimientoService.js", "/js/services/ConsultaService.js", "/js/services/DocumentoService.js", "/js/services/ExamenResultadoService.js", "/js/services/ExamenService.js", "/js/services/ExamenTipoExamenService.js", "/js/services/MedioContactoService.js", "/js/services/OrdenExamenService.js", "/js/services/PersonaRolService.js", "/js/services/PersonaService.js", "/js/services/ProcedimientoPasoExamenService.js", "/js/services/ProcedimientoPasoSecuenciaService.js", "/js/services/ProcedimientoPasoService.js", "/js/services/ProcedimientoService.js", "/js/services/RolService.js", "/js/services/TipoDocumentoService.js", "/js/services/TipoExamenService.js", "/js/services/TipoMedioContactoService.js", "/js/transport/HttpClient.js", "/manifest.webmanifest", "/resources/estilos/dashboard.css", "/resources/estilos/galenos.css", "/resources/estilos/gestion.css", "/resources/estilos/tarjeta.css", "/resources/estilos/tarjeta_consulta.css", "/resources/imagenes/galenos-sv-logo.png", "/resources/imagenes/icon-192.png", "/resources/imagenes/icon-512.png", "/resources/scripts/tema.js"]);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...ASSETS])));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('Authorization')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.search) return;
  const path = request.mode === 'navigate' ? '/' : url.pathname;
  if (!ASSETS.has(path)) return;
  event.respondWith(fetch(request).then(response => {
    const policy = response.headers?.get('Cache-Control') || '';
    if (response.ok && response.type === 'basic' && !/\b(?:private|no-store)\b/i.test(policy) && !response.headers?.has('Set-Cookie')) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(path, copy)));
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(path);
    if (cached) return cached;
    throw new Error('Sin conexión para este recurso');
  }));
});
