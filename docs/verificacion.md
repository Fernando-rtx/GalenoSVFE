# Verificación final de la entrega de Itzep

Fecha: 23 de octubre de 2026, America/El_Salvador.
Base frontend actualizada: `9a627c68b8ffdaeee2fd79fb0520bb4c1772610a` (`main`,
con PR #1 fusionada en `d0025b3` y evidencia posterior de Fernando).
Rama local: `chore/itzep-validacion-final`.
Backend ejecutado: Galenos `main` en `d7ff967`.
Contrato REST: API 0.2, idéntico en ambos repositorios.

## Estado y alcance

**COMPLETO: módulo de acceso a datos de Itzep para el contrato publicado.**
DefaultDAO, DefaultResponse y DefaultError conservaron su implementación:
la auditoría y las pruebas no justificaron reescribirlos. Se mantiene
Boundary–Control–Entity, DAO, módulos ES, Fetch y Promises, sin frameworks.
No se cambió código de producción, contratos, dependencias del proyecto,
Java, SQL, CORS del servidor ni Web Components.

Las 20 clases tienen su entidad y DAO Java correspondientes, heredan el
transporte común y están exportadas por `src/js/index.js`. TipoDocumento
lista/detalle, Clínica lista y Consulta lista/detalle consumen cinco lecturas
reales. Los otros 17 DAO permanecen preparados y rechazan CONTRACT_PENDING
sin HTTP. Las escrituras y el detalle de Clínica no publicados se rechazan
con OPERATION_UNSUPPORTED. El [inventario](inventario-dao.md) conserva la
matriz completa; 20 clases no equivalen a 20 recursos integrados.

## Comprobaciones ejecutadas en esta sesión

| Comprobación | Aprobadas | Fallidas | Alcance |
|---|---:|---:|---|
| `npm ci` | Instalación correcta | 0 | Lock sin modificaciones; versiones fijas. |
| `npm test -- --reporter dot` | 367 | 0 | Mocha, Chai y Sinon; Fetch simulado. |
| `npm run check` | 48 archivos | 0 | 46 versionables y dos configuraciones locales ignoradas. |
| `npm run test:transport` | 9 | 0 | Fetch nativo contra servidores HTTP sintéticos. |
| `npm run test:integration` | 20 | 0 | GalenosSV real, Liberty y PostgreSQL sintético. |
| Runner HTML en Chromium | 20 | 0 | Misma suite y DAO reales desde BrowserSync. |
| Verificador oficial de navegador | Ejecución correcta | 0 | Conteos, errores, preflight y rechazo CORS. |
| `git diff --check` | Correcto | 0 | Sin errores de whitespace. |

No sumar las pruebas de transporte como evidencia de GalenosSV. Las 20 pruebas
de navegador repiten la suite real desde otro entorno; no son 20 casos
funcionales distintos. El verificador oficial añade aserciones, no una suite
Mocha adicional. No se ejecutaron ni se cuentan aquí las pruebas Java de Fernando.
`npm ls --depth=0` confirmó BrowserSync 3.0.4, Chai 6.3.0, Mocha 12.0.3 y
Sinon 22.1.0. Entorno local: Node 26.7.0, Maven 3.9.16 y JDK 21.0.12.1.

## Conexión real y CORS de navegador

Se reutilizó una copia temporal limpia del backend oficial y se actualizó
por fast-forward a `d7ff967`, sin editar sus fuentes. `./demo start` utilizó
Open Liberty 26.0.0.8, PostgreSQL 12.22 y los fixtures sintéticos oficiales.
El demo inició en español con JDK 21, sin forzar el idioma inglés: Fernando
ya corrigió la detección de versión en esa revisión.

`./demo info` confirmó `syntheticDataOnly: true`, base efectiva
`http://localhost:19082/GalenosSV/resources`, origen permitido
`http://127.0.0.1:3000`, `credentials: omit` y `Total-registros`.
Los puertos son configuración local, no constantes de los DAO. No se usó
la base clinica ni se controlaron los contenedores ajenos al demo.

El conector de navegador no ofrecía instancias. Se ejecutó el verificador
oficial `Galenos/test/integration/frontend_dao_browser.py` sin modificaciones,
con Playwright Python 1.55.0 y Chromium 140.0.7339.16 (build 1187), instalados
solo como herramientas temporales, sin agregarlos a package.json/lock.
El navegador no utilizó proxy ni desactivó la política CORS.

Resultado comprobado desde BrowserSync y Chromium:

- 20 pruebas aprobadas; las cinco lecturas públicas y DefaultResponse reales.
- Dos clínicas activas, total cinco consultas en la seleccionada y una fila
  al solicitar max=1. Total-registros fue legible desde JavaScript.
- Segunda página, página vacía conservando total, filtro inclusivo de fecha,
  rango sin coincidencias y filtro de PersonaRol con conteo filtrado correcto.
- Detalle de otra clínica con DefaultError HTTP 404 y máximo excedido con
  HTTP 422, diferenciados de fallos de red.
- Preflight OPTIONS real 204 observado por CDP, seguido de GET correcto con
  Content-Type application/json y total legible.
- Desde http://localhost:3000, origen no permitido en este demo, Chromium
  bloqueó la lectura. El DAO produjo connection / NETWORK_ERROR / status null.

La evidencia reproducible de esta sesión está en
[`test/evidence/dao-navegador.json`](../test/evidence/dao-navegador.json).
La captura original queda como artefacto temporal, fuera del repositorio.
La evidencia anterior de Fernando se conserva en
[integracion-dao-navegador.md](integracion-dao-navegador.md); no se confunde
con esta ejecución local.

## Cambios y problemas resueltos

La suite genérica anterior comprobaba siete casos básicos. Se añadieron
expectativas explícitas de páginas, filtros, errores de lista y errores de
detalle, con validación previa de su configuración. Las pruebas rechazan
conteos/tamaños imposibles, casos vacíos, parámetros que nunca llegarían al
backend y operaciones no publicadas. Se amplió la matriz HTTP de DefaultDAO
para incluir explícitamente 403 y 405 en sus cinco operaciones genéricas.
201/204 y escrituras se prueban únicamente con contratos sintéticos; los GET
oficiales continúan exigiendo 200.

Se entrega `test/integration/environment.demo.example.js`, que descubre UUID
por HTTP y configura 20 casos contra el dataset oficial. Sus expectativas
sintéticas no reemplazan respuestas del servidor ni se importan en producción.
La configuración genérica anterior sigue siendo compatible.

Los cambios se limitan a pruebas, evidencia y documentos de Itzep:
backend-suite.js, ambos ejemplos de entorno, DefaultDAO.test.js,
integration-preconditions.test.js, dao-navegador.json, acceso-datos.md,
consumo-dao-rodrigo.md, inventario-dao.md y este documento.

## Reproducción en otra computadora

1. Preparar JDK 21, Maven y Docker según `docs/demo-setup.md` del backend.
   En una copia oficial actualizada de Galenos ejecutar `./demo start`.
   Obtener la conexión con `./demo info` y comprobar que declara datos sintéticos.
2. En frontend ejecutar `npm ci`. Copiar
   `test/integration/environment.demo.example.js` como
   `test/integration/environment.local.js` y completar baseUrl con esa conexión.
   El ejemplo descubre UUID por HTTP; no necesita claves PostgreSQL.
3. Copiar `src/js/config/environment.example.js` como environment.local.js
   en su mismo directorio y completar la misma baseUrl para el cliente.
   Ambos archivos locales están ignorados por Git.
4. Ejecutar `npm test`, `npm run check`, `npm run test:transport` y
   `npm run test:integration`. Para un despliegue sintético distinto al demo
   oficial, usar environment.example.js y declarar sus propias expectativas.
5. Ejecutar `npm run dev` y abrir `/test/integration/runner.html` desde el
   origen exacto permitido por el demo. Si BrowserSync anuncia otro puerto
   porque el esperado está ocupado, comprobar el servicio existente o elegir
   un puerto/origen local libre mediante la configuración documentada del demo;
   no detener procesos ajenos ni desactivar CORS.
6. Opcionalmente automatizar Chromium con el verificador oficial del backend:

```sh
# Herramienta externa temporal, no dependencia del frontend.
python3 -m venv /tmp/galeno-browser-tools
/tmp/galeno-browser-tools/bin/pip install playwright==1.55.0
PLAYWRIGHT_BROWSERS_PATH=/tmp/galeno-browser-tools/browsers \
  /tmp/galeno-browser-tools/bin/playwright install chromium

# Desde el backend, con BrowserSync y demo activos. Ajustar los dos orígenes
# según ./demo info. El segundo debe servir el frontend y NO estar permitido.
PLAYWRIGHT_BROWSERS_PATH=/tmp/galeno-browser-tools/browsers \
GALENOS_FRONTEND_ORIGIN=http://127.0.0.1:3000 \
GALENOS_TEST_DENIED_ORIGIN=http://localhost:3000 \
  /tmp/galeno-browser-tools/bin/python test/integration/frontend_dao_browser.py
```

Sin configuración/URL/casos válidos la integración informa INTEGRACIÓN NO
EJECUTADA y devuelve código 1. Con backend inaccesible o expectativas que
no coinciden, falla; no se acredita la integración. El número de archivos de
check baja a 46 si no existen los dos entornos locales.

Al finalizar, detener únicamente el demo propio con `./demo stop`, conservando
su volumen. Mantener fuera de Git sus claves, logs privados y configuraciones.

## Entrega al equipo y límites

Fernando: los 17 recursos, escrituras, detalle de Clínica y autenticación/
autorización reales requieren contratos futuros. No bloquean la entrega actual
de las cinco lecturas; no se inició ninguna funcionalidad que los necesite.
Ver [necesidades-backend.md](necesidades-backend.md) para los requisitos exactos.
No se modificaron sus contratos ni archivos.

Rodrigo: los DAO y ejemplos comprobados ya se pueden consumir por el punto
público. La conexión concreta a tarjetas/dashboard requiere acordar sus métodos,
propiedades y eventos; no se implementó ni se presume esa interfaz.
Ver [consumo-dao-rodrigo.md](consumo-dao-rodrigo.md).

No se identificó trabajo adicional pendiente de Itzep dentro del alcance de
acceso a datos definido para esta entrega. Esto no declara terminado el sistema
completo ni habilita información clínica real. Los commits de esta etapa son
locales; cualquier push o merge requiere autorización posterior del usuario.
