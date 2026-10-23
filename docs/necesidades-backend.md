# Necesidades REST para Fernando — propuestas pendientes

Fuente: inventario Java de Galenos main `e4edd6c6` y contrato público 0.2.
**Todo lo que se propone en este documento requiere aprobación e implementación
del backend. Ninguna ruta propuesta está registrada en api-routes.js ni se
invoca desde un DAO pendiente. No es una nueva versión del contrato canónico.**

## Contrato disponible y prioridad

Se conservan las cinco lecturas confirmadas: TipoDocumento lista/detalle,
Clínica lista y Consulta lista/detalle con clínica. Son tres recursos de los 20.
Todas las escrituras, el detalle de Clínica y los 17 recursos siguientes están
pendientes. No se requiere completar CRUD de cada tabla para habilitar lecturas.

Propuesta de secuencia por dependencias:

1. **P1 catálogos:** Rol, TipoExamen, TipoMedioContacto, Examen, Procedimiento.
2. **P2 plantillas/relaciones:** ExamenTipoExamen, ProcedimientoPaso,
   ProcedimientoPasoSecuencia, ProcedimientoPasoExamen.
3. **P3 personas/asignaciones:** Persona, PersonaRol, Documento, MedioContacto;
   después de acordar identidad, permisos y minimización del DTO.
4. **P4 ejecución clínica:** ConsultaProcedimiento, ConsultaProcedimientoPaso,
   OrdenExamen y ExamenResultado; después de los padres y autorización clínica.

P3/P4 no se habilitan como datos reales mediante el selector demo. Una
colección JPA o una búsqueda existente no autoriza su exposición pública.

## Matriz de recursos futuros (17 pendientes)

Las rutas son **candidatas relativas** a la base configurada, no endpoints
confirmados. RL significa propuesta de GET paginado y GET /{id}; W significa
que POST/PUT/DELETE requieren una decisión adicional de negocio y permisos.
Los nombres de campos del DTO son propuestas mínimas derivadas del inventario,
no copias de la serialización JPA. Fernando debe fijar nulabilidad y formatos.

| Recurso / prioridad | Ruta candidata PENDIENTE | Métodos por evaluar | Parámetros/contexto propuestos | DTO mínimo propuesto y exclusiones |
|---|---|---|---|---|
| Rol / P1 | `v1/rol` | RL; W de catálogo | first, max; activo si se publica | idRol, nombre, activo; sin personaRolCollection ni observaciones libres. |
| TipoExamen / P1 | `v1/tipo_examen` | RL; W de catálogo | first, max; activo si se publica | idTipoExamen, nombre, activo; sin colecciones JPA. |
| TipoMedioContacto / P1 | `v1/tipo_medio_contacto` | RL; W de catálogo | first, max | idTipoMedioContacto, nombre, indicaciones, expresionRegular, activo; solo metadatos, sin contactos. |
| Examen / P1 | `v1/examen` | RL; W de catálogo | first, max; tipo si se acuerda | idExamen, nombre, activo; no resultados ni colecciones. |
| Procedimiento / P1 | `v1/procedimiento` | RL; W de plantilla | first, max | idProcedimiento, nombre, activo; sin ejecución clínica ni colecciones. |
| ExamenTipoExamen / P2 | `v1/examen_tipo_examen` | RL; W de asociación | idExamen; idTipoExamen si se acuerda; first, max | idExamenTipoExamen, idExamen, idTipoExamen, fechaCreacion; IDs planos, sin ciclos. |
| ProcedimientoPaso / P2 | `v1/procedimiento_paso` | RL; W de plantilla | idProcedimiento, first, max | idProcedimientoPaso, idProcedimiento, idRol, nombre, indicaFin; sin secuencias/exámenes anidados. |
| ProcedimientoPasoSecuencia / P2 | `v1/procedimiento_paso_secuencia` | RL; W validada como grafo | idProcedimientoPaso; contexto de procedimiento, first, max | idProcedimientoPasoSecuencia, idProcedimientoPaso, idProcedimientoPasoReferencia, tipoSecuencia; referencia UUID, no entidad supuesta. |
| ProcedimientoPasoExamen / P2 | `v1/procedimiento_paso_examen` | RL; W de asociación | idProcedimientoPaso o idExamen, activo, first, max según decisión | idProcedimientoPasoExamen, idProcedimientoPaso, idExamen, fechaCreacion, activo; sin datos de pacientes. |
| Persona / P3 | `v1/persona` | RL con autorización; W por definir | contexto autorizado de clínica/actor, criterios explícitos, first, max | idPersona y nombres de presentación permitidos; fechaNacimiento solo si el caso la requiere; sin documentos/contactos anidados. |
| PersonaRol / P3 | `v1/persona_rol` | RL con autorización; W de asignación | idClinica obligatorio, idRol/idPersona y criterio solo si se aprueban | idPersonaRol, idPersona, idRol, idClinica, fechaCreacion y nombres necesarios; sin consultaCollection. |
| Documento / P3 | `v1/documento` | RL restringida; W y acceso a archivo por definir | ámbito de persona y clínica autorizado, idTipoDocumento si se aprueba | idDocumento, idPersona, idTipoDocumento; valor requiere permiso específico; nunca rutaFisica del servidor ni archivo base64 implícito. |
| MedioContacto / P3 | `v1/medio_contacto` | RL restringida; W por definir | ámbito de persona/clínica, idTipoMedioContacto si se aprueba | idMedioContacto, idPersona, idTipoMedioContacto, fechaCreacion; valor solo con permiso específico. |
| ConsultaProcedimiento / P4 | `v1/consulta_procedimiento` | RL; escritura por flujo, sin CRUD automático | idClinica e idConsulta obligatorios, first, max | idConsultaProcedimiento, idConsulta, idProcedimiento, fechaInicio, fechaFin; observaciones no incluidas por defecto. |
| ConsultaProcedimientoPaso / P4 | `v1/consulta_procedimiento_paso` | RL; comandos de ejecución por definir | idClinica e idConsultaProcedimiento, first, max | idConsultaProcedimientoPaso, idConsultaProcedimiento, idPersonaRol, fechaInicio, fechaFin, estado según catálogo autorizado; no FK inventada a ProcedimientoPaso. |
| OrdenExamen / P4 | `v1/orden_examen` | RL; comandos de emisión/cambio por definir | idClinica e idConsultaProcedimientoPaso, first, max | idOrdenExamen, idConsultaProcedimientoPaso, fechaCreacion; indicaciones con permisos y contrato específico. |
| ExamenResultado / P4 | `v1/examen_resultado` | RL restringida; registro/corrección auditables por definir | idClinica e idOrdenExamen, first, max | idExamenResultado, idOrdenExamen, fechaCreacion; resultado/interpretacion con autorización explícita; sin rutaAtestado interna. |

