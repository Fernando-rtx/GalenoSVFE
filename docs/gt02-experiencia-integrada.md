# Integración de experiencia GT02 — avance verificable

## Corrección del rechazo aparente en la bandeja (13/11/2026)

Reproducción real: Gemely Itzep → Doctor → Clinica Central en BrowserSync3000 y
Liberty9080, conectado a clinica. La petición `GET v2/empleado/consultas` devolvía
200 con Bearer y X-Persona-Rol correctos. El mensaje de rechazo procedía de otra
petición: `GET v2/tipo_documento?first=0&max=100` recibía **401**, sin Bearer,
porque el filtro de documento utilizaba la configuración administrativa v2.
El mensaje anterior de 401 era «El servidor rechazó el acceso a este recurso».
No se reprodujo un 403 de la bandeja con la selección válida.

AcademicCareService utiliza ahora el catálogo público existente v1 para el filtro;
se mantienen los contratos de gestión y las autorizaciones de HU3/HU4. La interfaz
distingue sesión inválida/expirada401 y acceso denegado403; al buscar limpia tarjetas,
contadores y paginación, evitando presentar un resultado vacío tras un fallo.
Service Worker pasa a shell-v16 para renovar módulos públicos. El fallo original
también se reprodujo en un perfil Chromium nuevo: no era consecuencia del caché.

Evidencia Chromium con Fetch real, sin respuestas REST simuladas:

- Identificación/selección real y bandeja200; asignación enviada coincide con JPA.
- Hoy, intervalo1900 y rango2000–2099:200 y lista vacía legítima para esa asignación.
- PersonaRol de otra persona:403; idPersona ajeno:403. Tarjetas y contador vacíos,
  mensaje de acceso denegado, sin «No hay consultas asignadas» tras estos errores.
- Sesión revocada en Java:401 y mensaje específico de sesión expirada/inválida.
- HU1: identificación, una cita real, descarga PDF Java y desconexión reconocida.
- Hashes de las20tablas iguales antes/después; sin INSERT/UPDATE/DELETE PostgreSQL.
- Despliegue9080 verificado: GalenosSV.war.xml apunta a webapp y target/classes de
  GalenosSV_Actualizado. No fue necesario cambiar o reiniciar el backend.

Captura local: `/private/tmp/gt02-bandeja-corregida.png` (sesión Gemely, Doctor,
Clinica Central y estado vacío correcto; documento y token no visibles).
Regresión:481Mocha aprobadas y106archivos con sintaxis válida. Esta corrección no
modifica Java ni certifica nuevas operaciones de escritura HU4.

Rama de ambos repositorios: `feat/gt02-experiencia-integrada`. La rama
`test/gt02-calidad-pruebas` se conserva intacta. Frontend incorpora origin/main
`f27d142`, incluida la oferta PWA antes de descargar tickets; backend parte de
`31f64a9` más las correcciones de pruebas. Sin merge/push a main.

## Implementado

- Identificación existente y selección validada de PersonaRol: botón Abrir dashboard,
  asignación compartida entre portal y dashboard, cambio de asignación y cierre desde
  dashboard. Sin tokens en DOM, Storage ni Cache Storage.
- Coordinación en `control/AcademicCareControl.js`: cancelación por ámbito,
  rechazo de respuestas obsoletas y limpieza de contexto. Se reutilizan Services,
  portales, tarjetas, estilos, notificaciones y componentes existentes.
- Bandeja con Hoy, fechas pasadas/futuras, rango y paginación REST de 20 elementos.
- Búsqueda por documento dentro de las consultas asignadas al empleado/rol/clínica.
  No es un listado global de personas ni concede acceso a otros pacientes.
- Historial ampliado con rol y órdenes/resultados persistidos. Sin rutas de atestados
  ni contenido clínico ficticio. Compatible en frontend con historial anterior.
- Atención: protección contra doble envío; siguiente paso del mismo procedimiento,
  rol activo y no paciente; exámenes activos; retroceso limitado al procedimiento
  actual. Se conserva el bloqueo pesimista y `FlujoConsultaException(rollback=true)`.
- El ticket del dashboard reutiliza CitasPacienteService y su PDF Java, sin depender
  de listar las primeras 1000 citas. La descarga pública previa se conserva.

## Contratos utilizados

Base: `/GalenosSV/resources`.

| Método / ruta | Entrada / salida |
|---|---|
| GET v1/tipo_documento | Catálogo paginado existente |
| POST v2/identidad_academica/{paciente,empleado} | Tipo y valor → sesión/contexto existentes |
| GET/DELETE v2/identidad_academica/{portal} | Bearer → actualización/cierre |
| GET v2/citas_paciente | Bearer, clínica, fechas, first/max → citas y Total-registros |
| GET v2/citas_paciente/{id}/ticket | Bearer → PDF Java |
| GET v2/empleado/consultas | Bearer, X-Persona-Rol, persona, clínica, rol, fechas, first/max |
| GET v2/atencion/consulta/{id} | Mismo contexto autorizado → detalle |
| POST v2/atencion/registrar | Contexto, consulta, paso, acción, valor, siguiente y exámenes |
| GET v2/paciente/citas/{id}/ticket | Sesión paciente y clínica → PDF Java reutilizado |

