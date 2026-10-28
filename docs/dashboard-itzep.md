# Dashboard de Itzep

Implementado en `src/index.html` con JavaScript nativo, sin dependencias nuevas.
La nueva responsabilidad de dashboard y su integración fue autorizada por Itzep.

## Organización y uso

- `src/js/app/dashboard.js`: composición con ClinicaDAO/ConsultaDAO inyectables.
- `src/js/app/main.js`: configuración local, inicio y limpieza al abandonar la página.
- `src/js/control/DashboardControl.js`: clínicas, selección, filtros, paginación,
  detalle, errores, AbortController y descarte de respuestas obsoletas. No usa DOM ni Fetch.
- `src/js/boundary/pages/DashboardPage.js`: DOM y eventos; no accede directamente a HTTP.
- `dashboard-presentation.js`: mensajes seguros, fechas UTC y modelo de seis campos.
- `src/resources/estilos/dashboard.css`: layout responsive exclusivo del dashboard.

Copiar `src/js/config/environment.example.js` como `environment.local.js` en
ese directorio y completar la base URL con `./demo info` del demo sintético
oficial. Ejecutar `npm ci` y `npm run dev`. Abrir `/index.html` en el origen
permitido por CORS. La configuración de BrowserSync ahora sirve index.html en
la raíz; un proceso anterior necesita reiniciarse para recoger esa configuración.
Los archivos locales de entorno no se versionan. No hay URL alternativa fija.

Las clínicas se obtienen por páginas hasta recorrer las disponibles. El usuario
selecciona su clínica y las consultas usan exclusivamente ese idClinica.
Filtros: fechaDesde, fechaHasta e idPersonaRol. El cambio de clínica limpia
filtros y detalle; los demás cambios de lista reinician el detalle. Los totales
proceden de DefaultResponse.totalDatos, sin sustituirlos por el tamaño de página.
Cada solicitud reemplazada se cancela y su respuesta tardía se ignora incluso
si una dependencia inyectada no respeta AbortSignal.

## Contrato con Rodrigo

