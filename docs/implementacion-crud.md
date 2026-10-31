# Correspondencia del primer entregable

El dashboard original sigue siendo el centro de la aplicación. DashboardControl, DashboardPage,
TarjetaSimple y TarjetaConsulta conservan sus contratos. Los formularios y relaciones se montan
junto a ellos dentro del mismo menú. JSF y REST utilizan el WAR y datasource de clinica.

## Las 19 páginas

| XHTML | Acceso JavaScript / coordinación | Operaciones publicadas |
| --- | --- | --- |
| CambiarRol | Login Liberty + selector de clínica del dashboard | Identidad autenticada y clínicas autorizadas; no permite suplantar otra identidad eligiendo PersonaRol |
| Clinica | Menú Clínicas; CatalogoControl/CatalogoPage | Lista/filtro/página, detalle, crear, editar/desactivar, eliminar sin referencias |
| Rol | Menú Roles; CatalogoControl/CatalogoPage | Lista/filtro/página, detalle, crear, editar/desactivar, eliminar sin referencias |
| TipoDocumento | Menú Tipos de documento | Lista/filtro/página, detalle, crear y editar/desactivar |
| TipoMedioContacto | Menú Tipos de contacto | Lista/filtro/página, detalle, crear y editar/desactivar |
| TipoExamen | Menú Tipos de examen | Lista/filtro/página, detalle, crear y editar/desactivar |
| Persona | Menú Personas; PersonaControl/PersonaPage | Buscar nombres/apellidos, paginar, crear, abrir y editar |
| Documento | Persona → Documentos | Crear, recuperar, editar y eliminar asociación propia; tipo/persona inmutables |
| MedioContacto | Persona → Contactos | Crear, recuperar, editar y eliminar; tipo/persona inmutables |
| PersonaRol | Persona → Roles y clínicas | Crear, recuperar, editar y eliminar si no tiene referencias; clínica autorizada |
| Consulta | Dashboard; ConsultaGestionControl/ConsultaGestionPage | Buscar paciente, crear/recuperar/editar consulta, filtros, tarjetas, detalle, procedimientos y pasos |
| Procedimiento | Menú Procedimientos; CatalogoControl/CatalogoPage | Crear, filtrar/paginar, editar/desactivar, eliminar sin referencias y gestionar flujo |
| ProcedimientoPaso | Procedimiento → Gestionar pasos; ProcedimientoControl/ProcedimientoPage | Paso inicial y continuaciones, rol, exámenes, editar nombre/fin y eliminar paso terminal |
| ProcedimientoPasoExamen | Paso → Exámenes asociados; RelacionControl/RelacionPage | Crear, recuperar, editar observaciones/activo y quitar asociación |
| ProcedimientoPasoSecuencia | Paso → Secuencias; RelacionControl/RelacionPage | Crear, recuperar, editar tipo y quitar enlace; impide ciclos y duplicados |
| Examen | Menú Exámenes | Crear, filtrar/paginar, recuperar, editar/desactivar |
| ExamenTipoExamen | Examen → Tipos de examen; RelacionControl/RelacionPage | Crear, recuperar, editar observaciones y quitar asociación |
| OrdenExamen | Consulta → paso → Órdenes; OrdenControl/OrdenPage | Paginar, crear, recuperar y editar orden del paso |
| ExamenResultado | Orden → Resultados; OrdenControl/OrdenPage | Paginar, crear, recuperar y editar resultado |

No se agregaron DELETE de Persona, Consulta, Orden ni Resultado: sus pantallas no los ofrecen.
El modelo de OrdenExamen tiene FK a ConsultaProcedimientoPaso; no tiene FK a Examen.
Los pasos ejecutados de Consulta se crean automáticamente al asociar un procedimiento;
no se inventó una relación inexistente entre ConsultaProcedimientoPaso y la plantilla de paso.

CambiarRol tiene una adaptación de seguridad, no una copia literal: el actor REST es la identidad
verificada por Liberty. El selector visual JSF no concede identidad ni permisos de aplicación.
Una política clínica de producción que vincule cuentas a PersonaRol y permisos profesionales
requiere decisión del equipo. El perfil implementado es de desarrollo local, con administrador
y lector explícitos y alcance por UUID de clínica; no se presenta como autenticación de producción.

## Los veinte DAO y REST v2

