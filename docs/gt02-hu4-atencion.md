# HU4 — Atención de consulta activa

Rama en ambos repositorios: `feat/gt02-hu4-atencion`, desde HU3 frontend
`76aa8f7` y backend `63f361a`. Sin merge ni push a main.

## Implementación

Se reutilizan GalenosAcademicApp, AcademicCareControl, AcademicCareService,
IdentificacionControl y el contexto HU2/HU3. No se crean pantallas, Services,
DAO, entidades ni endpoints paralelos. La pantalla sigue siendo un Custom Element
de la SPA, con ECMAScript y CSS propios.

| Requisito | Implementado y verificación disponible |
|---|---|
| Abrir desde HU3 | Selección de la página actual, GET autorizado y navegación SPA. Comprobado con mocks; falta una consulta real atendible. |
| Contexto e información | Paciente, clínica, empleado, rol, fecha de consulta, procedimiento, paso y estado obtenidos del DTO. Valor actual y órdenes separados del historial previo. |
| Registro | Nota obligatoria, máximo10000 caracteres, guardar parcial y recarga del detalle. El éxito depende de una respuesta REST satisfactoria. |
| Exámenes | Catálogo por ProcedimientoPasoExamen/Examen activos, órdenes y resultados existentes visibles; rechazo de ajenos y duplicados. JUnit/Mockito, contrato cliente y DOM comprobados. Persistencia pendiente. |
| Avance | Destino enlazado del mismo procedimiento, rol válido y responsable de la clínica. Bifurcación exige selección explícita. Comprobado con JUnit y formulario simulado. |
| Retroceso | Solo ejecuciones completadas enlazadas directamente al paso actual, del mismo procedimiento y anteriores a su inicio. Varias opciones requieren elegir; no usa simplemente el último registro por fecha. |
| Historial/responsable | Retroceso crea una ejecución nueva, marca la abandonada RETROCEDIDO y conserva el registro completado y su responsable. No borra historial ni elige otro empleado automáticamente. |
| Primer/último paso | Sin predecesor válido no se retrocede; finalizar exige indicaFin. No se deducen estos estados por índices de una lista lineal. |
| Conflictos | Bloqueo PESSIMISTIC_WRITE de Consulta, UUID del paso vigente y transacción REQUIRED. Mapeo de conflictos JPA a409. Verificado con dobles JPA; concurrencia y rollback SQL reales pendientes. |
| UX | Carga, validación, éxito, errores, actualización y borrador conservado tras fallo. Un envío simultáneo produce una sola llamada al servicio; una respuesta tardía no restaura información de otro contexto. |
| Regreso | Dashboard consulta nuevamente manteniendo filtros/página. La confirmación de transición no reemplaza un posible error de la bandeja. |

El backend valida al responsable antes de mostrar incluso el diagnóstico de una
ejecución sin plantilla. Persona, rol, clínica, asignación y estado se revalidan;
una plantilla de otro procedimiento, un procedimiento inactivo/cerrado o un paso
no vigente impiden guardar. Los roles se obtienen del modelo, sin listas manuales.

Nota, transición, responsable y todos los exámenes se validan antes de modificar
entidades. Las órdenes ya existentes para la pareja ejecución/examen se reutilizan.
Los errores de persistencia se propagan; FlujoConsultaException mantiene
`@ApplicationException(rollback=true)`. Mockito comprueba orden de llamadas y
rechazos sin modificaciones, pero **no reproduce una transacción PostgreSQL**.

Un guardado con resultado incierto por red/servidor conserva el texto y requiere
«Actualizar paso» antes de reenviar. No se reintenta automáticamente un POST ni se
considera que cancelarlo deshace una escritura. No hay almacenamiento clínico offline.
El shell PWA se actualiza a v20; la lista de recursos públicos sigue cerrada.

## Contratos reutilizados

Base `/GalenosSV/resources/`. Bearer y X-Persona-Rol identifican la sesión y
asignación; los UUID del formulario no conceden permisos.

- GET `v2/atencion/consulta/{id}`: idPersona/idClinica/idRol → CareDetail.
- POST `v2/atencion/registrar`: contexto, idConsulta,
  idConsultaProcedimientoPaso, accion, valor, examenes e idPasoSiguiente opcional.
- Se conserva el alias POST por consulta existente.
- Extensión opcional: idConsultaProcedimientoPasoAnterior para elegir entre
  predecesores válidos. Un UUID ajeno se rechaza, no se sustituye silenciosamente.
- CareDetail agrega fechaConsulta, empleado, idPersonaRol,
  idConsultaProcedimiento, estadoPasoActual, ordenesActuales y anteriores.
