# GalenoSVFE

Aplicación académica local con datos ficticios. Abre el dashboard sin iniciar
sesión. Arranca Liberty y el frontend con la
[guía de desarrollo local](docs/desarrollo-local.md).


Frontend nativo de GalenosSV para la gestión clínica. Usa JavaScript con módulos ES, Web Components, Fetch API, Boundary–Control–Entity y contratos REST publicados en `docs/api-contract.md`.

## Estructura

```text
src/js/
├── boundary/
│   ├── components/  # Custom Elements reutilizables
│   ├── modelos/     # Pantallas y presentación
│   └── *.js         # Composición de vistas
├── control/         # Controles, Services HTTP, transporte y configuración API
├── entity/          # Respuesta y errores del cliente
└── main.js          # Punto de entrada
```

El flujo típico es `ConsultaModel → DashboardControl → ConsultaService → DefaultService → REST`. Boundary presenta estado y emite eventos; Control coordina operaciones y estado; Services concretos declaran recursos REST; DefaultService valida contratos y centraliza Fetch, paginación, errores, cancelación y timeout; Entity representa errores y respuestas del cliente.

Los 20 Services están en `src/js/control/`. No hay alias DAO del frontend. Los DAO Java del backend y las relaciones clínicas no se modifican. Las clases consumen únicamente rutas y propiedades declaradas por los contratos publicados.

## PWA

`src/manifest.webmanifest` define la identidad instalable. `src/service-worker.js` precarga una lista cerrada de recursos públicos del shell y usa caché como respaldo offline. No almacena respuestas REST, credenciales ni datos clínicos. Las operaciones clínicas requieren conexión.

## Desarrollo y pruebas

```bash
npm ci
npm run dev
npm run check
npm test
npm run test:transport
python test/browser/webcomponents_pwa.py
```

Las pruebas HTTP usan un servidor sintético local; no equivalen a integrar contra Galenos. Las pruebas de navegador usan Chromium y fixtures ficticios. Para un backend real, sigue la configuración segura documentada en `docs/demo-setup.md`; no uses datos clínicos reales para pruebas destructivas.

Más detalles: [arquitectura del frontend](docs/arquitectura-frontend.md), [contrato API](docs/api-contract.md), [PWA y Web Components](docs/webcomponents-browser-pwa.md).
