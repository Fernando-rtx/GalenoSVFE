# HU3 — Dashboard del empleado

14/11/2026. Rama en ambos repositorios: `feat/gt02-hu3-dashboard`.
Base HU2 ya integrada: frontend `3d93dfd` (PR18), backend `1f911e0` (PR14).
Los cambios HU3 permanecen locales, sin merge ni push a main.

## Requisito y resultado

| Requisito HU3 | Implementación y comprobación |
|---|---|
| Empleado, clínica y rol | Se reutiliza el contexto HU2; clínicas propias y roles por clínica, conservando PersonaRol. Identificación y selección reales aprobadas. |
| Cambio de asignación | Borra tarjetas, selección y detalle; cancela lecturas e ignora respuestas tardías. Cambio entre dos clínicas comprobado con fixture sintético: no hay empleado real multiasignación disponible. |
| Consultas de hoy | Fecha dinámica de America/El_Salvador; Java convierte el rango local a instantes. Solicitud real automática 200 y encabezados comprobados. |
| Pasadas, futuras y rango | REST recibe los límites; pasado excluye hoy, futuro empieza mañana. Fechas inválidas/invertidas no se envían. Restablecer limpia documento y devuelve hoy. |
| Paginación | first/max=20 y Total-registros; orden estable por fechaInicio e idConsulta. Navegación 21 registros/2 páginas comprobada con fixture, no con PostgreSQL poblado. |
| Tarjetas | Web Component existente: paciente, clínica, inicio/fin, rol, procedimiento actual, paso y estado reales del DTO. Comprobado en navegador con datos sintéticos. |
| Historial jerárquico | Agrupa por ConsultaProcedimiento y enlaza plantillas según ProcedimientoPasoSecuencia; incluye solo ejecuciones previas COMPLETADO/RETROCEDIDO. Bifurcaciones, convergencias, repeticiones y ciclos comprobados con fixtures. |
| Ver registro | Panel nativo details, responsable, rol, fechas, estado, valor, órdenes y resultados; contenido literal mediante textContent, sin edición. Comprobado en navegador sintético. |
| Atender consulta | Conserva consulta/procedimiento/ejecución seleccionados y abre HU4 existente mediante GET. No registra ni avanza al abrir. Regreso conserva filtros; comprobado con servicio simulado. |
| Permisos y sesión | Revalidación Java por sesión, PersonaRol, persona, rol, clínica y paso. PersonaRol ajeno 403 y sesión revocada 401 comprobados por REST real. |
| Estados y SPA/PWA | 200 vacío separado de 401/403/red/servidor; reintento y descarte de respuestas obsoletas. Chromium comprobó desconexión/reconexión; regresión PWA conserva shell sin cachear REST/documentos/sesiones. |

## Componentes y archivos

Se reutilizan InicioSesionModel, IdentificacionControl, contexto-empleado,
AcademicCareService, AcademicCareControl, GalenosAcademicApp, tarjeta-consulta,
tarjeta-simple y la pantalla HU4. No hay Services, DAO ni endpoints duplicados.

Nuevos: `boundary/components/historial-consulta.js`, su CSS propio y
`boundary/modelos/historial-presentacion.js` (proyección de enlaces para la vista).
Boundary renderiza y emite consulta-atender; Control prepara contexto/filtros,
coordina cancelación y conserva la selección. El componente histórico no usa Fetch.

Otros cambios frontend: `galenos-academic-app.js`, `tarjeta_consulta.js`,
`AcademicCareControl.js`, `api-v2-routes.js`, `service-worker.js` (shell v18),
`test/unit/hu3-dashboard.test.js`, `test/browser/hu3_componentes.html` y
`test/browser/hu3_dashboard_readonly.mjs`.

Backend: `control/AcademicCareService.java`, su test JUnit y
`docs/gt02-contratos-rest.md`. No cambian entidades, tablas ni reglas de transición HU4.

## REST y JPA

Base: `/GalenosSV/resources/`. Se conservan todas las rutas.

| Método/ruta | Entrada → salida |
|---|---|
| GET v1/tipo_documento | Paginación → catálogo público; el acceso ofrece activos |
| POST v2/identidad_academica/empleado | idTipoDocumento, valor → token, expiraEn, contexto HU2 |
| GET/DELETE v2/identidad_academica/empleado | Bearer → actualizar contexto/revocar sesión |
| GET v2/empleado/consultas | Bearer + X-Persona-Rol; idPersona/idClinica/idRol, fechas, first/max y documento opcional → Appointment[] + Total-registros |
| GET v2/atencion/consulta/{id} | Mismo contexto autorizado → CareDetail HU4 existente |
| GET v2/paciente/citas | Sesión de paciente y clínica propia → Appointment[]; compatibilidad del cliente comprobada con respuesta real sin grupos |
| POST v2/identidad_academica/paciente; GET v2/citas_paciente; GET v2/citas_paciente/{id}/ticket | Flujo público HU1 independiente; regresión real de identificación/citas/PDF aprobada |

Appointment conserva el historial plano y agrega ids de procedimiento/ejecución
actual, estadoPasoActual y procedimientos con pasos previos y secuencias. El DTO
de HU4 y el DTO público de v2/citas_paciente no cambian. El cliente acepta también
el Appointment anterior. Desplegar frontend/backend coordinadamente: el cliente
anterior validaba claves exactas. El contrato completo está en el backend.

