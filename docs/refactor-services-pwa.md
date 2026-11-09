# Refactorización incremental de frontend

## Base e integración

La rama `refactor/frontend-services-webcomponents-pwa` parte de `origin/main` en `fadb3aac9cd7d876cec22a1cc716dd9749281ca1`. `origin/cortez` (`93d9554`) no tiene commits únicos frente a `main`; las tarjetas de Rodrigo permanecen en la aplicación. El backend `Galenos` continúa en `0afe6f266606ce04da7374a131088cdc9b52140d`. La revisión de ramas mostró un commit único de integración en `Cortez`, otro en `feature/rodrigo`, y cero en `feature/rodrigo-completar-procedimientos`; las diferencias directas con el main actual incluyen supresiones extensas y no se mezclaron. No se modificaron sus DAO Java, contratos ni PostgreSQL.

## Arquitectura

Antes, `src/js/control/DefaultDAO.js` mezclaba el nombre de acceso a datos con transporte HTTP, y los clientes concretos vivían en `control/dao/`. Ahora `src/js/transport/HttpClient.js` mantiene Fetch, contratos, validación, paginación, cancelación y normalización de errores. Los veinte clientes REST de `src/js/services/` declaran únicamente el recurso que consumen. `src/js/control/` conserva la coordinación y los controles reciben servicios inyectados. `boundary/` presenta datos y eventos. `entity/` conserva los DTO de respuesta y error.

Las rutas, nombres JSON y reglas de autorización no cambiaron. `src/js/index.js` exporta los nombres `Service`. Los módulos `control/dao/*DAO.js` y `control/DefaultDAO.js` son alias temporales para consumidores externos y pruebas existentes. En código nuevo se importa, por ejemplo, `ClinicaService` desde `src/js/index.js` o `src/js/services/ClinicaService.js`.

## Componentes, eventos y navegación

`tarjeta-simple` y `tarjeta-consulta` se conservan. `galenos-notifications` escucha `galenos:notificacion` en `document`; el detalle contiene `{ tipo, mensaje }` y el emisor usa `bubbles` y `composed` para atravesar Shadow DOM. Acepta error, información, confirmación y advertencia, evita mensajes duplicados y permite cerrar avisos. Las páginas mantienen mensajes de estado locales. La navegación por hash usa `history.pushState` y atiende `popstate` y `hashchange`; el estado clínico permanece en memoria durante la navegación.

## PWA

`src/manifest.webmanifest` identifica GalenosSV e incluye iconos derivados del logo. `src/js/app/pwa.js` escucha `beforeinstallprompt` antes de la inicialización asíncrona, registra el Service Worker en contexto seguro y muestra aviso de actualización. El botón aparece solo si el navegador entrega un evento de instalación. Se ofrecen instrucciones manuales en el pie de página.

`src/service-worker.js` precarga una lista cerrada de archivos públicos de la interfaz. Usa red primero y caché como respaldo; al activarse elimina cachés anteriores con prefijo de GalenosSV. Solo intercepta GET del mismo origen cuya ruta esté en la lista. Omite peticiones con `Authorization`; ninguna ruta REST ni configuración local está en la lista. Al quedar offline, la interfaz puede abrirse tras una instalación exitosa del worker, pero las operaciones clínicas requieren conexión y no se presentan datos como actualizados.

La versión `galenossv-shell-v1` debe incrementarse al publicar cambios en recursos precargados. La instalación real y el comportamiento offline requieren verificación en un navegador compatible servido por HTTPS o localhost; las pruebas de Node no certifican esos flujos.

## Pruebas y límites

La línea base fue `npm run check` (79 archivos válidos), `npm test` (420 correctas), y `npm run test:transport` (necesita permiso para abrir `127.0.0.1`; dentro del sandbox falla con EPERM). Tras los cambios: `npm run check` validó 105 archivos, `npm test` pasó 422 pruebas y `npm run test:transport` pasó 9. BrowserSync sirvió por HTTP el shell, manifiesto, Service Worker, módulo de registro y ambos iconos con estado 200. Las pruebas HTTP usan un servidor local sintético, no el backend clínico. No se ejecutaron escrituras sobre `clinica`.

Las páginas administrativas siguen siendo clases de presentación convencionales. Convertirlas integralmente en Custom Elements requiere migración y pruebas de navegador de cada flujo; no se afirma completada aquí. Tampoco se añadieron funciones clínicas nuevas sin requisitos académicos y reglas de negocio confirmadas.
