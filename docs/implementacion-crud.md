# Equivalencia JSF → JavaScript: progreso verificable

El dashboard, DashboardControl, DashboardPage y las tarjetas originales se conservan.
Gestión se monta dentro del mismo shell y menú; navegar no destruye filtros ni clínica.
API0.2 sigue disponible. APIv2 autenticada solo se habilita en galenos_demo_crud sintética.
Estado de esta matriz: implementación en curso, no equivalencia total.

| XHTML inspeccionado (Model homónimo) | Equivalente JavaScript | Estado |
| --- | --- | --- |
| Clinica | Menú Clínicas, CatalogoControl/CatalogoPage + ClinicaDAO v2 | Crear, listar/filtrar/paginar, detalle, editar/desactivar y eliminar con referencias verificadas |
| Rol | Menú Roles + RolDAO v2 | Crear, listar/filtrar/paginar, detalle, editar/desactivar y eliminar con referencias verificadas |
| TipoDocumento | Menú Tipos de documento + TipoDocumentoDAO v2 | Crear, listar/filtrar/paginar, detalle, editar/desactivar; sin DELETE como JSF |
| TipoMedioContacto | Menú Tipos de contacto + TipoMedioContactoDAO v2 | Crear, listar/filtrar/paginar, detalle, editar/desactivar; sin DELETE como JSF |
| TipoExamen | Menú Tipos de examen + TipoExamenDAO v2 | Crear, listar/filtrar/paginar, detalle, editar/desactivar; sin DELETE como JSF |
| CambiarRol | Contexto autenticado técnico de demo | Pendiente equivalencia funcional; selector JSF no autentica |
| Persona | Pendiente | Nombres, nacimiento, documentos/contactos/roles anidados |
| Documento | Pendiente, anidado Persona | Tipo/persona inmutables, regex, DUI/edad y duplicados |
| MedioContacto | Pendiente, anidado Persona | Tipo/persona inmutables, regex y duplicados |
| PersonaRol | Pendiente, anidado Persona | Clínica y rol persistidos, relaciones y duplicados |
| Consulta | Dashboard GET0.2 existente | Pendiente creación/edición y ejecución de procedimientos |
| Procedimiento | Pendiente | Catálogo y pasos relacionados |
| ProcedimientoPaso | Pendiente, anidado Procedimiento | Rol activo y paso inicial |
| ProcedimientoPasoExamen | Pendiente, anidado Paso | Relaciones y duplicados |
| ProcedimientoPasoSecuencia | Pendiente, anidado Paso | Secuencias, referencias y ciclos según servicio |
| Examen | Pendiente | Catálogo y tipos relacionados |
| ExamenTipoExamen | Pendiente, anidado Examen | Asociación existente |
| OrdenExamen | Pendiente | ConsultaProcedimientoPaso y Examen |
| ExamenResultado | Pendiente, relacionado Orden | Persistencia según Model |

## Inventario de los veinte DAO

Los cinco catálogos anteriores usan API_V2_ROUTES únicamente después de autenticar.
ConsultaDAO conserva GET0.2 para el dashboard. ConsultaProcedimientoDAO,
ConsultaProcedimientoPasoDAO, DocumentoDAO, ExamenDAO, ExamenResultadoDAO,
ExamenTipoExamenDAO, MedioContactoDAO, OrdenExamenDAO, PersonaDAO, PersonaRolDAO,
ProcedimientoDAO, ProcedimientoPasoDAO, ProcedimientoPasoExamenDAO y
ProcedimientoPasoSecuenciaDAO mantienen CONTRACT_PENDING hasta implementar su contrato.
El registro API_ROUTES original permanece compatible; cada aplicación escoge su contrato.

## Comprobaciones de los catálogos

JUnit (Model + servicio compartido) y pruebas unitarias JS separadas de integración.
HTTP real: autenticación401, lector403,422,404,405,409,201/Location,200,204,
creación/consulta/edición/desactivación de los cinco catálogos y SELECT independiente a PostgreSQL.
Navegador Chromium real: mismos cinco formularios, editar/desactivar, eliminar Clínica/Rol,
lector sin escritura, credenciales erróneas visibles, móvil y regreso al dashboard con filtros/tarjetas intactos.
Sin mocks de Fetch en estas pruebas de navegador ni en las pruebas HTTP/PostgreSQL.

## Dependencia para datos reales

Falta acordar con Fernando el proveedor real de identidad, correspondencia actor↔PersonaRol,
y permisos por clínica/acción. Los usuarios técnicos BASIC del demo no habilitan datos reales.
No se modificó clinica ni el backend habitual. No se publican credenciales ni fixtures reales.
