# Gestión autenticada (v2)

Extensión compatible de API 0.2: `/resources/v1` conserva sus rutas y contrato.
`/resources/v2` requiere BASIC validado por Liberty y cabecera Authorization explícita.
Dos perfiles explícitos: development sobre **clinica** con ambos flags demo desactivados,
o el perfil académico compatible GALENOS_CRUD_DEMO=true sobre **galenos_demo_crud**.
Ningún perfil se presenta como autenticación clínica de producción. Ver los permisos de desarrollo al final.

Roles técnicos de prueba: galenos-demo-read permite lectura; galenos-demo-write permite escritura.
Las credenciales privadas del launcher permanecen fuera de Git; no se guardan en el navegador.
El selector JSF de rol no autentica esta API. GET contexto devuelve actor, puedeEscribir y UUID de clinicas autorizadas.
Para entidades clínicas el alcance debe comprobarse por identidad y clínica, nunca por selector visual.

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
Errores de negocio422; duplicados o referencias409; falta identidad401; permisos403; método no publicado405;
fallos inesperados500 con mensaje seguro. Las causas de persistencia no se convierten en resultados normales.

Validaciones compartidas con JSF en CatalogoService. TipoDocumento y tipos de contacto validan regex Java.
TipoMedioContacto mantiene la regla JSF: no se impone unicidad de nombre que no existía.
Tipos se desactivan por PUT activo=false: la pantalla JSF no ofrece eliminación física.
Clínica y Rol permiten eliminación según sus Models, con rechazo de referencias existentes.

CORS exacto del origen configurado; v2 permite Authorization y GET/HEAD/POST/PUT/DELETE/OPTIONS.
401 del contenedor también publica CORS para permitir mensajes visibles. Cache-Control no-store.
No hay Access-Control-Allow-Credentials: el frontend usa credentials:omit y Basic en memoria.

## Consulta y ejecución de procedimientos

Todas estas operaciones requieren idClinica UUID en query y un alcance permitido para la identidad BASIC.
GET clinica_disponible pagina solo clínicas activas autorizadas (idClinica,nombre).
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
Reglas idénticas al servicio JSF ConsultaFlujoService. Otra clínica403; ID inexistente404; relación modificada409; regla inválida422.
El frontend conserva el dashboard y las tarjetas, añade formularios y relaciones anidadas y recupera el registro guardado por UUID.
Cambiar identidad refresca clínicas autorizadas; conserva clínica/filtros si la identidad sigue teniendo acceso.

## Personas y asociaciones

GET/POST persona y GET/PUT persona/{id}. Entrada: nombres,apellidos,fechaNacimiento (ISO8601 con zona).
DTO añade idPersona y fechaCreacion asignada por servidor, que se conserva al editar. No existe DELETE de Persona como en JSF.
Filtros nombres/apellidos (contiene), listas first/max, Total-registros, UUID ascendente.
GET lista/ID,POST,PUT,DELETE documento,medio_contacto,persona_rol; listas requieren idPersona UUID.
DTO Documento: idDocumento,idPersona,idTipoDocumento,valor,rutaFisica. Entrada sin idDocumento.
DTO MedioContacto: idMedioContacto,idPersona,idTipoMedioContacto,valor,fechaCreacion. Entrada sin ID propio ni fechaCreacion.
DTO PersonaRol: idPersonaRol,idPersona,idRol,idClinica,fechaCreacion. Entrada sin ID propio ni fechaCreacion.
Persona y tipos/rol/clínica de asociaciones son inmutables al editar. Asignar o eliminar PersonaRol exige clínica autorizada;
las asignaciones referenciadas por Consulta/Paso responden409. Documentos/contactos permiten eliminar su asociación, no Persona.
Reglas de nombres, nacimiento, DUI/edad, regex, tipos activos y duplicados compartidas con JSF en PersonaFlujoService.
Los registros de Persona y sus documentos/contactos se administran globalmente como en JSF, únicamente en la base sintética autenticada.
Esto NO define permisos sobre personas reales: la correspondencia actor/PersonaRol y autorización de producción sigue pendiente del equipo.

## Modo autenticado de desarrollo sobre clinica

GALENOS_API_MODE=development habilita v2 exclusivamente con POSTGRESQL_DB_NAME=clinica y ambos flags demo desactivados.
Los usuarios se autentican con BASIC de Liberty. Para uso local, limitar httpEndpoint a loopback; fuera del equipo se requiere TLS.
No reutilizar cuentas PostgreSQL. Registry y contraseñas permanecen en configuración privada de Liberty.
Roles de aplicación: galenos-api-read (lectura), galenos-api-write (escritura), galenos-api-admin (administración global).
Personas/documentos/contactos/asignaciones requieren administrador; escritura de catálogos también. El selector PersonaRol no autentica.
Consultas y ejecución de procedimientos exigen además el UUID autorizado en GALENOS_API_ACTOR_CLINICS (usuario=uuid;usuario2=uuid).
Una identidad sin alcance no obtiene clínicas ni puede ejecutar operaciones clínicas. Las asignaciones de negocio no conceden roles del contenedor.
El modo sintético anterior se conserva como perfil distinto; sus roles de escritura no conceden permisos de desarrollo.
El dashboard no realiza lecturas anónimas si environment.local.js declara authenticatedOnly=true; después del login utiliza solamente v2.

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
