// Solo recursos públicos del shell. Ninguna ruta REST se guarda en Cache Storage.
const CACHE = 'galenossv-shell-v13';
const PREFIX = 'galenossv-shell-';
const ASSETS = new Set([
  '/js/boundary/language.js',
  '/js/boundary/components/galenos-academic-app.js',
  '/js/control/AcademicCareService.js',
  '/js/boundary/portal-academico.js',
  '/js/boundary/modelos/BusquedaCitasModel.js',
  '/js/boundary/modelos/InicioSesionModel.js',
  '/js/boundary/modelos/PortalAcademicoModel.js',
  '/js/control/IdentidadAcademicaService.js',
  '/js/control/CitasPacienteService.js',
  '/js/control/contexto-empleado.js',
  '/js/control/IdentificacionControl.js',
  '/js/control/BusquedaCitasControl.js',

  '/js/boundary/modelos/form-validation.js',
  '/',
  '/js/boundary/appearance.js',
  '/js/boundary/components/galenos-notifications.js',
  '/js/boundary/components/tarjeta_consulta.js',
  '/js/boundary/components/tarjeta_simple.js',
  '/js/boundary/dashboard.js',
  '/js/boundary/gestion.js',
  '/js/boundary/modelos/CatalogoModel.js',
  '/js/boundary/modelos/ConsultaGestionModel.js',
  '/js/boundary/modelos/DashboardModel.js',
  '/js/boundary/modelos/OrdenModel.js',
  '/js/boundary/modelos/PersonaModel.js',
  '/js/boundary/modelos/ProcedimientoModel.js',
  '/js/boundary/modelos/RelacionModel.js',
  '/js/boundary/modelos/dashboard-presentation.js',
  '/js/boundary/modelos/editable-record.js',
  '/js/boundary/modelos/format-utc-date.js',
  '/js/boundary/notifications.js',
  '/js/boundary/pwa.js',
  '/js/control/CatalogoControl.js',
  '/js/control/ClinicaService.js',
  '/js/control/ConsultaGestionControl.js',
  '/js/control/ConsultaProcedimientoPasoService.js',
  '/js/control/ConsultaProcedimientoService.js',
  '/js/control/ConsultaService.js',
  '/js/control/DashboardControl.js',
  '/js/control/DefaultService.js',
  '/js/control/DocumentoService.js',
  '/js/control/ExamenResultadoService.js',
  '/js/control/ExamenService.js',
  '/js/control/ExamenTipoExamenService.js',
  '/js/control/MedioContactoService.js',
  '/js/control/OrdenControl.js',
  '/js/control/OrdenExamenService.js',
  '/js/control/PersonaControl.js',
  '/js/control/PersonaRolService.js',
  '/js/control/PersonaService.js',
  '/js/control/ProcedimientoControl.js',
  '/js/control/ProcedimientoPasoExamenService.js',
  '/js/control/ProcedimientoPasoSecuenciaService.js',
  '/js/control/ProcedimientoPasoService.js',
  '/js/control/ProcedimientoService.js',
  '/js/control/RelacionControl.js',
  '/js/control/RolService.js',
  '/js/control/TipoDocumentoService.js',
  '/js/control/TipoExamenService.js',
  '/js/control/TipoMedioContactoService.js',
  '/js/control/api-config.js',
  '/js/control/api-routes.js',
  '/js/control/api-v2-routes.js',
  '/js/control/environment.example.js',
  '/js/control/query-parameters.js',
  '/js/control/rest-validators.js',
  '/js/entity/DefaultError.js',
  '/js/entity/DefaultResponse.js',
  '/js/index.js',
  '/js/main.js',
  '/manifest.webmanifest',
  '/resources/estilos/dashboard.css',
  '/resources/estilos/galenos.css',
  '/resources/estilos/gestion.css',
  '/resources/estilos/portal-academico.css',
  '/resources/estilos/tarjeta.css',
  '/resources/estilos/tarjeta_consulta.css',
  '/resources/imagenes/galenos-sv-logo.png',
  '/resources/imagenes/icon-192.png',
  '/resources/imagenes/icon-512.png',
  '/resources/scripts/tema.js',
]);
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([...ASSETS])));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith(PREFIX) && key !== CACHE)
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('Authorization')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.search) return;
  const path = request.mode === 'navigate' ? '/' : url.pathname;
  if (!ASSETS.has(path)) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        const policy = response.headers?.get('Cache-Control') || '';
        if (
          response.ok &&
          response.type === 'basic' &&
          !/\b(?:private|no-store)\b/i.test(policy) &&
          !response.headers?.has('Set-Cookie')
        ) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(path, copy)));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(path);
        if (cached) return cached;
        throw new Error('Sin conexión para este recurso');
      }),
  );
});
