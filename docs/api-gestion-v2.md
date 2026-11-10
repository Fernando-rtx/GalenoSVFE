# Gestión académica local (v2)

`/GalenosSV/resources/v2` sirve exclusivamente datos ficticios en loopback. El frontend
carga los recursos sin iniciar sesión y usa las operaciones publicadas en este documento.
`GALENOS_API_MODE=academic` habilita v2 sobre `clinica` con el modo demo desactivado.
El perfil aislado `GALENOS_CRUD_DEMO=true` conserva su base `galenos_demo_crud`.

`GET contexto` conserva su DTO por compatibilidad. Devuelve `actor: "academico-local"`,
`puedeEscribir: true` y los UUID de las clínicas activas. Es información del despliegue.
`Rol` y `PersonaRol` representan relaciones clínicas de negocio.

## Catálogos

| Ruta v2 | Identificador | Campos publicados y de entrada (sin identificador) | Operaciones |
| --- | --- | --- | --- |
| tipo_documento | idTipoDocumento | nombre, indicaciones, expresionRegular, activo | GET lista/ID, POST, PUT |
| tipo_medio_contacto | idTipoMedioContacto | nombre, indicaciones, expresionRegular, activo | GET lista/ID, POST, PUT |
| tipo_examen | idTipoExamen | nombre, observaciones, activo | GET lista/ID, POST, PUT |
| clinica | idClinica | nombre, tipo, comentarios, activo | GET lista/ID, POST, PUT, DELETE |
| rol | idRol | nombre, observaciones, activo | GET lista/ID, POST, PUT, DELETE |

DTO explícitos, valores null incluidos. Strings o null, activo boolean o null; no entidades JPA ni relaciones.
PUT reemplaza los campos publicados, no es PATCH. UUID asignado por DAO. POST201 con Location, PUT200 DTO, DELETE204.
Listas paginadas en PostgreSQL: first>=0, max1..100, predeterminados0/20, Total-registros obligatorio.
Filtro opcional nombre (LIKE contiene, semántica DAO existente), orden estable UUID ascendente.
GET ID inexistente404; UUID/JSON/campo inválido422 (JSON mal formado puede producir400 del runtime).
Errores de negocio422; duplicados o referencias409; origen rechazado403; método no publicado405;
fallos inesperados500 con mensaje seguro. Las causas de persistencia no se convierten en resultados normales.

Validaciones compartidas con JSF en CatalogoService. TipoDocumento y tipos de contacto validan regex Java.
TipoMedioContacto mantiene la regla JSF: no se impone unicidad de nombre que no existía.
Tipos se desactivan por PUT activo=false: la pantalla JSF no ofrece eliminación física.
Clínica y Rol permiten eliminación según sus Models, con rechazo de referencias existentes.

CORS acepta los orígenes locales configurados y los métodos GET/HEAD/POST/PUT/DELETE/OPTIONS
de v2, con cabeceras Accept y Content-Type. El frontend usa `credentials: omit`.
Las respuestas REST llevan `Cache-Control: no-store`.

## Consulta y ejecución de procedimientos

Todas estas operaciones requieren idClinica UUID en query.
GET clinica_disponible pagina solo clínicas activas (idClinica,nombre).
GET persona_rol/pacientes?idClinica=UUID&buscar=texto reutiliza búsqueda de pacientes JSF por nombre/DUI, máximo15.
GET procedimiento lista paginada de procedimientos (activo=true para asociación) (idProcedimiento,nombre,observaciones,activo).

| Ruta | Operaciones | DTO / campos de entrada |
| --- | --- | --- |
| consulta | GET lista/ID, POST, PUT | idConsulta,idPersonaRol,idClinica,personaNombre,rolNombre,clinicaNombre,fechaInicio,fechaFin,referenciaExterna,observaciones. Entrada: idPersonaRol,fechas,referenciaExterna,observaciones |
| consulta_procedimiento | GET lista/ID, POST, PUT | idConsultaProcedimiento,idConsulta,idProcedimiento,fechaInicio,fechaFin,observaciones. Entrada sin ID propio |
| consulta_procedimiento_paso | GET lista/ID, PUT | idConsultaProcedimientoPaso,idConsultaProcedimiento,idPersonaRol,fechaInicio,fechaFin,estado. Entrada sin ID propio |

Listas de asociaciones/pasos requieren idConsulta además de idClinica; first/max y Total-registros como catálogos.
Fechas de entrada ISO8601 con zona, salida UTC; fechas nulas se publican como null. Inicio obligatorio y fin>=inicio.
Paciente/asociaciones/responsable inmutables al editar; los estados válidos del paso son PENDIENTE/EN_CURSO/COMPLETADO.
Asociar un procedimiento crea su primer paso en la misma transacción EJB; no existe POST de paso manual ni DELETE de consulta.
Reglas idénticas al servicio JSF ConsultaFlujoService. Clínica incompatible o ID inexistente404; relación modificada409; regla inválida422.
El frontend conserva el dashboard y las tarjetas, añade formularios y relaciones anidadas y recupera el registro guardado por UUID.