Todas las listas usan first/max y Total-registros; todas las operaciones por ID utilizan UUID.
Las columnas de entrada/salida están documentadas en api-gestion-v2.md.

| DAO / ruta después de /resources/v2/ | Lista/ID | POST | PUT | DELETE |
| --- | --- | --- | --- | --- |
| ClinicaDAO / clinica | Sí | Sí | Sí | Sin referencias |
| RolDAO / rol | Sí | Sí | Sí | Sin referencias |
| TipoDocumentoDAO / tipo_documento | Sí | Sí | Sí | No |
| TipoMedioContactoDAO / tipo_medio_contacto | Sí | Sí | Sí | No |
| TipoExamenDAO / tipo_examen | Sí | Sí | Sí | No |
| PersonaDAO / persona | Sí | Sí | Sí | No |
| DocumentoDAO / documento | Sí | Sí | Sí | Sí |
| MedioContactoDAO / medio_contacto | Sí | Sí | Sí | Sí |
| PersonaRolDAO / persona_rol | Sí | Sí | Sí | Sin consultas/pasos que lo referencien |
| ConsultaDAO / consulta | Sí | Sí | Sí | No |
| ConsultaProcedimientoDAO / consulta_procedimiento | Sí | Sí | Sí | No |
| ConsultaProcedimientoPasoDAO / consulta_procedimiento_paso | Sí | Automático | Sí | No |
| ProcedimientoDAO / procedimiento | Sí | Sí | Sí | Sin referencias |
| ProcedimientoPasoDAO / procedimiento_paso | Sí | Sí, flujo | Sí | Terminal |
| ProcedimientoPasoExamenDAO / procedimiento_paso_examen | Sí | Sí | Sí | Sí |
| ProcedimientoPasoSecuenciaDAO / procedimiento_paso_secuencia | Sí | Sí | Sí | Sí |
| ExamenDAO / examen | Sí | Sí | Sí | No |
| ExamenTipoExamenDAO / examen_tipo_examen | Sí | Sí | Sí | Sí |
| OrdenExamenDAO / orden_examen | Sí | Sí | Sí | No |
| ExamenResultadoDAO / examen_resultado | Sí | Sí | Sí | No |

API_ROUTES0.2 permanece compatible con sus operaciones anteriores. Las nuevas operaciones
se seleccionan explícitamente mediante API_V2_ROUTES después de autenticar. Ningún DAO
pendiente se habilita mediante respuestas simuladas. Contexto y búsqueda acotada de pacientes
usan DefaultDAO.get/PersonaRolDAO.get con contratos publicados.

## Evidencia verificada en esta implementación

- Maven package/JUnit: 774 pruebas, 0 fallos, 0 errores, 0 omitidas; informe JaCoCo generado.
- npm test: 416 pruebas unitarias con dobles, 0 fallos.
- Transporte sintético: 9 pruebas; no acreditan PostgreSQL.
- Integración v2: 24 pruebas HTTP reales, incluyendo los veinte DAO, 401 y 403. Solo lectura.
- Chromium: ocho pruebas de flujo con registros DESARROLLO en clinica: persona/consulta,
  catálogos Examen/Procedimiento, flujo/pasos/orden/resultado, tres asociaciones,
  documentos/contactos, CRUD limitado de Clínica/Rol, ediciones de pasos/órdenes/resultados y navegación/cierre de sesión/móvil.
- Los flujos comprueban recuperación HTTP y SELECT independiente cuando corresponde.
  No interceptan Fetch ni simulan respuestas REST.
- Las 19 páginas JSF responden HTTP200; no equivale a probar manualmente cada formulario JSF.
- Se comprobó el rechazo de un ciclo sin crear el enlace y permisos antes de escribir datos.
- No se provocó una caída de PostgreSQL ni se afirma rollback real por observar un mock.

Las únicas eliminaciones en clinica afectan filas de desarrollo creadas expresamente por estas
pruebas. No se modificó la clínica original, no hubo limpieza masiva, migraciones ni respaldos.
No se eliminaron pruebas útiles. Los tests de Examen completan nombres válidos para comprobar
persistencia: sus aserciones originales se conservan. Los tests JSF ejecutan las reglas extraídas
a CatalogoService y ProcedimientoFlujoService. Las suites sintéticas antiguas se conservan
identificadas y no se ejecutan contra clinica.
