# Preparación de Pull Request — módulo de acceso a datos

Rama: feature/itzep-acceso-datos. Base oficial incorporada: origin/main,
81a20569e6247826ec5d0cd83adf08ac1f854caf. El responsable autorizó commits y
push de esta rama; solicitó comprobar la publicación antes de hacer merge.
Este documento prepara la revisión; no acredita un PR creado ni un merge.

## Descripción propuesta

Título: `feat: integrar capa de acceso a datos de GalenoSVFE`

El frontend incorpora una capa DAO nativa que centraliza Fetch, configuración,
parámetros, validación, timeout, cancelación y errores. DefaultResponse ofrece
datos y totalDatos. Los 20 DAO concretos se exportan desde src/js/index.js,
sin DOM, dependencias de producción ni modelos espejo de JPA.

API 0.2 permite cinco lecturas: TipoDocumento lista/detalle, Clínica lista y
Consulta lista/detalle con clínica obligatoria. Se validan UUID, filtros,
fechas, DTO y Total-registros; se preservan null y UTC. Los otros 17 DAO fallan
CONTRACT_PENDING antes de HTTP. Las escrituras y el detalle de Clínica no
publicados fallan OPERATION_UNSUPPORTED. Las propuestas de rutas futuras están
solo en documentación y requieren confirmación del backend.

## Validación y límites

- 344 pruebas unitarias aprobadas; también pasan con TCP y Fetch real bloqueados.
- 9 pruebas de transporte aprobadas con servidores sintéticos y Fetch nativo.
- 7 pruebas de integración aprobadas contra Java 21/Open Liberty/JPA/PostgreSQL,
  demo oficial aislado, sin mocks y solo con datos sintéticos.
- 7 verificaciones HTTP adicionales de filtros, página vacía, ámbito de clínica,
  CORS, preflight y errores. No sustituyen la prueba de navegador.
- Check: 45 archivos entregados y una configuración local ignorada, sintaxis válida.
- BrowserSync: grafo de 28 módulos enlazado/evaluado por HTTP en Node VM.
- npm audit: cero vulnerabilidades conocidas. Diff sin errores de espacios.
- CORS desde navegador pendiente: no hubo navegador conectado disponible.

Evidencia, reproducción y distinción entre suites: [verificacion.md](verificacion.md).
Matriz de los 20 DAO: [inventario-dao.md](inventario-dao.md).

## Decisiones de arquitectura

Las clases concretas solo seleccionan el recurso; DefaultDAO concentra el
transporte y exige operaciones registradas con fuente verificable. No se
construyen rutas a partir de entidades Java. Validadores puros y esquemas de
query reutilizan reglas publicadas, sin duplicar Fetch en cada DAO.

DefaultResponse conserva alias de lectura data/total para compatibilidad con
la primera versión local, sin duplicar el JSON serializado. Un conteo ausente
es error, nunca un total estimado. Los errores conservan HTTP y distinguen red,
lectura, procesamiento, timeout y cancelación. No hay reintentos automáticos.

OrdenDAO/FiltroDAO de Java son criterios internos, no recursos: no se crearon
clases HTTP redundantes. Los campos/relaciones JPA se documentan para Fernando;
solo los DTO publicados se validan o consumen como JSON en el cliente.

## Compatibilidad y coordinación

No se cambian AGENTS.md, contrato 0.2, documentos oficiales del demo, fixtures
de Clínica/Consulta ni código de app, Boundary o estilos. No se cambia Java.
Los únicos ajustes de archivos compartidos existentes son README.md,
.gitignore y test/fixtures/README.md; conservan el contenido del equipo.

Las dependencias de desarrollo autorizadas tienen versiones exactas y lock;
no hay dependencias de producción. BrowserSync sirve src y el runner sin proxy.
Las configuraciones locales, node_modules, respaldos, secretos y bases quedan
fuera de Git. Se conserva una copia de seguridad local fuera del repositorio.

Fernando debe revisar la correspondencia REST y aprobar contratos de los 17
recursos pendientes, además de futuras escrituras/identidad/permisos. Las
[propuestas](necesidades-backend.md) son explícitamente no ejecutables. Rodrigo
puede usar la [guía de consumo](consumo-dao-rodrigo.md); eventos y presentación
de tarjetas siguen por coordinar, sin modificar sus Web Components.

## Inventario de archivos incluidos

