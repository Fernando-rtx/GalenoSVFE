# GalenoSV GT02: interfaz HU1–HU4

La ruta raíz es una SPA construida con ECMAScript nativo y el Web Component `galenos-academic-app`. El componente reúne búsqueda de citas (HU1), verificación de empleado (HU2), bandeja de trabajo (HU3) y captura/transición de atención (HU4). Las solicitudes pasan por `AcademicCareService` y el transporte REST existente; no se guardan documentos, respuestas clínicas ni credenciales en Cache Storage.

Los documentos se cargan desde `GET /v1/tipo_documento`; clínicas y roles proceden de la identidad verificada. El dashboard se inicia con la fecha local de El Salvador. Las consultas fallidas muestran mensajes seguros y permiten volver a enviar el formulario. Las acciones de escritura se deshabilitan mientras esperan respuesta.

La apertura de la aplicación sin ruta y el inicio de la PWA llevan a `#academico`.
El logo regresa a la bandeja, incluso desde el detalle de atención en la misma
ruta. Búsqueda de citas pertenece al portal de pacientes y se oculta para una
sesión de empleado. La bandeja conserva las acciones de atención del rol y la
clínica seleccionados; el tab «Mis citas» no se ofrece dentro de la sesión de
empleado y permanece en el portal de pacientes.

El dashboard usa las variables `--gs-*` del tema compartido en sus estilos de
Shadow DOM. El selector permite español e inglés; `boundary/language.js`
traduce textos de interfaz, mensajes y etiquetas accesibles dentro de los
ShadowRoots, sin recrear formularios ni cambiar los valores de los registros.
La preferencia de idioma se conserva como `galenos-language` en localStorage;
las identidades y respuestas de la API permanecen únicamente en memoria.

En Consultas, solo la asignación de Atención al público puede dar de alta pacientes
y programar citas. Recepción primero busca por nombre o documento; si no hay
coincidencias, registra nombres, apellidos, nacimiento y documento. El guardado de
cita asocia de forma atómica el procedimiento activo y su primer paso. La pantalla
indica abrir la bandeja para registrar el resultado de recepción y usar «Avanzar»;
el siguiente rol y responsable provienen de la secuencia configurada del procedimiento.

## Preparación demo

1. Inicia el backend principal con `mvn -DskipTests liberty:run`, conectado a la base `clinica` de PostgreSQL en Docker y con `GALENOS_API_MODE=academic`.
2. La app carga `src/js/control/environment.local.js` si existe y, en caso
   contrario, usa `src/js/control/environment.example.js`. Para un override de
   despliegue, define `window.GALENOS_CONFIG = { gestionConfig: { baseUrl:
   'http://127.0.0.1:9080/GalenosSV/resources/' } }` antes del módulo `main.js`.
   Autoriza el origen del frontend en CORS.
3. Ejecuta `npm run dev` y abre el origen local autorizado en CORS.

La app shell PWA se precarga para abrir la interfaz sin conexión. Los datos clínicos requieren conexión y no se almacenan localmente; se comunica esta limitación al usuario.

## Verificaciones

- `npm test`
- `npm run check`
- `npm run test:transport` (requiere permiso del entorno para abrir un puerto local)
- `npm run test:integration` (requiere backend y datos sintéticos activos)
- Pruebas de navegador existentes: `test/browser/`.