## Personas y asociaciones

GET/POST persona y GET/PUT persona/{id}. Entrada: nombres,apellidos,fechaNacimiento (ISO8601 con zona).
DTO añade idPersona y fechaCreacion asignada por servidor, que se conserva al editar. No existe DELETE de Persona como en JSF.
Filtros nombres/apellidos (contiene), listas first/max, Total-registros, UUID ascendente.
GET lista/ID,POST,PUT,DELETE documento,medio_contacto,persona_rol; listas requieren idPersona UUID.
DTO Documento: idDocumento,idPersona,idTipoDocumento,valor,rutaFisica. Entrada sin idDocumento.
DTO MedioContacto: idMedioContacto,idPersona,idTipoMedioContacto,valor,fechaCreacion. Entrada sin ID propio ni fechaCreacion.
DTO PersonaRol: idPersonaRol,idPersona,idRol,idClinica,fechaCreacion. Entrada sin ID propio ni fechaCreacion.
Persona y tipos/rol/clínica de asociaciones son inmutables al editar. Las asignaciones referenciadas por Consulta/Paso responden409. Documentos/contactos permiten eliminar su asociación, no Persona.
Reglas de nombres, nacimiento, DUI/edad, regex, tipos activos y duplicados compartidas con JSF en PersonaFlujoService.
Los registros de Persona y sus documentos y contactos usan las reglas de las vistas JSF
sobre datos ficticios. La consulta, el paso, la orden y el resultado conservan sus
comprobaciones de pertenencia a la clínica indicada.

## Procedimientos, exámenes, órdenes y asociaciones

Las listas siguientes usan first/max, Total-registros y orden UUID ascendente. POST201+Location,
GET/PUT200 y DELETE204. Argumentos422, inexistente404, conflicto409 cuando se identifica como tal,
fallo inesperado500 seguro. Los cuerpos admiten solo los campos publicados.

| Ruta | Campos DTO (todos explícitos, null publicado) | Entrada |
| --- | --- | --- |
| examen | idExamen,nombre,observaciones,activo | Sin ID |
| procedimiento | idProcedimiento,nombre,observaciones,activo | Sin ID |
| procedimiento_paso | idProcedimientoPaso,idProcedimiento,idRol,nombre,indicaFin | POST: idProcedimiento,idPasoOrigen nullable,nombre,idRol,indicaFin,tipoSecuencia,idsExamenes UUID[]; PUT: nombre,idRol,indicaFin |
| examen_tipo_examen | idExamenTipoExamen,idExamen,idTipoExamen,fechaCreacion,observaciones | Sin ID propio ni fechaCreacion |
| procedimiento_paso_examen | idProcedimientoPasoExamen,idProcedimientoPaso,idExamen,fechaCreacion,observaciones,activo | Sin ID propio ni fechaCreacion |
| procedimiento_paso_secuencia | idProcedimientoPasoSecuencia,idProcedimientoPaso,idProcedimientoPasoReferencia,tipoSecuencia | Sin ID propio |
| orden_examen | idOrdenExamen,idConsultaProcedimientoPaso,fechaCreacion,indicaciones | Sin ID propio |
| examen_resultado | idExamenResultado,idOrdenExamen,fechaCreacion,resultado,interpretacion,rutaAtestado | Sin ID propio |

GET procedimiento admite nombre y activo=true/false opcionales; el selector de asociación
solicita activo=true. Las listas de pasos requieren idProcedimiento; examen_tipo_examen requiere
idExamen; relaciones de paso requieren idProcedimientoPaso; órdenes requieren idPaso y resultados
idOrden. Órdenes/resultados exigen además idClinica y comprueban toda su cadena de pertenencia.

POST de paso reutiliza ProcedimientoFlujoService: crea el paso, enlace desde el origen si existe
y asociaciones de exámenes en una transacción. PUT conserva procedimiento, rol y exámenes.
DELETE solo elimina pasos terminales y sus asociaciones según el servicio original.
Las relaciones mantienen sus padres y destino/tipo/examen inmutables al editar; se modifican
solo sus campos permitidos. Las secuencias rechazan ciclos y duplicados. El editor conserva
los tipos de secuencia ya admitidos por el Model; la creación del flujo usa SIGUIENTE/ALTERNATIVA.
Órdenes y resultados no publican DELETE, igual que sus pantallas JSF.
