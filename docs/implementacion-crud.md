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
| Persona | Menú Personas, PersonaControl/PersonaPage | Crear, buscar/paginar, GET/editar y asociaciones anidadas verificados por HTTP, PostgreSQL y navegador |
| Documento | Persona → Documentos | Crear/GET/editar/eliminar; tipo/persona inmutables, regex, DUI/edad y duplicados verificados |
| MedioContacto | Persona → Contactos | Crear/GET/editar/eliminar; tipo/persona inmutables, regex y duplicados verificados |
| PersonaRol | Persona → Roles y clínicas | Crear/GET/editar/eliminar; clínica autorizada, relaciones inmutables, duplicados/referencias409 verificados |
| Consulta | Dashboard y ConsultaGestionControl/ConsultaGestionPage | Crear/GET/editar, buscar paciente, asociar/editar procedimiento, paso automático y edición de estado/fechas verificados HTTP+navegador; órdenes/resultados pendientes |
| Procedimiento | Pendiente | Catálogo y pasos relacionados |
| ProcedimientoPaso | Pendiente, anidado Procedimiento | Rol activo y paso inicial |
| ProcedimientoPasoExamen | Pendiente, anidado Paso | Relaciones y duplicados |
| ProcedimientoPasoSecuencia | Pendiente, anidado Paso | Secuencias, referencias y ciclos según servicio |
| Examen | Pendiente | Catálogo y tipos relacionados |
| ExamenTipoExamen | Pendiente, anidado Examen | Asociación existente |
| OrdenExamen | Pendiente | ConsultaProcedimientoPaso y Examen |
| ExamenResultado | Pendiente, relacionado Orden | Persistencia según Model |

## Inventario de los veinte DAO

| DAO | Operaciones confirmadas en la aplicación |
| --- | --- |
| Clinica | GET0.2 selector antes del acceso; CRUDv2 catálogo y selector autorizado |
| Consulta | GET0.2 antes del acceso; GET/POST/PUTv2 tras autenticar |
| ConsultaProcedimiento | GET/POST/PUTv2 |
| ConsultaProcedimientoPaso | GET/PUTv2, sin creación manual |
| Documento | GET/POST/PUT/DELETEv2 |
| MedioContacto | GET/POST/PUT/DELETEv2 |
| Persona | GET/POST/PUTv2, sin DELETE |
| PersonaRol | GET/POST/PUT/DELETEv2 y búsqueda GET de pacientes |
| Rol | GET/POST/PUT/DELETEv2 |
| TipoDocumento | GET0.2 y GET/POST/PUTv2 |
| TipoExamen | GET/POST/PUTv2 |
| TipoMedioContacto | GET/POST/PUTv2 |
| Procedimiento | GETv2 de activos para asociación; CRUD pendiente |
| ProcedimientoPaso | CONTRACT_PENDING |
| ProcedimientoPasoExamen | CONTRACT_PENDING |
| ProcedimientoPasoSecuencia | CONTRACT_PENDING |
| Examen | CONTRACT_PENDING |
| ExamenTipoExamen | CONTRACT_PENDING |
| OrdenExamen | CONTRACT_PENDING |
| ExamenResultado | CONTRACT_PENDING |

El registro API_ROUTES0.2 permanece compatible: operaciones nuevas se seleccionan explícitamente mediante API_V2_ROUTES tras autenticar.
No se habilitan operaciones pendientes en el contrato original ni se simula su resultado.

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

## Evidencia adicional de Consulta y Persona

HTTP real de Consulta:3 pruebas con creación/GET/edición, asociación, paso automático/estado, alcance por clínica y errores de relaciones/fechas.
Navegador real de Consulta:1 flujo completo, conserva tarjetas y filtros al navegar.
HTTP real de Persona:3 pruebas con CRUD de asociaciones, SELECT independiente, duplicados409, relaciones422,
clínica403, DUI/edad422 y conservación del valor persistido tras rechazo.
Navegador real de Persona:1 flujo de crear/editar persona, documento/contacto/rol y eliminación de asignación.
Las suites JUnit existentes ejecutan las reglas ahora compartidas; no se eliminaron pruebas.
DuiMayoriaEdadModelTest conserva sus aserciones y adapta el doble a DocumentoDAO.poseeDui,
que reemplaza la carga ilimitada de documentos por COUNT case-insensitive de tipos DUI.