Total respecto a la base oficial: **62 archivos: 59 nuevos y 3 modificados,
sin borrados**. Se agrupan por funcionalidad en tres commits Conventional
Commits; sus SHA y la confirmación del push se informan al publicar.

### Cliente y DAO (29 archivos)

| Estado | Archivo |
|---|---|
| Nuevo | `src/js/config/api-config.js` |
| Nuevo | `src/js/config/api-routes.js` |
| Nuevo | `src/js/config/environment.example.js` |
| Nuevo | `src/js/control/DefaultDAO.js` |
| Nuevo | `src/js/control/dao/ClinicaDAO.js` |
| Nuevo | `src/js/control/dao/ConsultaDAO.js` |
| Nuevo | `src/js/control/dao/ConsultaProcedimientoDAO.js` |
| Nuevo | `src/js/control/dao/ConsultaProcedimientoPasoDAO.js` |
| Nuevo | `src/js/control/dao/DocumentoDAO.js` |
| Nuevo | `src/js/control/dao/ExamenDAO.js` |
| Nuevo | `src/js/control/dao/ExamenResultadoDAO.js` |
| Nuevo | `src/js/control/dao/ExamenTipoExamenDAO.js` |
| Nuevo | `src/js/control/dao/MedioContactoDAO.js` |
| Nuevo | `src/js/control/dao/OrdenExamenDAO.js` |
| Nuevo | `src/js/control/dao/PersonaDAO.js` |
| Nuevo | `src/js/control/dao/PersonaRolDAO.js` |
| Nuevo | `src/js/control/dao/ProcedimientoDAO.js` |
| Nuevo | `src/js/control/dao/ProcedimientoPasoDAO.js` |
| Nuevo | `src/js/control/dao/ProcedimientoPasoExamenDAO.js` |
| Nuevo | `src/js/control/dao/ProcedimientoPasoSecuenciaDAO.js` |
| Nuevo | `src/js/control/dao/RolDAO.js` |
| Nuevo | `src/js/control/dao/TipoDocumentoDAO.js` |
| Nuevo | `src/js/control/dao/TipoExamenDAO.js` |
| Nuevo | `src/js/control/dao/TipoMedioContactoDAO.js` |
| Nuevo | `src/js/control/query-parameters.js` |
| Nuevo | `src/js/control/rest-validators.js` |
| Nuevo | `src/js/entity/DefaultError.js` |
| Nuevo | `src/js/entity/DefaultResponse.js` |
| Nuevo | `src/js/index.js` |

### Pruebas y herramientas (23 archivos)

| Estado | Archivo |
|---|---|
| Modificado | `.gitignore` |
| Nuevo | `.mocharc.json` |
| Nuevo | `bs-config.cjs` |
| Nuevo | `package-lock.json` |
| Nuevo | `package.json` |
| Nuevo | `scripts/check-syntax.js` |
| Nuevo | `scripts/run-integration.js` |
| Modificado | `test/fixtures/README.md` |
| Nuevo | `test/fixtures/tipo-documento.json` |
| Nuevo | `test/helpers/http-fixture.js` |
| Nuevo | `test/helpers/rest-fixtures.js` |
| Nuevo | `test/integration/backend-suite.js` |
| Nuevo | `test/integration/environment.example.js` |
| Nuevo | `test/integration/runner.html` |
| Nuevo | `test/transport/http.test.js` |
| Nuevo | `test/transport/rest-daos.test.js` |
| Nuevo | `test/unit/DefaultDAO.test.js` |
| Nuevo | `test/unit/api-config.test.js` |
| Nuevo | `test/unit/concrete-daos.test.js` |
| Nuevo | `test/unit/dao-inventory.test.js` |
| Nuevo | `test/unit/entities.test.js` |
| Nuevo | `test/unit/integration-preconditions.test.js` |
| Nuevo | `test/unit/rest-daos.test.js` |

### Documentación y entrega (10 archivos)

| Estado | Archivo |
|---|---|
| Modificado | `README.md` |
| Nuevo | `docs/acceso-datos.md` |
| Nuevo | `docs/consumo-dao-rodrigo.md` |
| Nuevo | `docs/contratos-rest.md` |
| Nuevo | `docs/cors.md` |
| Nuevo | `docs/integracion-equipo.md` |
| Nuevo | `docs/inventario-dao.md` |
| Nuevo | `docs/necesidades-backend.md` |
| Nuevo | `docs/preparacion-pr.md` |
| Nuevo | `docs/verificacion.md` |