El contrato implementado está en [cortez, docs/ui-contract.md](https://github.com/Fernando-rtx/GalenoSVFE/blob/93d9554da902c967961b2d795aa379ffd25e30b6/docs/ui-contract.md).
Rodrigo publicó los módulos en `93d9554`; no se incluyen sus archivos en los
commits de esta validación de Itzep. El usuario aceptó los
seis campos y el evento de selección. Cuando esté registrado `tarjeta-consulta`,
la página asigna a su propiedad JavaScript `consulta` el modelo:
`idConsulta`, `personaNombre`, `rolNombre`, `clinicaNombre`, `fechaInicio`,
`fechaFin`. Se conservan null y cadenas UTC, sin DTO ni estados inventados.
La propiedad `.consulta` corresponde a la implementación publicada de Rodrigo.

La página escucha `consulta-seleccionada` en su raíz. Requiere
`detail: { idConsulta }`, `bubbles: true`, `composed: true` para atravesar Shadow
DOM. El Control comprueba que el ID pertenece a la página visible y obtiene
el detalle con `findById(idConsulta, { query: { idClinica }, signal })`.

Las tarjetas reales existen en `origin/cortez`, pero todavía no están en `main`.
Su `src/js/app/main.js` importa `tarjeta_consulta.js`; este módulo registra
`tarjeta-consulta` e importa `tarjeta_simple.js`. Ambos reciben datos por DOM y
propiedades, sin Fetch. La rama también comparte el formato UTC entre tarjetas
y detalle mediante `src/js/boundary/format-utc-date.js`.

Mientras no se incorporen esos módulos, la selección usa la tabla nativa del
dashboard. La página reacciona también si el componente se registra después de
su inicialización. La incorporación de `cortez` requiere revisión del equipo;
esta validación no hace merge ni modifica los componentes de Rodrigo.

## Investigación de los fallos y correcciones

Fecha: 2026-10-23, America/El_Salvador. Base auditada: frontend `986f2dc`,
backend oficial `d7ff967`, API 0.2. Se revisaron AGENTS.md, el contrato, las
clases Java de los recursos/DTO y el código de dashboard antes de corregir.

La primera ejecución se interrumpió por instrucción del usuario y se publicó
con dos fallos registrados. Al autorizar la investigación se reprodujeron
esos dos fallos y el bloqueo del emisor sintético; sus causas fueron:

1. **Estado inicial: error de la prueba.** El fieldset sí tenía `disabled`,
   coincidía con `:disabled` y sus inputs estaban efectivamente deshabilitados.
   Playwright Python 1.55 devolvía falso al consultar `is_disabled()` sobre
   el fieldset. La prueba ahora verifica el atributo HTML y la deshabilitación
   real de los tres inputs y el botón. También comprueba que se habilitan al
   seleccionar una clínica. No se cambió el Control ni se debilitó el requisito.
2. **Vista móvil: defecto CSS real.** En una pantalla de 390 px el documento
   medía 449 px. Un texto `.sr-only` con posición absoluta dentro de la tabla
   no tenía un contenedor de posicionamiento en el área desplazable y extendía
   el documento. `.table-scroll` ahora usa `position: relative`: el documento
   queda en 390 px y la tabla conserva 510 px dentro de su contenedor de 352 px.
   No se oculta el overflow de body. En 320 px también se observó que los campos
   de fecha excedían el ancho interno del formulario; hasta 360 px los filtros
   se presentan en una columna.
3. **Shadow DOM: ubicación incorrecta del emisor de prueba.** Se añadía como
   tercer hijo del shell y el sidebar sticky interceptaba el clic. Ahora se
   monta en el área de resultados, dentro de la raíz que escucha el evento.
   Se usa un clic real, sin `force`. Con bubbles/composed verdaderos el evento
   llega con el target retargeteado al host sintético y se carga el detalle
   real con el DAO. Un segundo caso confirma que sin composed el evento no
   sale del Shadow DOM y no se realiza ninguna petición de detalle.

## Resultados comprobados después de corregir

| Comprobación | Resultado |
|---|---|
| `npm test -- --reporter dot` | 400 aprobadas, 0 fallos; Mocha, Chai y Sinon. |
| `npm run check` | 54 archivos con sintaxis válida. |
| `test/browser/dashboard.py` | 13 aprobadas, 0 fallos, 0 errores, 0 omitidas. |
| Pantallas de 320, 360, 390, 700, 1024 y 1440 px | Sin desbordamiento horizontal del documento; campos dentro del formulario. |
| Tabla en pantallas estrechas | Mantiene desplazamiento horizontal interno y contenido accesible. |
| `git diff --check` | Sin errores. |

Se revisaron visualmente las capturas de escritorio y móvil. La evidencia
versionada está en [dashboard-navegador.json](../test/evidence/dashboard-navegador.json).
Los PNG originales quedan como artefactos locales, fuera de Git.
El demo se inició con JDK 21, Open Liberty y PostgreSQL sintético usando su
orquestador oficial. No se modificaron Java, SQL, CORS del backend, DAO,
contratos REST, componentes de Rodrigo ni dependencias del proyecto.

Las 13 pruebas de navegador incluyen la página real contra REST, filtros,
paginación, cambios de clínica, detalle, campos ausentes y estados iniciales.
También contienen casos identificados con respuestas interceptadas y emisores
sintéticos: verifican manejo de errores, texto no confiable y Shadow DOM,
pero **no acreditan integración con las tarjetas reales de Rodrigo**.
La prueba de configuración ausente confirma que no se usa una URL alternativa.
Las pruebas unitarias existentes cubren cancelación y respuestas obsoletas.

## Reproducción

Usar el demo oficial sintético y el origen CORS exacto de `./demo info`.
Playwright Python 1.55.0 y Chromium 140.0.7339.16 se utilizaron como herramientas
externas temporales, sin agregarlas al proyecto. Con ambos servidores activos:

```sh
npm test
npm run check
GALENO_DASHBOARD_ORIGIN=http://127.0.0.1:3000 \
PLAYWRIGHT_BROWSERS_PATH=/tmp/galeno-browser-tools/browsers \
  /tmp/galeno-browser-tools/bin/python test/browser/dashboard.py
```

Ajustar origen y ruta de la herramienta según el entorno. El script escribe
`result.json` y capturas en `/tmp/galeno-dashboard-browser`; la variable
`GALENO_DASHBOARD_ARTIFACTS` permite elegir otra carpeta. No se versionan
configuraciones locales, cachés Python ni secretos del demo.

Estos resultados corresponden a la validación del 23 de octubre, anterior a la
publicación de las tarjetas reales. El merge directo autorizado entonces no
se aplica a la continuación actual: los cambios nuevos se revisan mediante PR.

## Continuación del 28 de octubre de 2026

Se actualizaron las referencias antes de auditar: `origin/main` está en
`32bb6c2` y `origin/cortez` en `93d9554`. El backend oficial se obtuvo en una
copia temporal, revisión `d7ff967`. Se arrancó con JDK 21 mediante `./demo start`,
con contenedor/volumen propios, puertos 19082/19445/15433 y CORS para los
orígenes locales de las pruebas. No se modificaron recursos PostgreSQL ajenos.

La revisión de DAO, Control y página no encontró defectos que requirieran
cambios de producción. Se amplió `test/browser/dashboard.py` para usar la
tabla o las tarjetas registradas y para comprobar además:

- Tab y Enter hasta cargar el detalle con solo `idClinica` como contexto.
- Los seis campos de la tarjeta real, null del fixture, evento compuesto y
  fechas iguales a las del detalle.
- El runner Mocha de REST desde el navegador y su política CORS.
- Error de conexión provocado por la prueba, seguido de reintento REST real.
- Cancelación al cambiar rápidamente clínica y filtros: se retiene la entrega
  de respuestas obtenidas del demo real, sin sustituir sus cuerpos por fixtures.

Los casos con prefijo `synthetic` mantienen interceptaciones o emisores
sintéticos declarados. No acreditan por sí solos integración REST ni tarjetas.
Los errores HTTP 404/422 del runner y los errores provocados generan mensajes
de consola esperados; los errores JavaScript no controlados hacen fallar la suite.

### Resultados de esta continuación

| Comprobación | Resultado |
|---|---|
| `npm ci` | Código 0; dependencias fijadas, sin cambios en el lockfile. |
| `npm test` | 400 aprobadas, 0 fallos. |
| `npm run check` | Sintaxis válida en 54 archivos. |
| `npm run test:transport` | 9 aprobadas, 0 fallos; servidor sintético. |
| `npm run test:integration` | 20 aprobadas, 0 fallos contra el demo oficial. |
| Unitarias / sintaxis en el checkout de `cortez` | 401 aprobadas / 57 archivos válidos. |
| Chromium, checkout de Itzep con tabla | 18 casos: 17 aprobados, 1 omitido exclusivamente de tarjetas, 0 fallos/errores. |
| Chromium, checkout de `cortez`, tarjetas obligatorias | 18 aprobados, 0 omitidos, 0 fallos/errores. |
| Runner REST en Chromium | 20 aprobadas en cada origen, con Fetch y CORS reales. |
| Layout / teclado | Sin desbordamiento del documento de 320 a 1440 px; Tab y Enter activan detalle. |
| `python3 -m py_compile test/browser/dashboard.py` / `git diff --check` | Código 0. |

El transporte necesitó permiso para escuchar en loopback: el primer intento
en el sandbox tuvo dos errores `listen EPERM`; la reejecución pasó. La primera
versión del nuevo caso de cancelación tuvo una carrera en la prueba, más un
error derivado al cerrar su contexto. Se corrigió esperando una señal observable
de respuesta retenida y finalizando los manejadores antes de cerrar. El caso
aislado y las dos suites completas pasaron después; no se alteró producción.

Se revisaron las capturas de escritorio y móvil. La evidencia actual está en
la propiedad `continuation` de
[dashboard-navegador.json](../test/evidence/dashboard-navegador.json), conservando
el resultado histórico. Los reportes completos y PNG locales quedan en
`/tmp/galeno-final-main-browser` y `/tmp/galeno-final-cortez-browser`.

### Reproducir con las tarjetas reales

Preparar un checkout temporal de `origin/cortez`, sin hacer merge a `main`:

```sh
git fetch origin
git worktree add --detach /tmp/galeno-tarjetas origin/cortez
cd /tmp/galeno-tarjetas
npm ci
```

Configurar allí los archivos locales de aplicación e integración con la URL
de `./demo info`, usando el ejemplo de demo para la suite REST. Iniciar su
BrowserSync con `npm run dev -- --port 3001`; ese origen debe estar permitido
por CORS. Ejecutar el verificador de esta rama de Itzep contra ese servidor,
conservando intactos los módulos de Rodrigo:

```sh
GALENO_DASHBOARD_ORIGIN=http://127.0.0.1:3001 \
GALENO_DASHBOARD_EXPECT_CARDS=1 \
GALENO_DASHBOARD_ARTIFACTS=/tmp/galeno-dashboard-tarjetas \
PLAYWRIGHT_BROWSERS_PATH=/ruta/a/browsers \
  /ruta/a/python /ruta/a/GalenoSVFE/test/browser/dashboard.py
```

`GALENO_DASHBOARD_EXPECT_CARDS=1` hace fallar el inicio si no se registró
`tarjeta-consulta`; así la tabla no puede aprobar una integración incompleta.
Sin esa opción, el caso exclusivo de tarjetas se omite cuando no están
disponibles y el reporte lo indica. Playwright 1.55.0 y Chromium son herramientas
externas; no se agregaron al package.json ni al lockfile.

### Safari y dependencias de entrega

Con la demo iniciada y `environment.local.js` configurado, ejecutar
`npm run dev` y abrir `http://127.0.0.1:3000/index.html` en Safari. Seleccionar una
clínica, filtrar, cambiar página y activar “Ver detalle”. Para ver las tarjetas,
servir el checkout de `cortez`; el checkout basado en `main` todavía usa la tabla.
La prueba automatizada usa Chromium; no acredita una ejecución en Safari.
Durante esta validación quedaron activos la tabla en
`http://127.0.0.1:3000/index.html` y el checkout temporal con tarjetas en
`http://127.0.0.1:3001/index.html`, contra el mismo demo sintético. La copia del
backend está en `/tmp/galenos-demo-itzep-final-20261028`; allí `./demo stop`
detiene únicamente esa demo y conserva su volumen.

No se detectaron correcciones pendientes en las tarjetas de Rodrigo. Falta la
revisión e incorporación de `cortez` a `main` para entregarlas en esa rama.
Comunicar al equipo que debe conservar el import de `tarjeta_consulta.js`, los
estilos y el formateador UTC compartido de esa entrega, y repetir la suite con
`GALENO_DASHBOARD_EXPECT_CARDS=1` tras integrarla.

Fernando mantiene pendientes los contratos de los otros 17 recursos, además
de escrituras, autenticación y permisos reales. Los 17 DAO siguen rechazando
`CONTRACT_PENDING` sin HTTP; no bloquean el dashboard de lectura de API 0.2.
