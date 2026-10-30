# Correcciones verificadas — 30 de octubre de 2026

Estado global: **PARCIALMENTE COMPLETO**. Frontend revisado desde main
`4b7acf6`, backend desde main `d7ff967`, después de fetch. Ambas ramas se llaman
`fix/observaciones-ingeniero`; se publican para revisión, sin merge automático.

El frontend ya integraba DashboardControl, DashboardPage y TarjetaSimple /
TarjetaConsulta reales de Rodrigo. Su arquitectura Boundary–Control–Entity,
DefaultDAO, DefaultResponse, DefaultError, contratos y dependencias se conservan.
Los 17 DAO sin endpoint siguen bloqueados con CONTRACT_PENDING. No se habilitan
escrituras ni se modifican los Web Components de Rodrigo.

Cambios frontend: `test/unit/DefaultDAO.test.js` comprueba que cancelar mientras
se lee un HTTP 422 conserva estado, cabeceras, AbortSignal y limpieza del timer.
Es un caso sintético con Sinon, no una caída de PostgreSQL.
`test/browser/dashboard.py` consolida la prueba duplicada
`test_real_card_model_event_and_update` dentro de `test_real_card_contract`;
conserva la comprobación del evento compuesto, seis campos, null, fechas UTC y
actualización posterior del componente. No se eliminó cobertura de comportamiento.

La auditoría backend y sus hallazgos por archivo/método están en
[Galenos, docs/backend-audit.md](https://github.com/Fernando-rtx/Galenos/blob/fix/observaciones-ingeniero/docs/backend-audit.md).
Allí se documentan validación de contactos, Criteria, consultas especializadas,
servicio de Consulta compartido, mensajes JSF y las pruebas sustituidas.

| Validación de esta revisión | Aprobadas | Fallidas / omitidas |
|---|---:|---:|
| `npm ci` | instalación completada | — |
| `npm test`: unitarias/sintéticas | 402 | 0 / 0 |
| `npm run check` | 57 archivos con sintaxis válida | — |
| `npm run test:transport`: Fetch real a servidor sintético | 9 | 0 / 0 |
| `npm run test:integration`: DAO a REST real | 20 | 0 / 0 |
| Chromium 140.0.7339.16: dashboard y tarjetas | 19 | 0 / 0 |
| Maven clean package: JUnit y WAR | 757 | 0 / 0 |
| HTTP backend: TipoDocumento + Consulta/Clínica | 12 + 9 | 0 / 0 |
| JSF real: clínica y filtro diario de Consulta | 1 | 0 / 0 |
| HTTP 500 por conexión real inaccesible: tres recursos | 3 | 0 / 0 |
| Orquestador del demo, pruebas Python sintéticas | 10 | 0 / 0 |

JaCoCo Java: líneas 72.19%, ramas 53.35%, instrucciones 70.38%. Estos porcentajes
corresponden a pruebas unitarias, no demuestran rollback ni cobertura de PostgreSQL.

El navegador exigió tarjetas reales mediante GALENO_DASHBOARD_EXPECT_CARDS=1.
La suite mezcla lecturas REST reales con fallos HTTP/red interceptados y emisores
sintéticos, identificados en sus nombres. Verifica filtros, totales, paginación,
selección de clínica, detalle, teclado, reintentos, cancelación, DOM seguro y
vista móvil. El runner REST del navegador conserva sus 20 casos y comprueba CORS.
Los errores HTTP deliberados pueden aparecer en consola; los casos positivos
exigen ausencia de errores y la suite no admite excepciones JavaScript de página.
No se suman las mismas comprobaciones del runner como pruebas independientes.

Configuración efectiva: servidor exclusivo de revisión en localhost:19184, base
`galenos_demo_local` y contenedor `galenos-demo-itzep-final-20261028` en puerto
15433; revisión del fixture contrastada con el backend. Se probaron las respuestas
500 desde otro Liberty temporal con datasource hacia un puerto loopback cerrado.
No se alteró esquema, no se generaron credenciales ni se accedió a postgres_db.
Se conservaron los archivos environment.local.js preexistentes, ignorados por Git.

Reproducción de navegador con herramientas externas **ya instaladas**:

```sh
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/galeno-browser-final-20261028/browsers \
GALENO_DASHBOARD_ORIGIN=http://localhost:3000 \
GALENO_DASHBOARD_EXPECT_CARDS=1 \
GALENO_DASHBOARD_ARTIFACTS=/private/tmp/galenos-audit-browser-20261030 \
/private/tmp/galeno-browser-final-20261028/bin/python test/browser/dashboard.py
```

Esas rutas son locales a este equipo. El navegador integrado no tenía sesión
disponible; se ejecutó la suite existente con Playwright/Chromium externos.
Los intentos iniciales restringidos por sandbox, agente Mockito y ruta de Chromium
no se contabilizan como aprobados; la tabla refleja las repeticiones completas.

Evidencias locales: `/private/tmp/galeno-fe-final-unit.log`,
`/private/tmp/galeno-fe-final-transport.log`, `/private/tmp/galeno-fe-integration.log`
y `/private/tmp/galenos-audit-browser-20261030/result.json` y `movil.png`.
Backend aislado: `/private/tmp/galenos-correcciones-20261030`, con reportes
Surefire/JaCoCo y `target/GalenosSV.war`. No se versionan logs ni configuraciones locales.

Dependencias pendientes: Fernando debe revisar el PR backend y acordar un fixture
oficial ampliado para integración JPA de contactos/documentos/procedimientos,
integridad y rollback. El demo actual no contiene esas tablas y no se amplió su
esquema unilateralmente. La lista completa de contactos por persona se conserva;
convertir ese tab a paginación requiere una modificación coordinada de la vista.
No hay un cambio requerido de Rodrigo para este lote. La auditoría detallada de
todos los demás flujos y la verificación CRUD JSF completa no se dan por terminadas.

El puerto inicial 19082 estaba atendido por otro proceso; las pruebas se
repitieron en GalenosSVReview, exclusivo para esta revisión. WAR contrastado
por SHA-256 antes del arranque:
`f28260ab0cb7e97e3a7d703cdeedda92ae4a7a5e1c678683640501f5a94fd6ff`.
También pasó una prueba JSF real: cinco consultas de clínica A y dos en el día
22/10/2026, igual que REST. Los archivos locales de entorno se respaldaron,
se apuntaron temporalmente a 19184 y se restauraron al finalizar.