- Se mantienen401 sesión,403 permiso,404 consulta no disponible en la clínica,
 409 conflicto,422 validación y500 interno, sin SQL ni trazas públicas.

El cliente admite el DTO anterior y el ampliado; desplegar frontend/backend
coordinadamente porque el cliente anterior comprobaba claves exactas. El contrato
definitivo está ampliado en `docs/gt02-contratos-rest.md` del backend.

## Estado real de clinica y estrategia cancelada

Las comprobaciones SQL fueron SELECT dentro de BEGIN READ ONLY. La conexión normal
permanece en **clinica**, con generación automática de esquema desactivada.
No se crearon bases, migraciones ni datos de demostración. Se retiraron el fixture
HU4 y el ensayo HTTP de escritura que se habían preparado; no llegaron a ejecutarse.
El runner de base temporal existente quedó sin cambios de esta rama.

La base contiene20tablas,2consultas,1asociación ConsultaProcedimiento y1ejecución
EN_CURSO. No hay pasos COMPLETADO ni consultas atendibles para la asignación
comprobada. También existen1orden y1resultado anteriores, que se conservaron.

La ejecución `e0da3669…` de la consulta `a11b2f21…` tiene
id_procedimiento_paso NULL. **El mapeo JPA ya existe** y la columna está presente;
es un registro incompleto, no una relación que falte declarar en Java. Su
procedimiento está inactivo y tiene dos plantillas con el mismo rol. Las relaciones
restantes no permiten determinar inequívocamente cuál se ejecutaba. No existe
auditoría suficiente para atribuir su creación. No se asignó un UUID por deducción.

Además, **orden_examen no tiene id_examen**, aunque OrdenExamen.java ya lo mapea.
El esquema versionado y una migración anterior del repositorio contemplan esa FK;
la migración no se ejecutó. Las otras relaciones no identifican unívocamente el
examen individual de una orden: no se inferirá desde indicaciones ni desde una
lista de exámenes permitidos. Bajo la prohibición actual de cambiar el esquema,
esta incompatibilidad queda bloqueada y puede impedir cargar/registrar órdenes.
No se ocultó el problema eliminando validaciones o inventando información.

## Pruebas y evidencia

Las pruebas JUnit/Mockito y JavaScript usan datos sintéticos solo dentro de test/;
no se insertan en PostgreSQL ni forman parte de los datos de la aplicación.

| Comprobación | Resultado |
|---|---|
| Maven/JUnit/Mockito | 842 pruebas; cero fallos, errores u omitidas |
| npm test | 504 aprobadas |
| npm run check | 110 archivos válidos; el .mjs se ejecuta también en Chromium |
| npm run test:transport | 9 aprobadas contra HTTP sintético local |
| Chromium, formulario con mocks | Guardado único, validación, exámenes, ramas, retroceso, errores y limpieza de contexto; escritorio/móvil sin desbordamiento |
| Chromium + REST real | Identificación y bandeja200; consulta de otro responsable403, sin exponer historial;20tablas con hashes iguales antes/después |
| Regresión HU3 en Chromium | 7 comprobaciones reales y fixture de tarjetas/historial/paginación aprobados; sin errores JavaScript |
| Regresión HU1/HU2/PWA | 12 comprobaciones reales aprobadas, incluyendo PDF Java y caída/restablecimiento del runtime de lectura |
| Backend normal9080 | Identificación200, bandeja200 y consulta de otro responsable403;20tablas sin cambios |

Para las lecturas se compiló el backend de la rama y se utilizó Liberty19084 con
JDBC `default_transaction_read_only=on` hacia la misma **clinica**. El servidor
normal9080 y BrowserSync3000 se conservaron. El script no envía POST de atención:
solo inicia/cierra sesiones académicas en memoria Java y consulta REST/SQL.
La comprobación adicional en9080 confirmó que el servidor normal también ejecuta
la comprobación actual de responsable antes de exponer el problema de plantilla;
no se ejecutó registro de atención. Al finalizar permanecieron encendidos
BrowserSync3000 y el backend normal9080; el runtime temporal de lectura quedó detenido.

Evidencia local ignorada por Git: `coverage/hu4/resultado.json`,
`coverage/hu4/formulario-sintetico.png` y `formulario-movil-sintetico.png`.
Las capturas del formulario son explícitamente sintéticas, no evidencia de
persistencia. El JSON no contiene documentos ni tokens.

## Pendiente antes de un recorrido manual