Extensiones de contrato: empleado/consultas acepta conjuntamente `idTipoDocumento`
(UUID) y `numero` (string). Validación de tipo activo y regex en Java; comparación
exacta, filtros JPA parametrizados, misma restricción de asignación para lista/conteo.
Sin coincidencia permitida devuelve lista vacía; no revela existencia fuera del ámbito.

Cada elemento History conserva sus campos y añade `rol` (string/null) y `ordenes`:
`idOrdenExamen`, `examen`, `fechaCreacion`, `indicaciones`, `resultados`.
Cada resultado contiene `idExamenResultado`, `fechaCreacion`, `resultado`,
`interpretacion`. UUID como string, fechas ISO UTC, presentación America/El_Salvador.
Son campos de las relaciones JPA existentes; no se cambió el esquema.

## Evidencia real y pruebas

Configuración instalada comprobada sin secretos: `POSTGRESQL_DB_NAME=clinica`,
`HTTP_PORT=9080`, `GALENOS_API_MODE=academic`. Al iniciar la comprobación no había
servidor escuchando en 9080. Se utilizó el runtime existente de verificación en
19084, conectado a **clinica con JDBC forzado a solo lectura**. No es otra base.
PostgreSQL confirmó 20 tablas, `id_procedimiento_paso` uuid y `valor` text.

Chromium → BrowserSync 3000 → Java 19084 → PostgreSQL clinica:
identificación de paciente HTTP200, una tarjeta real, descarga PDF Java,
desconexión/reconexión y cierre; cero errores JavaScript. Solo se sustituyó la URL
de configuración en el navegador de prueba; no se interceptaron respuestas REST.
Hashes de las 20 tablas iguales antes/después. No se guardaron documentos,
tokens, capturas con datos clínicos ni respuestas clínicas en el repositorio.

Regresión: 478 Mocha, 827 JUnit/Mockito, 9 HTTP sintéticas aprobadas; sintaxis válida.
Chromium sintético pasó componentes, eventos Shadow DOM, navegación SPA,
tema/móvil, instalación y shell offline, sin caché clínica. No equivale a una prueba
con procesos frontend/backend detenidos: se usó desconexión de Chromium.

## Bloqueos y alcance pendiente

La identificación dinámica de HU2 quedó implementada: ya no se consulta
`GALENOS_EMPLEADO_ROLES`. Se considera empleado a una asignación PersonaRol cuyo
rol no sea Paciente y cuyo rol y clínica estén activos; una asignación debe existir
para la persona identificada. El catálogo actual respalda la regla: Paciente es el
único rol paciente; Enfermera está inactiva; Atención al público no tiene
asignaciones; Doctor y Desarrollo tienen asignaciones activas. No se concede acceso
a roles inactivos, sin asignación o a una persona con solo Paciente.

HU3 y la búsqueda de empleados ya fueron comprobadas en lectura real con sesión y
`X-Persona-Rol`; el conjunto actual no contiene consultas asignadas al rol/fecha
probados, por lo que no se afirma detalle real ni historial con resultados. Faltan
verificación de búsquedas con resultado, paginación real múltiple, historial con exámenes, y transacciones
concurrentes contra PostgreSQL. No se ejecutaron INSERT/UPDATE/DELETE ni migraciones.
Las escrituras requieren autorización sobre una consulta y operación de prueba
controladas antes de ejecutarlas. Mockito no certifica rollback real.

La asignación de atención usa PersonaRol del paso. Cuando una transición busca
responsable por rol/clínica, el servicio previo elige el primero por UUID; se conserva
esa regla existente, pero la política de reparto entre varios empleados sigue siendo
una ambigüedad de negocio que debe confirmarse. No se inventó reparto automático.

## Carpetas y arranque

Frontend: `/Users/albertoalexanderitzepsarceno/Desktop/GalenoSVFE`, `npm run dev`.
Backend: `/Users/albertoalexanderitzepsarceno/Desktop/GalenosSV_Actualizado`.
Configuración normal instalada: `~/openliberty/wlp/usr/servers/GalenosSVAcademico`;
utilizar su server.env privado existente, no reemplazarlo con fixtures.
Arranque del servidor instalado: `~/openliberty/wlp/bin/server start GalenosSVAcademico`.
Ese comando no despliega automáticamente el WAR de la rama: empaquetar y desplegar
la versión revisada antes de verificar cambios. La configuración normal continúa
apuntando a clinica/9080; el runtime de pruebas en19084 no la sustituye.
