# GalenoSV GT02: interfaz HU1–HU4

La ruta raíz es una SPA construida con ECMAScript nativo y el Web Component `galenos-academic-app`. El componente reúne búsqueda de citas (HU1), verificación de empleado (HU2), bandeja de trabajo (HU3) y captura/transición de atención (HU4). Las solicitudes pasan por `AcademicCareService` y el transporte REST existente; no se guardan documentos, respuestas clínicas ni credenciales en Cache Storage.

Los documentos se cargan desde `GET /v2/tipo_documento`; clínicas y roles proceden de la identidad verificada. El dashboard se inicia con la fecha local de El Salvador. Las consultas fallidas muestran mensajes seguros y permiten volver a enviar el formulario. Las acciones de escritura se deshabilitan mientras esperan respuesta.

## Preparación demo

1. Inicia el backend con su perfil CRUD sintético aislado.
2. Ejecuta `python3 scripts/configure-demo.py /home/fernando/NetBeansProjects/Galenos`. Se crea `src/js/control/environment.local.js`, ignorado por Git y con permisos `0600`.
3. Ejecuta `npm run dev` y abre el origen local autorizado en CORS.

La app shell PWA se precarga para abrir la interfaz sin conexión. Los datos clínicos requieren conexión y no se almacenan localmente; se comunica esta limitación al usuario.

## Verificaciones

- `npm test`
- `npm run check`
- `npm run test:transport` (requiere permiso del entorno para abrir un puerto local)
- `npm run test:integration` (requiere backend y datos sintéticos activos)
- Pruebas de navegador existentes: `test/browser/`.
