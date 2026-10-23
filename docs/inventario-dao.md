# Inventario de entidades y DAO — GalenosSV

Revisión inicial de backend: [e4edd6c6](https://github.com/Fernando-rtx/Galenos/tree/e4edd6c6da3baa0988182d60f48cb9eccfd54e93).
Revalidación final contra `main` en `d7ff967` (2026-10-23): no cambió el código
Java de entidades, DAO, recursos ni DTO; se corrigió el arranque del demo y se
añadió evidencia de navegador. Frontend auditado desde `main` en `9a627c6`,
que incluye el merge de PR #1 (`d0025b3`) y la evidencia de Fernando.
Se leyeron las 20 entidades, los 20 DAO concretos, DefaultDAO/DAOInterface,
interfaces especializadas, OrdenDAO y FiltroDAO. El contrato publicado continúa
siendo [API 0.2](api-contract.md); RestApplication registra solo TipoDocumento,
Clínica y Consulta. La actualización de demo no publica nuevos recursos.

Hay **20 clases DAO JavaScript**, una por entidad: 3 consumen REST confirmado
(5 lecturas) y 17 bloquean todas sus operaciones con CONTRACT_PENDING, sin
construir URLs ni enviar Fetch. Las escrituras de los 20 están bloqueadas; los
3 confirmados usan OPERATION_UNSUPPORTED para métodos no publicados. La
integración ejecutada, o su ausencia, se registra aparte en verificacion.md.

## Matriz de operaciones del frontend

| DAO | findRange | findById | create / update / deleteById | Estado REST |
|---|---|---|---|---|
| ClinicaDAO | Confirmado (demo) | No publicado | No publicados | GET v1/clinica |
| ConsultaDAO | Confirmado (demo y clínica) | Confirmado (demo y clínica) | No publicados | GET v1/consulta y v1/consulta/{id} |
| ConsultaProcedimientoDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |
| ConsultaProcedimientoPasoDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |
| DocumentoDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |
| ExamenDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |
| ExamenResultadoDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |
| ExamenTipoExamenDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |
| MedioContactoDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |
| OrdenExamenDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |
| PersonaDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |
| PersonaRolDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |
| ProcedimientoDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |
| ProcedimientoPasoDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |
| ProcedimientoPasoExamenDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |
| ProcedimientoPasoSecuenciaDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |
| RolDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |
| TipoDocumentoDAO | Confirmado | Confirmado | No publicados | GET v1/tipo_documento y v1/tipo_documento/{id} |
| TipoExamenDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |
| TipoMedioContactoDAO | Pendiente | Pendiente | No publicados | Sin recurso/DTO REST; CONTRACT_PENDING |

Las 17 clases pendientes están construidas, configuradas, exportadas y probadas;
no se consideran integraciones funcionales. La ausencia de contrato tiene
prioridad sobre la validación de argumentos: incluso con ID o datos inválidos
se rechaza CONTRACT_PENDING y no se inventa un esquema de DTO. Los validadores
UUID, fechas y rangos se comparten cuando el contrato sí está confirmado.

## Persistencia Java: campos y relaciones observados

Esta tabla describe **JPA**, no el JSON público ni un esquema de validación del
navegador. Todos los ID primarios son UUID. Date corresponde a TIMESTAMP en
estas clases; su formato JSON solo se conoce para los DTO publicados. Las
colecciones son relaciones inversas y no se copian al cliente.

| Entidad / tabla | PK | Campos escalares Java (sin PK) | Relaciones JPA |
|---|---|---|---|
| Clinica / clinica | idClinica: UUID | nombre: String; activo: Boolean; tipo: String; comentarios: String | personaRolCollection: Collection&lt;PersonaRol&gt; (OneToMany) |
| Consulta / consulta | idConsulta: UUID | fechaInicio: Date; fechaFin: Date; referenciaExterna: String; observaciones: String | idPersonaRol: PersonaRol (ManyToOne); consultaProcedimientoCollection: Collection&lt;ConsultaProcedimiento&gt; (OneToMany) |
| ConsultaProcedimiento / consulta_procedimiento | idConsultaProcedimiento: UUID | idProcedimiento: UUID; fechaInicio: Date; fechaFin: Date; observaciones: String | consultaProcedimientoPasoCollection: Collection&lt;ConsultaProcedimientoPaso&gt; (OneToMany); idConsulta: Consulta (ManyToOne) |
| ConsultaProcedimientoPaso / consulta_procedimiento_paso | idConsultaProcedimientoPaso: UUID | fechaInicio: Date; fechaFin: Date; estado: String | idConsultaProcedimiento: ConsultaProcedimiento (ManyToOne); idPersonaRol: PersonaRol (ManyToOne); ordenExamenCollection: Collection&lt;OrdenExamen&gt; (OneToMany) |
| Documento / documento | idDocumento: UUID | valor: String; rutaFisica: String | idPersona: Persona (ManyToOne); idTipoDocumento: TipoDocumento (ManyToOne) |
| Examen / examen | idExamen: UUID | nombre: String; activo: Boolean; observaciones: String | examenTipoExamenCollection: Collection&lt;ExamenTipoExamen&gt; (OneToMany); procedimientoPasoExamenCollection: Collection&lt;ProcedimientoPasoExamen&gt; (OneToMany) |
| ExamenResultado / examen_resultado | idExamenResultado: UUID | fechaCreacion: Date; resultado: String; interpretacion: String; rutaAtestado: String | idOrdenExamen: OrdenExamen (ManyToOne) |
| ExamenTipoExamen / examen_tipo_examen | idExamenTipoExamen: UUID | fechaCreacion: Date; observaciones: String | idExamen: Examen (ManyToOne); idTipoExamen: TipoExamen (ManyToOne) |
| MedioContacto / medio_contacto | idMedioContacto: UUID | valor: String; fechaCreacion: Date | idPersona: Persona (ManyToOne); idTipoMedioContacto: TipoMedioContacto (ManyToOne) |
| OrdenExamen / orden_examen | idOrdenExamen: UUID | fechaCreacion: Date; indicaciones: String | examenResultadoCollection: Collection&lt;ExamenResultado&gt; (OneToMany); idConsultaProcedimientoPaso: ConsultaProcedimientoPaso (ManyToOne) |
| Persona / persona | idPersona: UUID | nombres: String; apellidos: String; fechaNacimiento: Date; fechaCreacion: Date | medioContactoCollection: Collection&lt;MedioContacto&gt; (OneToMany); documentoCollection: Collection&lt;Documento&gt; (OneToMany); personaRolCollection: Collection&lt;PersonaRol&gt; (OneToMany) |
| PersonaRol / persona_rol | idPersonaRol: UUID | fechaCreacion: Date | consultaProcedimientoPasoCollection: Collection&lt;ConsultaProcedimientoPaso&gt; (OneToMany); idClinica: Clinica (ManyToOne); idPersona: Persona (ManyToOne); idRol: Rol (ManyToOne); consultaCollection: Collection&lt;Consulta&gt; (OneToMany) |
| Procedimiento / procedimiento | idProcedimiento: UUID | nombre: String; activo: Boolean; observaciones: String | procedimientoPasoCollection: Collection&lt;ProcedimientoPaso&gt; (OneToMany) |
| ProcedimientoPaso / procedimiento_paso | idProcedimientoPaso: UUID | nombre: String; indicaFin: Boolean | procedimientoPasoSecuenciaCollection: Collection&lt;ProcedimientoPasoSecuencia&gt; (OneToMany); procedimientoPasoExamenCollection: Collection&lt;ProcedimientoPasoExamen&gt; (OneToMany); idProcedimiento: Procedimiento (ManyToOne); idRol: Rol (ManyToOne) |
| ProcedimientoPasoExamen / procedimiento_paso_examen | idProcedimientoPasoExamen: UUID | fechaCreacion: Date; activo: Boolean; observaciones: String | idExamen: Examen (ManyToOne); idProcedimientoPaso: ProcedimientoPaso (ManyToOne) |
| ProcedimientoPasoSecuencia / procedimiento_paso_secuencia | idProcedimientoPasoSecuencia: UUID | idProcedimientoPasoReferencia: UUID; tipoSecuencia: String | idProcedimientoPaso: ProcedimientoPaso (ManyToOne) |
| Rol / rol | idRol: UUID | nombre: String; activo: Boolean; observaciones: String | personaRolCollection: Collection&lt;PersonaRol&gt; (OneToMany); procedimientoPasoCollection: Collection&lt;ProcedimientoPaso&gt; (OneToMany) |
| TipoDocumento / tipo_documento | idTipoDocumento: UUID | nombre: String; indicaciones: String; expresionRegular: String; activo: Boolean | documentoCollection: Collection&lt;Documento&gt; (OneToMany) |
| TipoExamen / tipo_examen | idTipoExamen: UUID | nombre: String; activo: Boolean; observaciones: String | examenTipoExamenCollection: Collection&lt;ExamenTipoExamen&gt; (OneToMany) |
| TipoMedioContacto / tipo_medio_contacto | idTipoMedioContacto: UUID | nombre: String; indicaciones: String; expresionRegular: String; activo: Boolean | medioContactoCollection: Collection&lt;MedioContacto&gt; (OneToMany) |

Dos referencias merecen atención: ConsultaProcedimiento.idProcedimiento y
ProcedimientoPasoSecuencia.idProcedimientoPasoReferencia son UUID escalares,
no propiedades ManyToOne. ConsultaProcedimientoPaso no tiene FK a la plantilla
ProcedimientoPaso: no se crea esa relación en JSON ni en un modelo de cliente.

## Consultas especializadas del backend

Todos los DAO concretos heredan guardar, buscarPorId, obtenerTodos,
obtenerPagina, actualizar, eliminar, contar y obtenerId desde DefaultDAO Java.
Eso no habilita esos métodos por HTTP. Los DAO sin métodos adicionales solo
seleccionan su clase de entidad.

| DAO Java | Métodos adicionales observados (aún sin contrato HTTP salvo lecturas generales publicadas) |
|---|---|
| DocumentoDAO | `existeDocumento(UUID idTipoDocumento, String valor)`; `existeDocumento(UUID idTipoDocumento, String valor, UUID idDocumentoExcluir)`; `existeTipoParaPersona(UUID idPersona, UUID idTipoDocumento, UUID idDocumentoExcluir)` |
| ExamenTipoExamenDAO | `findByIdExamen(UUID idExamen, int first, int max)`; `countByIdExamen(UUID idExamen)`; `countByIdExamenAndIdTipoExamen(UUID idExamen, UUID idTipoExamen)` |
| MedioContactoDAO | `existeContacto(UUID idPersona, UUID idTipoMedioContacto, String valor, UUID idMedioContactoExcluir)` |
| PersonaRolDAO | `buscarPacientesPorClinica(UUID clinica, String criterio, int limite)`; `buscarResponsablesPorClinicaYRol(UUID clinica, UUID rol)`; `buscarPorRolYClinica(UUID idRol, UUID idClinica)`; `buscarPorClinica(UUID idClinica)`; `existeAsignacion(UUID idPersona, UUID idClinica, UUID idRol)` |
| ProcedimientoPasoDAO | `obtenerPasoInicial(UUID idProcedimiento)`; `findByIdProcedimiento(UUID idProcedimiento, int first, int max)`; `countByIdProcedimiento(UUID idProcedimiento)` |
| ProcedimientoPasoExamenDAO | `findByIdProcedimientoPaso(UUID idProcedimientoPaso, int first, int max)`; `countByIdProcedimientoPaso(UUID idProcedimientoPaso)`; `findByIdExamen(UUID idExamen, int first, int max)`; `countByIdExamen(UUID idExamen)` |
| TipoDocumentoDAO | `existeNombreNormalizado(String nombre, UUID idTipoDocumentoExcluir)` |

ProcedimientoPasoDAO también determina una raíz única y comprueba ciclos de
la plantilla en el servidor. Esa lógica de flujo permanece en Java; no se
reimplementa en el navegador. Las comprobaciones existeDocumento,
existeTipoParaPersona, existeContacto, existeAsignacion y existeNombreNormalizado
son invariantes de persistencia y deben seguir aplicándose en el backend.

## OrdenDAO y FiltroDAO

Son records inmutables, no entidades ni servicios REST. OrdenDAO contiene
campo y DireccionOrden; FiltroDAO contiene campo, OperadorFiltro y valor, con
restricciones para valores null. DefaultDAO Java los traduce a Criteria API.
No hay OrdenDAO.js ni FiltroDAO.js porque API 0.2 no admite orden libre ni un
lenguaje genérico de filtros. El frontend usa options.query y esquemas de
parámetros publicados; las listas actuales ordenan por UUID en el servidor.

## JPA, DTO público y modelo del cliente

La entidad JPA es persistencia; el DTO REST limita campos/nulabilidad; el
cliente conserva ese DTO en DefaultResponse.datos. Solo se validan los DTO
confirmados con funciones puras: no se generan 20 clases espejo con getters,
colecciones o propiedades personales. DefaultResponse/DefaultError son los
modelos comunes del cliente y no dependen del DOM ni de Fetch.

Las propuestas futuras, separadas de la configuración ejecutable, están en
[necesidades-backend.md](necesidades-backend.md). Uso desde Boundary:
[consumo-dao-rodrigo.md](consumo-dao-rodrigo.md).
