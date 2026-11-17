# Migración de páginas a Custom Elements

La rama `refactor/webcomponents-browser-pwa` parte de `origin/main` en `6f66e029a28a6a4982c4116f844ad084029dd2ec`. Mantiene Boundary–Control–Service–Transport–Entity y los contratos REST publicados. No cambia los DAO Java, el esquema PostgreSQL ni las reglas clínicas.

## Componentes

Las siete páginas son Custom Elements de DOM ligero: `galenos-dashboard`, `galenos-catalogos`, `galenos-consulta-gestion`, `galenos-ordenes`, `galenos-personas`, `galenos-procedimientos` y `galenos-relaciones`. El DOM ligero conserva selectores, estilos y formularios existentes. `tarjeta-consulta` de Rodrigo mantiene Shadow DOM, slots y el evento compuesto `consulta-seleccionada`.

`mountPage` configura los argumentos antes de añadir cada elemento. `connectedCallback` monta la página y suscribe el Control; `disconnectedCallback` limpia suscripciones y listeners. `galenos-dashboard` ya está en el HTML inicial y se monta después de registrar el elemento. Las páginas no llaman a Fetch ni contienen rutas REST. Se renombraron propiedades internas como `title`, `children` y `role` para evitar colisiones con propiedades nativas de `HTMLElement`.

La navegación por hash conserva las vistas al avanzar y retroceder. Un regreso a la URL sin hash muestra el dashboard sin crear una nueva entrada en el historial. Las notificaciones utilizan `galenos:notificacion` con `bubbles` y `composed`; Chromium verificó propagación desde un Shadow Root, deduplicación y cierre.

## Pruebas reales

Para ejecutar las pruebas de navegador, inicia `npm run dev` y ejecuta `python test/browser/webcomponents_pwa.py` con Playwright 1.55.0 y Chromium instalados en un entorno temporal. La prueba usa fixtures sintéticos, comprueba la tarjeta, los seis componentes de gestión, navegación, eventos, manifiesto, Service Worker, caché y shell offline. El resultado se guarda en `test/evidence/webcomponents-pwa.json`.

Chromium informó cero errores de manifiesto e instalabilidad. Se probaron también modo oscuro y ancho móvil de 390 px sin desbordamiento. El botón de instalación no apareció en sesiones de Chromium headless ni visible con perfil temporal, por lo que no se pudo aceptar un diálogo nativo de instalación. El Service Worker creó `galenossv-shell-v2`; offline abrió la interfaz. Una respuesta clínica sintética de `/api/synthetic-patients` no apareció en Cache Storage. La prueba no acredita la aceptación del diálogo nativo de instalación: Playwright en modo headless no opera el diálogo del navegador. Ese paso requiere una comprobación manual en Chrome o Safari compatible.

El backend local disponible apunta a `clinica`, por lo que no se ejecutaron pruebas de escritura ni se presentó como entorno aislado. `npm run test:transport` verifica Fetch nativo con servidor HTTP sintético; no sustituye una integración con backend aislado. Para esa prueba pendiente hace falta un despliegue de GalenosSV y base separados con datos ficticios y credenciales de prueba.

## Runner vigente tras la revisión final GT02

`npm run test:browser` usa `test/browser/webcomponents-pwa.mjs`, un servidor temporal y fixtures sintéticos. `webcomponents_pwa.py` delega en ese runner para conservar el comando sin duplicar recorridos. Los fixtures actuales usan el marcado real de la SPA y montan gestión dentro de su contenedor. Ninguna prueba sintética acredita persistencia PostgreSQL.

Con Playwright1.62.1 externo instalado en `/tmp/galenos-browser-tools`, ejecutar:

```sh
PLAYWRIGHT_MODULE=/tmp/galenos-browser-tools/node_modules/playwright npm run test:browser
PLAYWRIGHT_MODULE=/tmp/galenos-browser-tools/node_modules/playwright node test/browser/offline-shell.mjs
npm run test:coverage
```

El primer comando genera `coverage/browser/resultado.json`, capturas, ratios de contraste y medición V8 de funciones del navegador. El segundo prueba arranque frío con servidor realmente detenido. El informe unitario no suma porcentajes con Chromium y comprueba los hashes de las fuentes. Manifest y prompt automatizados no sustituyen la evidencia manual de instalar y abrir la aplicación. El usuario confirmó esa instalación; adjuntar captura/navegador/origen/commit a la entrega.

Dependencias de desarrollo: Node>=22.12.0, herramientas principales conservadas. Los overrides glob14.0.6/minimatch11.0.9 se limitan a Mocha y fueron validados con descubrimiento TDD, transporte y cobertura; follow-redirects1.16.3 corrige la alerta de BrowserSync. `npm audit` quedó sin alertas en esta revisión.
