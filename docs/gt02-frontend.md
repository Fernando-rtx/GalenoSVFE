# GalenoSV GT02: interfaz HU1–HU4

La ruta raíz es una SPA construida con ECMAScript nativo y el Web Component `galenos-academic-app`. El componente reúne búsqueda de citas (HU1), verificación de empleado (HU2), bandeja de trabajo (HU3) y captura/transición de atención (HU4). Las solicitudes pasan por `AcademicCareService` y el transporte REST existente; no se guardan documentos, respuestas clínicas ni credenciales en Cache Storage.

Los documentos se cargan desde `GET /v1/tipo_documento`; clínicas y roles proceden de la identidad verificada. El dashboard se inicia con la fecha local de El Salvador. Las consultas fallidas muestran mensajes seguros y permiten volver a enviar el formulario. Las acciones de escritura se deshabilitan mientras esperan respuesta.

La apertura de la aplicación sin ruta y el inicio de la PWA llevan a `#academico`.
El logo regresa a la bandeja, incluso desde el detalle de atención en la misma
ruta. El menú lateral contiene Búsqueda de citas, Login y Consulta. La bandeja
muestra una invitación a iniciar sesión cuando no existe identidad de empleado.

El dashboard usa las variables `--gs-*` del tema compartido en sus estilos de
Shadow DOM. El selector permite español e inglés; `boundary/language.js`
traduce textos de interfaz, mensajes y etiquetas accesibles dentro de los
ShadowRoots, sin recrear formularios ni cambiar los valores de los registros.
La preferencia de idioma se conserva como `galenos-language` en localStorage;
las identidades y respuestas de la API permanecen únicamente en memoria.

## Preparación demo

1. Inicia el backend con el runtime GT02 y los datos de presentación documentados en el backend (`docs/datos-presentacion.md`).
2. Configura `src/js/control/environment.local.js`, ignorado por Git, con `export const gestionConfig = { baseUrl: 'http://localhost:19085/GalenosSV/resources/' };`. Autoriza el origen del frontend en CORS.
3. Ejecuta `npm run dev` y abre el origen local autorizado en CORS.

La app shell PWA se precarga para abrir la interfaz sin conexión. Los datos clínicos requieren conexión y no se almacenan localmente; se comunica esta limitación al usuario.

## Verificaciones

- `npm test`
- `npm run check`
- `npm run test:transport` (requiere permiso del entorno para abrir un puerto local)
- `npm run test:integration` (requiere backend y datos sintéticos activos)
- Pruebas de navegador existentes: `test/browser/`.
