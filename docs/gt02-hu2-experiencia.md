# HU2 — Acceso de empleados y selección de asignación

Fecha: 14/11/2026. Rama en ambos repositorios: `feat/gt02-hu2-experiencia`.
Bases verificadas, sincronizadas mediante fetch y fast-forward: frontend
`f679bfd` (PR17), backend `613db3c` (PR13). No se sobrescribieron otras ramas.

## Resultado

Se reutilizan InicioSesionModel/PortalAcademicoModel, IdentificacionControl,
IdentidadAcademicaService, contexto-empleado, AcademicCareService y el dashboard.
El formulario muestra el logo existente, «Acceso de empleados», tipos activos,
número inicialmente deshabilitado, botón «Ingresar», carga, errores junto al campo
y selección «Rol y clínica de trabajo». El acceso al dashboard conserva el documento
SPA y revalida el contexto antes de entrar. No introduce componentes o Services paralelos.

Los formatos ASCII sencillos del catálogo se anticipan en el Control; las
expresiones exclusivas de Java quedan para Java. No se cambia un DUI a Pasaporte
automáticamente: se indica al usuario revisar el tipo seleccionado. Java mantiene
la validación definitiva de tipo, formato y coincidencia exacta del documento.

El contexto se obtiene de Persona/Documento/TipoDocumento/PersonaRol/Rol/Clinica.
PersonaRol **no tiene activo propio**: una asignación utilizable debe existir,
pertenecer a la persona y tener rol y clínica activos. Paciente no permite entrar
como empleado. No se requiere GALENOS_EMPLEADO_ROLES; se retiró la indicación obsoleta
del ejemplo de configuración, sin modificar server.env privado ni datos PostgreSQL.

IdentificacionControl notifica cambios de sesión/contexto/asignación sin emitir
tokens en eventos DOM. contexto-empleado proporciona copias del contexto y de la
asignación activa. Al cerrar, revocar o cambiar el contexto se cancelan lecturas,
se limpian selección, detalle, tarjetas y paneles del empleado anterior. Una respuesta
tardía no puede restaurar la sesión cerrada ni sustituirla por otra persona.
Si al revalidar desaparece la selección elegida, se solicita elegir otra antes de
entrar al dashboard; no se entra silenciosamente con otra asignación.

## Contratos reutilizados

Base real: `/GalenosSV/resources`.

| Método y ruta | Uso |
|---|---|
| GET v1/tipo_documento | Catálogo público paginado; ofrecer solamente activos |
| POST v2/identidad_academica/empleado | idTipoDocumento + valor → token, expiraEn, contexto |
| GET v2/identidad_academica/empleado | Actualizar asignaciones con Bearer |
| DELETE v2/identidad_academica/empleado | Revocar sesión en memoria Java |
| GET v2/empleado/consultas | Bearer + X-Persona-Rol y contexto persona/rol/clínica |
| GET v2/atencion/consulta/{id} | Mismo contexto autorizado HU4 |
| POST v2/atencion/registrar | Contrato HU4 conservado; no se ejecutó escritura clínica |

No cambia el DTO. Los errores de identificación siguen siendo JSON `mensaje`:
404 tipo/persona inexistente, 422 formato/tipo inactivo, 403 sin asignación de
empleado o sin asignaciones activas, 401 sesión inválida/revocada/expirada, 500
error interno. El cliente solo presenta mensajes públicos conocidos; diferencia
la desconexión y permite reintentar. Las peticiones auxiliares usan el catálogo
público v1, conservando cerrada la gestión v2 para operaciones sin permisos.

Si el cierre falla por red se elimina el contexto local y se informa que no se
confirmó la revocación en el servidor. Sin conexión no puede certificarse una
revocación remota; la sesión del servidor conserva su vencimiento existente.

## Comprobaciones ejecutadas

Runtime de verificación en19084 con el WAR de la rama, misma base **clinica** y
JDBC `default_transaction_read_only=on`. BrowserSync real en3000. Se sustituyó
únicamente el módulo local de configuración en el navegador de prueba para dirigirlo
a19084; no se simularon respuestas REST ni datos clínicos. El servidor normal9080
no se detuvo. No se creó otra base ni se cambió el esquema.

