# Calidad de pruebas GT02

Fecha: 2026-11-13. Rama en ambos repositorios: `test/gt02-calidad-pruebas`.
Bases limpias: frontend `ff3dd98`, backend `31f64a9`. Sin merge ni push.

## Línea base y resultados

| Suite | Base | Final | Alcance |
|---|---:|---:|---|
| Mocha/Chai/Sinon (`npm test`) | 457 | 474 aprobadas | Unitarias con datos sintéticos |
| JUnit/Mockito (`mvn clean test`) | 803 | 824 aprobadas | Sin errores, fallos ni omitidas |
| `npm run check` | No medida | 103 archivos válidos | Sintaxis |
| `npm run test:transport` | No medida | 9 aprobadas | Fetch real contra HTTP sintético local |
| Chromium `test/browser/webcomponents_pwa.py` | No medida | Aprobado | Componentes, eventos, SPA, tema, móvil, manifest, instalación y shell offline |

Chromium usa ahora un servidor estático propio con puerto efímero y respuestas sintéticas, sin depender del servidor personal ni acceder a Java/PostgreSQL. Evidencia generada: `coverage/webcomponents-pwa.json`, sin errores JavaScript ni entradas clínicas en caché. Se corrigieron expectativas obsoletas de navegación (#main y enlace de empleados) para probar #academico y Login.

## Mejoras progresivas

1. HU1/HU2: dos pruebas de cancelación ahora fallan si la promesa resuelve. Se reutiliza `rejection`, se limpia el contexto compartido en `afterEach` y se elimina la segunda petición redundante en los casos HTTP. Backend usa identificadores deterministas en identificación y citas; comprueba citas distintas y filtros exactos de persona/fecha/paginación enviados al DAO. Se agregaron renovación de asignaciones y generación de ticket propio.
2. HU3/HU4: se comprueba cuerpo completo, ruta, sesión, caché y respuesta para las cuatro acciones. Se agregaron rechazos de datos y errores 403/409/500. La prueba del dashboard exige recibir estados antes de comprobarlos: un arreglo vacío ya no produce un falso positivo. `AcademicCareServiceTest` cubre asignaciones, acceso ajeno, paciente, conflictos, nota vacía, guardado parcial, avance, retroceso, finalización y órdenes de examen permitidas, duplicadas o existentes.
3. Compartidas: aislamiento del registro de peticiones HTTP entre tests. PWA verifica precarga pública existente, limpieza de versiones propias, prohibición de almacenar respuestas sensibles y recuperación offline. PDF comprueba escape de texto, longitud del stream y offsets xref, además de la cabecera.
4. Chromium detectó un defecto real: `galenos-notifications` estaba en HTML pero su módulo no se importaba. Único cambio de producción: importación del componente existente en `main.js`. La prueba de registro, deduplicación y cierre pasó después de corregirlo.

Se conservaron los tests de contratos, DAO, modelos, convertidores, validación, permisos y vistas. Aunque comparten patrones, protegen adaptadores y entidades distintos. No se eliminaron archivos ni casos por reducir el conteo. Se fusionaron las aserciones HTTP duplicadas dentro de la misma petición. No se agregaron dependencias.

## Cobertura real

Backend JaCoCo, ejecución final limpia:

| Métrica | Base | Final |
|---|---:|---:|
| Líneas | 3724/6200 (60,06 %) | 3857/6200 (62,21 %) |
| Ramas | 1968/4252 (46,28 %) | 2055/4252 (48,33 %) |
| Instrucciones | 16316/32188 | 17145/32188 |

Reporte reproducible: `mvn clean test`; `target/site/jacoco/index.html` y `jacoco.xml`. Permanecen 2343 líneas y 2197 ramas sin cubrir; no se afirma cobertura integral.

Frontend: `npm run test:coverage` ejecuta las suites Mocha con instrumentación nativa Node/V8 y genera `coverage/lcov.info` y `coverage/scope.json`. En Node 26.7.0: 2894/3247 líneas (89,13 %), 717/802 ramas (89,40 %), 216/267 funciones (80,90 %) de **44 archivos medidos**. Hay **27 archivos sin medición unitaria**, enumerados en `scope.json`: principalmente componentes DOM, composición SPA y controles Persona/Procedimiento/Relación. Esos porcentajes NO representan toda la aplicación. Chromium verifica varios de esos componentes, pero su cobertura no se suma a V8. No hay dependencias de producción nuevas.

## Revisión y límites

Se inventariaron los archivos unitarios, de transporte, navegador e integración de ambos repositorios y sus comportamientos; se revisaron patrones de aserción, aislamiento, fechas, mocks y contratos. La revisión detallada y las modificaciones se concentraron en los grupos anteriores. No se presenta este trabajo como una revisión exhaustiva línea por línea de todos los tests históricos.

Se conservaron sin ejecutar los escenarios HTTP Java/PostgreSQL y de navegador que escriben registros. No se creó una base nueva ni se consultó o modificó `clinica`. Mockito no demuestra ejecución JPQL, bloqueo pesimista, atomicidad ni rollback del contenedor. Estas integraciones siguen pendientes en una base sintética aislada. Los tests existentes que apuntan a servicios personales deben revisarse/configurarse antes de ejecutarlos.

El test PDF verifica estructura binaria; no certifica toda la presentación ni accesibilidad del documento. La regla de identificación basada en configuración de roles continúa en producción y no se cambió en esta tarea. Las pruebas de sesión usan sus reglas actuales, sin resolver esa decisión de negocio.

## Evidencia para la rúbrica

Las aserciones reforzadas detectan errores observables: resolución indebida tras cancelar, filtros de clínica incorrectos, pérdida del contexto de atención, transiciones inválidas, órdenes duplicadas, avisos no registrados y caché sensible. Los resultados y la cobertura sustentan mejoras de calidad y estabilidad, pero no justifican atribuir automáticamente el punto completo de cobertura integral ni declarar verificadas las cuatro historias contra PostgreSQL.