Listado y conteo comparten el predicado JPA: Consulta → ConsultaProcedimiento →
ConsultaProcedimientoPaso; persona/rol/clínica del responsable, clínica del paciente,
estado PENDIENTE/EN_CURSO y rol de la plantilla. El detalle vuelve a comprobar
persona, rol, clínica y plantilla. La autorización REST verifica sesión y que
X-Persona-Rol pertenezca a ella; los UUID del navegador no conceden permisos.

Los grupos históricos se consultan por idConsulta; ejecuciones por
idConsultaProcedimiento; enlaces por idProcedimiento de su paso origen. Cada árbol
conecta únicamente nodos que tienen ejecuciones previas dentro del mismo grupo.
No se deduce la secuencia ordenando fechas ni se muestran plantillas futuras como
pasos realizados. Las repeticiones conservan sus registros; los enlaces compartidos
y ciclos se señalan sin duplicarlos indefinidamente.

PersonaRol no tiene columna activo propia: se exige asignación existente con rol
y clínica activos, según HU2. La responsabilidad es individual por PersonaRol del
paso: compartir el rol Doctor no otorga todas las consultas de ese rol.

## Comprobaciones y límites reales

BrowserSync en3000 y WAR compilado de esta rama en Liberty19084, conectado a
**clinica**, JDBC `default_transaction_read_only=on`. El servidor normal9080 se
conservó. Se sustituyó solo la configuración de URL en el navegador de prueba;
los recorridos reales no simulan REST. El fixture sintético está separado bajo test/.

| Ejecución | Resultado |
|---|---|
| mvn test | 832 pruebas JUnit, 0 fallos/errores/omitidas; las nuevas usan JPA simulado |
| npm test | 495 aprobadas; 7 nuevas sobre fechas, contexto, selección y jerarquía |
| npm run check | Sintaxis válida en109 archivos; el script .mjs además se ejecutó |
| npm run test:transport | 9 aprobadas, HTTP sintético |
| Chromium HU3 | 7 comprobaciones reales, fixture DOM separado aprobado, 0 errores JavaScript |
| Regresión Chromium HU1/HU2 | 12 comprobaciones reales, incluyendo PDF Java, revocación, backend detenido/restablecido y PWA offline |
| Integridad PostgreSQL | Hashes del contenido de las20tablas iguales antes/después |

La consulta SQL de solo lectura encontró 2 consultas, 1 procedimiento asociado y
1 ejecución EN_CURSO. No existen pasos COMPLETADO ni consultas atendibles para el
Doctor seleccionado, incluso buscando el rango2000–2099. La ejecución existente
carece de id_procedimiento_paso: no satisface la autorización por rol de plantilla.
Por eso REST devuelve 200 vacío y la pantalla muestra «No hay consultas asignadas
para este rango de fechas». No se alteraron asignaciones para obtener tarjetas.

**Pendiente con datos reales:** tarjetas atendibles, historial poblado, Ver registro
y apertura autorizada de HU4. Se verificaron con JUnit/fixtures, no se certifica
integración persistida de esos casos. La proyección real de paciente devolvió cero
grupos, por lo que tampoco demuestra el nuevo historial anidado poblado. Hace falta
un caso clínico válido y pasos previos registrados; su preparación requiere
autorización o un entorno de escritura aislado. No se ejecutaron escrituras HU4.

La política heredada de creación/avance elige un responsable por orden UUID entre
los disponibles; no se cambió por una regla inventada. HU4 mantiene conflicto409
si hay múltiples ejecuciones activas en una consulta; la bandeja aplica la misma
comprobación, sin elegir arbitrariamente una. La vista admite jerarquías no lineales,
pero no introduce una política nueva de atención paralela. Safari no se certifica
en esta entrega; SafariDriver tiene la automatización remota desactivada.

Evidencia local ignorada por Git: `coverage/hu3/resultado.json`,
`coverage/hu3/dashboard.png` y `coverage/hu2/resultado.json`. Los JSON no contienen
tokens ni documentos. No se crearon bases, migraciones ni datos demostrativos.

## Reproducción y commits

Frontend: `~/Desktop/GalenoSVFE`, `npm run dev` (3000).
Backend: `~/Desktop/GalenosSV_Actualizado`, compilar/desplegar la rama con la
configuración privada existente de clinica (`mvn package`, `mvn liberty:run`);
no iniciar otra instancia sobre9080 si ya está ocupado.

Para repetir sin escrituras: empaquetar y usar
`python3 scripts/gt02_readonly_runtime.py stage`, después `run` en otra terminal.
Desde frontend ejecutar `node test/browser/hu3_dashboard_readonly.mjs` con
`GALENOS_BACKEND_URL=http://127.0.0.1:19084/GalenosSV/resources/`.
PLAYWRIGHT_MODULE y CHROMIUM_EXECUTABLE permiten reutilizar Playwright/Chromium
externos ya instalados. Al finalizar, detener solo ese runtime con la opción stop.

- Backend `63f361a`: historial por procedimiento, contexto atendible y contrato.
- Frontend `766f934`: tarjetas, jerarquía, filtros, contexto HU4 y pruebas.
- Este informe se registra en un commit documental posterior.