Las propuestas de W de catálogo no autorizan borrar registros referenciados.
Para P3/P4 no se presume que editar/eliminar una entidad clínica sea una
operación CRUD válida; deben definirse estados, transacciones y auditoría.
Las ampliaciones de TipoDocumento/Clínica/Consulta existentes también requieren
un contrato nuevo para cada método; los DAO actuales no las habilitan.

## Consultas especializadas que no deben perderse

- ExamenTipoExamenDAO: filtrar por examen, contar sus relaciones y comprobar
  duplicado examen/tipo. Proponer listado con filtro y Total-registros;
  comprobar duplicados en el servidor al escribir, sin inventar /count.
- ProcedimientoPasoDAO: filtrar/contar por procedimiento y obtener paso inicial.
  Mantener en Java la validación de raíz única, conexiones y ciclos. La forma
  HTTP de obtener el paso inicial sigue por diseñar; no se replica el algoritmo.
- ProcedimientoPasoExamenDAO: listar/contar desde paso o examen. El total debe
  corresponder al mismo filtro; especificar si ambos filtros son combinables.
- PersonaRolDAO: búsquedas por clínica y rol, responsables, pacientes y
  existencia de asignación. Las reglas actuales de rol/clínica activa siguen
  en backend; no se envían nombres de rol fijos desde el navegador ni se expone
  búsqueda por DUI a actores no autorizados.
- DocumentoDAO y MedioContactoDAO: conservar unicidad de tipo/valor/persona
  con exclusión del registro editado. No convertir comprobaciones globales de
  existencia en un oráculo público de datos personales.
- TipoDocumentoDAO: existeNombreNormalizado sigue siendo regla del servidor;
  la API 0.2 no publica ni escritura ni un endpoint de búsqueda de duplicados.

OrdenDAO y FiltroDAO son records para Criteria/PrimeFaces; no son recursos.
No se propone un endpoint que acepte nombres JPA arbitrarios, operadores o SQL.
Cada filtro HTTP debe tener nombre, tipo, alcance y permiso explícitos.

## Contrato común a decidir por recurso

Propuesta para revisión de Fernando:

- Rutas/métodos exactos y ApplicationPath; revisión de OpenAPI o documento
  canónico con correspondencia a clase Resource y pruebas HTTP.
- UUID canónico, IDs obligatorios del contexto y comportamiento ante ámbito
  ajeno (por ejemplo mismo 404 que inexistente, según política acordada).
- DTO de lista y detalle con tipos/nulabilidad, fechas UTC y campos excluidos.
  DTO de creación/cambio separado: no aceptar colecciones ni propiedades JPA
  por asignación indiscriminada. Especificar quién genera UUID y fechas.
- first/max, máximo configurable del servidor, orden estable y
  Total-registros del mismo filtro. Es una propuesta de reutilización de la
  convención 0.2, no un límite o conteo nuevo fijado en el cliente.
- Si se permiten mutaciones: POST con 201 y ubicación/ID recuperable; PUT con
  200/204 según contrato; DELETE con 204 si es válido para el dominio. Fijar
  idempotencia, control de concurrencia, transacción y recuperación ante timeout.
- Errores propuestos: 401/403 para identidad/permisos, 404 para alcance o
  inexistencia, 405 para método no disponible, 409 para conflicto/duplicado o
  referencias, 422 para datos inválidos, 500 seguro. Reutilizar mensaje JSON
  solo si se aprueba esa convención para la nueva versión.
- CORS con origen exacto, métodos/cabeceras realmente admitidos y exposición
  de Total-registros/Location cuando correspondan. La autenticación futura
  puede requerir revisar credentials; omit solo está confirmado para API 0.2.
- Fixtures sintéticos, pruebas de datos vacíos, total, detalle ajeno,
  validación, errores, autorización y CORS. No validar los recursos nuevos con
  la base clinica del primer entregable.

## Activación en frontend después de aprobar

Añadir únicamente operaciones confirmadas a api-routes.js con fuente versionada,
validadores de DTO/parámetros y pruebas con Sinon. Mantener las demás bloqueadas.
Las clases DAO ya existen y usan DefaultDAO; no se necesitará duplicar Fetch ni
cambiar los imports públicos de Rodrigo para activar un contrato futuro.
