Refactorización de pruebas GT02

Rama: refactor/gt02-pruebas-significativas. Solo pruebas, configuración de corredores y documentación.

Frontend: 507 → 419 unitarias; transporte: 9 → 9. Backend: 843 → 841.
88 casos redundantes retirados en frontend, 2 en backend. Archivo eliminado: EstadoCrudTest.java.

DefaultService: antes, cinco operaciones por cinco estados HTTP (25); después, cinco casos que distribuyen esos estados entre las operaciones. Se conservan HTML de error, JSON inválido, timeout, cancelación, cabeceras y detalles.
Inventario: antes, cinco operaciones con dos entradas por cada service pendiente; después, una petición representativa por service comprueba CONTRACT_PENDING y cero solicitudes. concrete-services conserva bloqueo explícito de las cinco operaciones por configuración.

Todos los archivos unitarios y de transporte usan suite/test y setup/teardown (suiteSetup/suiteTeardown cuando corresponde). .mocharc, transport y Mocha bajo V8 usan ui:tdd. No se renombraron archivos ni rutas de descubrimiento. El conteo unitario coincide con el ejecutado bajo cobertura.

npm test, npm run check, npm run test:transport, npm run test:coverage y mvn test pasan. Cobertura V8 antes/después idéntica: líneas 88.61%, ramas 88.12%, funciones 83.85% de los 46 módulos medidos; 31 módulos sin medir. No representa cobertura completa de la SPA. Cada ejecución imprime el directorio temporal con lcov.info y scope.json.

HU1: identidad, filtros, DTO y PDF conservados. HU2: roles, clínica, rechazo de pacientes, sesión y respuestas tardías conservados. HU3: asignaciones, fechas, historial y acceso ajeno conservados. HU4: notas, exámenes permitidos, avance, retroceso, conflictos y errores conservados. PWA, eventos, navegación, desconexión y exclusión de datos clínicos del caché conservados.
Backend conserva JUnit 5/Mockito, reglas de negocio, DAO, mapeos, asignaciones, transiciones, REST y PDF. No se sustituyó integración por mocks. Los scripts browser/integration se conservaron y auditaron como infraestructura separada; no se ejecutaron flujos con escrituras, PostgreSQL real ni navegador en esta tarea. mvn test no demuestra integración PostgreSQL.

Verificación de sensibilidad: copia temporal del frontend con HTTP_ERROR cambiado a ERROR_INCORRECTO produce seis fallos en DefaultService. El repositorio de producción permanece intacto. No se ejecutó una campaña exhaustiva de mutación.

auditoria.csv clasifica los casos declarados y archivos de infraestructura; las matrices dinámicas aparecen por su plantilla y se cuentan mediante el corredor. A se conserva; B se refactoriza; C se elimina con justificación. Se decidió conservar las demás matrices cuyos límites, tipos o permisos detectan errores distintos. No se identificó un defecto de producción que requiera modificación.

resultados.txt conserva los resúmenes de las ejecuciones. Los logs completos permanecen en /private/tmp/gt02-*.log. La ejecución Maven inicial en sandbox falló al instrumentar Mockito; se repitió con autorización y pasó, antes y después. La cobertura inicial se ejecutó también sobre un archivo de HEAD en /private/tmp para obtener una medición escribible y comparable con las mismas dependencias.