| Comprobación | Resultado |
|---|---|
| npm test | 488 aprobadas |
| npm run check | 106 archivos válidos; el script .mjs además se ejecutó realmente |
| npm run test:transport | 9 aprobadas contra HTTP sintético local |
| mvn test | 828 pruebas, cero fallos, errores u omitidas |
| Chromium real | 12 comprobaciones aprobadas, cero errores JavaScript |
| Integridad de clinica | Hashes de las20tablas iguales antes/después |

Chromium comprobó formulario y errores accesibles, rechazo de formato incorrecto,
paciente sin rol empleado rechazado por Java, Doctor real, una sola petición ante
dos envíos, selección exacta en dashboard, encabezados Bearer y PersonaRol y sus
parámetros de persona/rol/clínica, UUID ajeno403, sesión revocada401 y limpieza,
cierre real, vista móvil sin desbordamiento y navegación SPA sin recrear documento.

Se detuvo y arrancó **solo el runtime de pruebas de solo lectura**: el formulario
permaneció visible, mostró desconexión y el reintento permitió una identificación
nueva. La regresión HU1 obtuvo citas reales y descargó un PDF Java. La PWA recargó
el acceso estando offline; Cache Storage no contenía REST, documentos o sesiones.

Evidencia local generada (ignorada por Git, sin documentos ni tokens):

- `coverage/hu2/acceso.png` y `coverage/hu2/asignacion.png`.
- `coverage/hu2/resultado.json`: resultados sanitizados y estado passed/failed para
  evitar confundir evidencia anterior con una ejecución que falle.

## Límites reales

- No hay empleados con varias asignaciones válidas en los registros actuales
  (conteo SQL de solo lectura). Cambio entre múltiples roles/clínicas y limpieza
  del contexto están comprobados con datos sintéticos unitarios y mocks JPA,
  **no** con un empleado real multiasignación. No se añadieron registros.
- La asignación inactiva se comprueba con JUnit; no se inventó un empleado inactivo
  para el recorrido real. Expiración temporal se prueba con Clock controlado en
  JUnit; el recorrido Chromium usa revocación real401, no espera30minutos.
- Safari26.5.2 está instalado, pero SafariDriver rechazó la sesión porque
  «Allow remote automation» está desactivado. No se cambiaron preferencias;
  no se declara aprobado Safari.
- No se ejecutaron escrituras HU4 ni se certifica persistencia/rollback por pasar
  pruebas con Mockito. Las reglas clínicas y sus contratos se conservaron.

## Archivos modificados

Frontend: `src/js/boundary/modelos/PortalAcademicoModel.js`,
`src/js/boundary/portal-academico.js`, `src/js/boundary/components/galenos-academic-app.js`,
`src/js/boundary/language.js`, `src/js/control/IdentificacionControl.js`,
`src/js/control/IdentidadAcademicaService.js`, `src/js/control/contexto-empleado.js`,
`src/js/main.js`, `src/resources/estilos/portal-academico.css`, `src/service-worker.js`,
`test/unit/gt02.test.js`, `test/browser/hu2_identificacion_readonly.mjs` y este informe.

Backend: `control/IdentidadAcademicaService.java`, su test JUnit,
`src/main/liberty/config/server.env.example` y `docs/gt02-contratos-rest.md`.

## Reproducción

Frontend: `~/Desktop/GalenoSVFE`, ejecutar `npm run dev`.
Backend: `~/Desktop/GalenosSV_Actualizado`; usar la configuración privada existente
de clinica. Para ver estos cambios normales debe compilarse/desplegarse la rama.
La configuración de pruebas no sustituye la conexión normal.

Para la comprobación protegida: empaquetar en el backend, preparar mediante
`python3 scripts/gt02_readonly_runtime.py stage` e iniciar con `run`.
Desde frontend ejecutar `node test/browser/hu2_identificacion_readonly.mjs` indicando
`GALENOS_BACKEND_URL=http://127.0.0.1:19084/GalenosSV/resources/`.
`PLAYWRIGHT_MODULE` y `CHROMIUM_EXECUTABLE` permiten utilizar las herramientas ya
instaladas fuera del proyecto, sin añadir dependencias. Para comprobar caída real,
indicar `GALENOS_RESTART_READONLY_RUNTIME=1` y `GALENOS_BACKEND_REPO` con la carpeta
backend; el script comprueba puerto, base y JDBC de solo lectura antes de detener
exclusivamente GalenosGT02ReadOnly. Al finalizar detenerlo con la opción `stop`.
