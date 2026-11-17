# Shell PWA sin servidor

El arranque importa estáticamente componentes que antes se almacenaban solo bajo demanda. Además faltaban `AtencionCitaService.js` y `AtencionPacienteService.js` en la lista pública. Sin esos módulos no se ejecutaba el componente raíz y el HTML quedaba vacío.

La versión v37 precarga todas las dependencias públicas antes de completar la instalación y solicitar la activación. Las rutas REST, configuración local, credenciales, respuestas clínicas y PDF quedan fuera de la lista. El fallback HTML se limita a `/` y `/index.html`; la SPA navega mediante fragmentos. La configuración local es opcional y su ausencia offline utiliza la configuración pública existente.

## Safari

1. Ejecutar `npm run dev` y abrir `http://localhost:3000` en una ventana normal. Mantener siempre el mismo hostname y puerto.
2. Con el servidor encendido, recargar para descargar la versión nueva. En Desarrollo → Mostrar inspector web → Consola comprobar `await navigator.serviceWorker.ready` y `navigator.serviceWorker.controller`: debe existir un controlador activo. En Almacenamiento → Cachés comprobar `galenossv-shell-v37`. Si aún aparece una versión anterior, cerrar las pestañas de ese origen y abrir de nuevo con el servidor encendido.
3. Detener BrowserSync con Control+C y recargar normalmente la misma URL. Deben aparecer la interfaz y sus estilos; el enlace de empleados debe abrir su formulario. Evitar la recarga forzada que omite cachés.
4. Desconectar la red y recargar de nuevo. Debe aparecer el aviso de desconexión. La identificación, búsquedas, PDF y operaciones clínicas requieren conexión; nunca deben mostrar resultados recuperados de Cache Storage. Apagar BrowserSync por sí solo no cambia `navigator.onLine` si el equipo conserva su red.
5. Reiniciar el servidor para continuar las pruebas clínicas. Instalar con “Añadir al Dock” es opcional: el Service Worker también funciona en una pestaña normal de localhost. La primera visita requiere conexión y activación; otro puerto u hostname tiene un almacenamiento independiente.

## Pruebas

- `npm test`: incluye recorrido recursivo de las importaciones de arranque para detectar dependencias sin precargar, exclusión REST y recuperación sin red.
- `npm run check`.
- `node test/browser/offline-shell.mjs`: necesita Playwright y Chromium en el entorno de pruebas existente. Opcionalmente `PLAYWRIGHT_MODULE` indica el módulo de Playwright y `CHROMIUM_PATH` el ejecutable. No añade dependencias a la aplicación.

El test de navegador usa un origen nuevo y un servidor estático temporal. Espera activación y control, obtiene una respuesta clínica sintética, cierra realmente el servidor antes de la primera recarga, comprueba renderizado y navegación a empleados, desconecta la red y verifica avisos y exclusión de datos clínicos de Cache Storage. Nunca conecta al backend ni a PostgreSQL.
