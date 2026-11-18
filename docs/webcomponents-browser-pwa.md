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

## Botón de instalación según el navegador (17/11/2026)

El diálogo de ticket ofrece «Instalar app» y reutiliza `requestInstallation()` de `pwa.js`. Si existe un evento `beforeinstallprompt` disponible, el clic llama a su `prompt()` sin perder la activación del usuario. El aviso se consume una sola vez, se distingue cancelación de aceptación y `appinstalled` confirma que ya se instaló durante esta sesión. No se descarga un instalador ejecutable ni se considera instalada solo por mostrar el diálogo.

Safari no implementa ese aviso programático. En Safari para Mac, seleccionar **Archivo → Añadir al Dock…**, o **Compartir → Añadir al Dock**, y confirmar **Añadir**. En iPhone/iPad, Safari, Chrome y Firefox permiten usar **Compartir → Añadir a pantalla de inicio → Añadir**; el mensaje identifica el navegador y dónde está Compartir. El botón explica el camino correspondiente; no puede activar menús del navegador desde JavaScript. Chrome/Edge solo mostrarán el aviso del botón si el navegador lo ha habilitado. Una sesión en pestaña tampoco permite detectar universalmente otras instalaciones anteriores.

Referencias: [Apple: usar apps web de Safari en Mac](https://support.apple.com/es-es/104996), [MDN: BeforeInstallPromptEvent](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent).

Verificación: 423 pruebas unitarias, 9 de transporte, 126 archivos con sintaxis válida y 8 fixtures Chromium aprobados. `instalacion_pwa.html` comprueba aviso único, cancelación, confirmación, instrucciones de Mac/iPhone/iPad y PDF independiente. Un clic real de Playwright mantuvo la activación de usuario al llamar al prompt simulado. El arranque offline con servidor aislado detenido también pasó. Son pruebas de la integración del botón, no una instalación real ni una prueba ejecutada en Safari; la aceptación nativa queda a cargo del usuario. La corrección original se distribuyó con shell v42. Para la entrega definitiva, el shell efectivo es v46 e incluye el modal encapsulado en `galenos-ticket-options`. La activación retira las versiones previas del shell. No se cambió backend ni PostgreSQL.

La ayuda detecta Safari, Chrome y Firefox por `userAgent`, y distingue Android, Windows, Mac e iPhone/iPad (incluido iPad con identificación de escritorio). La detección solo selecciona textos: no cambia permisos ni sustituye la disponibilidad real del aviso nativo. Edge/Opera no se etiquetan como Chrome y los navegadores desconocidos conservan ayuda general.

- Safari Mac: Archivo → Añadir al Dock; iPhone/iPad: Compartir → Añadir a pantalla de inicio.
- Chrome escritorio: menú ⋮ → Enviar, guardar y compartir → Instalar página como aplicación; Android: Instalar y crear acceso directo → Instalar; iOS: Compartir → Añadir a pantalla de inicio.
- Firefox Windows: icono de apps web en la barra de direcciones, en versiones compatibles; si falta se indica actualizar y salir de navegación privada. Android: menú ⋮ → Instalar. iOS: Compartir → Añadir a pantalla de inicio. En Mac/Linux se explica la falta de instalación nativa y cómo instalar usando Safari/Chrome, conservando la opción de seguir en Firefox.

Los textos y sus traducciones están en los módulos existentes. Las pruebas del fixture verifican las diferencias reales entre plataformas, la identificación de Chrome/Firefox en iOS, el iPad con UA de Mac y que Chrome no se confunda con Safari o Edge. Son identificaciones simuladas; la aceptación de la instalación en cada navegador requiere una comprobación manual.

Fuentes de las instrucciones: [Chrome escritorio](https://support.google.com/chrome/answer/9658361?hl=es&co=GENIE.Platform%3DDesktop), [Chrome Android](https://support.google.com/chrome/answer/9658361?hl=es&co=GENIE.Platform%3DAndroid), [Chrome iOS](https://support.google.com/chrome/answer/9658361?hl=en&co=GENIE.Platform%3DiOS), [Firefox Windows y límites de plataforma](https://support.mozilla.org/en-US/kb/web-apps-firefox-windows), [Firefox Android](https://support.mozilla.org/en-US/kb/use-web-apps-firefox-android), [Firefox iOS](https://support.mozilla.org/en-US/kb/add-website-shortcut-your-home-screen-ios).