No se ejecutaron INSERT/UPDATE/DELETE, transiciones ni registro de órdenes en
clinica. **Guardar, avanzar, retroceder, finalizar, rollback y concurrencia no se
declaran comprobados con persistencia real.** La lógica y el transporte están
preparados; las limitaciones anteriores impiden certificar HU4 completa.

Hace falta una consulta con asignación válida, procedimiento habilitado y paso
enlazado, además de resolver mediante una decisión revisada la incompatibilidad
entre el mapeo de órdenes y el esquema. No se activa ningún rol/procedimiento ni
se corrige la ejecución antigua automáticamente. Una consulta nueva puede
prepararse mediante las funcionalidades normales de Consulta/ConsultaProcedimiento,
que crean el paso inicial con su plantilla y responsable; eso también requiere
autorización de escritura y un catálogo coherente.

Cuando exista un caso adecuado, se identificarán previamente sus UUID y los
registros afectados: valor/estado/fecha de ejecución, nuevas órdenes,
nueva ejecución al transicionar y fechaFin del procedimiento al finalizar.
Solo después de autorización expresa se realizará el recorrido desde el frontend
normal3000 y backend9080. Este informe no autoriza esas operaciones.

## Archivos y commits

Frontend: `galenos-academic-app.js`, `AcademicCareControl.js`, `api-v2-routes.js`,
`service-worker.js`, los tests `academic-care.test.js`, `hu4-atencion.test.js`,
`hu4_componentes.html`, `hu4_atencion.mjs` y este informe.
Backend: `AcademicCareService.java`, `AcademicCareResource.java`,
`ApiExceptionMapper.java`, los cinco bundles i18n, `AcademicCareServiceTest.java`,
`AtencionConflictoHttpTest.java` y el contrato compartido.

- Backend `c72ed0f`: atención, autorización, retroceso enlazado, contrato y tests.
- Frontend `d033bd9`: formulario, contexto, transiciones, errores y pruebas.
- Este informe se registra en un commit documental posterior.

La aplicación normal continúa en `http://127.0.0.1:3000`, con backend en9080 y base
clinica. Para arrancarla si estuviera detenida: `npm run dev` desde
`~/Desktop/GalenoSVFE`; `mvn package` y `mvn liberty:run` desde
`~/Desktop/GalenosSV_Actualizado`, utilizando su configuración JDBC existente.
No iniciar una segunda instancia sobre un puerto ya ocupado ni ejecutar scripts
de fixtures. Un reinicio o despliegue no autoriza operaciones clínicas de escritura.

## Aclaración posterior de los bloqueos

La inspección histórica y SQL detallada está en el backend,
`docs/gt02-hu4-bloqueos.md`. OrdenExamen.idExamen es una ampliación de noviembre,
no una relación del esquema original; su incorporación a clinica sigue pendiente
de revisión y autorización. La FK de plantilla ya existe con otro nombre y no
debe duplicarse. El nuevo informe contiene el plan mínimo SQL, su recuperación y
las condiciones de la consulta candidata; no se ejecutó ese plan.
El backend también impide que Paciente sea responsable del paso inicial
(`8f9c485`);843 pruebas Java aprobadas. El frontend de producción no cambió en
esta inspección y no se certifica persistencia real de HU4.

## Búsqueda de exámenes en atención

El Web Component galenos-academic-app muestra un cuadro de búsqueda en lugar de listar inicialmente todos los exámenes. Filtra en memoria únicamente los exámenes permitidos que devolvió el backend para ese paso, sin distinguir mayúsculas ni tildes. Muestra hasta diez coincidencias y permite seleccionar varios, conservarlos al cambiar la búsqueda y quitarlos desde la lista de seleccionados. Un término sin coincidencias muestra un aviso; no permite inventar exámenes ni modifica las órdenes históricas.

Enter dentro de la búsqueda no envía el formulario de atención. La nota no se reconstruye al buscar o quitar. Guardar conserva el contrato original: array de UUID seleccionados, validado por AcademicCareControl y por el backend. Buscar/seleccionar no registra nada por sí solo. Los controles continúan bloqueados durante el guardado.

Validación: fixture HU4 con búsquedas sin tildes, selección entre búsquedas, retirada, ausencia de coincidencias, nota conservada y UUID enviados; Chromium comprueba Enter real, escritorio/móvil y el resto de transiciones/conflictos sintéticos. Las pruebas de guardado usan mocks, no PostgreSQL. Para Safari recargar con el servidor activo y adoptar el shell v39; abrir una consulta con exámenes permitidos, escribir parte del nombre, marcar coincidencias y revisar seleccionados antes de guardar. No se añadieron librerías ni cambios de backend.
