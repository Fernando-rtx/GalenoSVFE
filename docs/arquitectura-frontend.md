# Arquitectura del frontend GalenosSV

## Organización

- **Boundary** (`src/js/boundary/`): Custom Elements visuales, componentes reutilizables, modelos de pantalla y composición de vistas. No consulta la API.
- **Control** (`src/js/control/`): controles que administran estado y coordinan servicios, veinte Services REST y `DefaultService` como transporte común. La configuración de API y los contratos viven aquí porque son parte del acceso y coordinación con el backend.
- **Entity** (`src/js/entity/`): `DefaultResponse` y `DefaultError`, objetos del cliente que no dependen de DOM ni Fetch.
- **Arranque** (`src/js/main.js`): compone Boundary, registra capacidades PWA y monta controles.

## Flujo de consulta

`ConsultaGestionModel → DashboardControl → ConsultaService → DefaultService → REST`

La vista recibe estado desde Control, presenta los datos con `textContent` y emite eventos. Control aplica filtros y paginación, cancela lecturas obsoletas y coordina `ConsultaService`. El Service identifica el recurso sin repetir HTTP. DefaultService comprueba el contrato REST, construye URL y query, usa Fetch/AbortController, interpreta las cabeceras de total y distingue errores HTTP, de red y de respuesta.

## Componentes y navegación

Las pantallas son Custom Elements (`DashboardModel`, `CatalogoModel`, `ConsultaGestionModel`, `PersonaModel`, `ProcedimientoModel`, `OrdenModel`, `RelacionModel`). `connectedCallback` monta la vista; `disconnectedCallback` elimina listeners y suscripciones. Las tarjetas de Rodrigo mantienen su Shadow DOM y `consulta-seleccionada` compuesto. La notificación usa `galenos:notificacion` con `detail`, `bubbles` y `composed`. El hash y el historial coordinan navegación y retroceso.

## Services y contratos

Los veinte Services residen directamente en `src/js/control/`; cada uno selecciona su recurso y hereda la lógica común de `DefaultService`. Rutas, DTO y nombres JSON se mantienen según `docs/api-contract.md` y `docs/api-gestion-v2.md`. Los controles reciben Services mediante inyección. No se conservan alias DAO del frontend; el término DAO se reserva para persistencia backend.

## PWA

El manifiesto publica nombre, scope e iconos. El Service Worker mantiene una caché versionada de recursos públicos, red primero y caché como respaldo. Excluye rutas API y configuración local. No almacena respuestas REST privadas; sin conexión solo se abre el shell y las operaciones clínicas requieren backend.

## Pruebas

- `npm run check`: sintaxis JavaScript.
- `npm test`: Mocha/Chai/Sinon unitarias.
- `npm run test:transport`: Fetch nativo contra un servidor HTTP sintético local.
- `python test/browser/webcomponents_pwa.py`: Chromium para componentes, eventos, SPA, manifiesto y shell offline.
- `npm run test:integration`: backend de prueba configurado; no declarar integración si no se ejecutó.

El esquema PostgreSQL, los DAO Java y las reglas clínicas no forman parte de la capa frontend y no se cambian en esta refactorización.
