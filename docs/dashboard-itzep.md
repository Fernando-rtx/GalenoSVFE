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

La propuesta se leyó en `origin/cortez`, `docs/ui-contract.md` (`91eeb74`).
No se copió su commit ni se modificaron sus archivos. El usuario aceptó los
seis campos y el evento de selección. Cuando esté registrado `tarjeta-consulta`,
la página asigna a su propiedad JavaScript `consulta` el modelo:
`idConsulta`, `personaNombre`, `rolNombre`, `clinicaNombre`, `fechaInicio`,
`fechaFin`. Se conservan null y cadenas UTC, sin DTO ni estados inventados.
La propiedad `.consulta` corresponde al borrador de Rodrigo.

La página escucha `consulta-seleccionada` en su raíz. Requiere
`detail: { idConsulta }`, `bubbles: true`, `composed: true` para atravesar Shadow
DOM. El Control comprueba que el ID pertenece a la página visible y obtiene
el detalle con `findById(idConsulta, { query: { idClinica }, signal })`.

Las tarjetas reales todavía no existen en main ni en la rama revisada de
Rodrigo. No se crean implementaciones sustitutas: mientras no esté registrado
el componente, la selección usa la tabla nativa del dashboard. La carga/import
inicial del módulo real se coordinará cuando Rodrigo lo entregue. La página
reacciona también si el componente se registra después de su inicialización.
TarjetaSimple y TarjetaConsulta siguen siendo responsabilidad de Rodrigo.

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

Los fallos investigados quedan corregidos y la validación de esta versión del
dashboard está aprobada. Sigue pendiente el consumo de las tarjetas reales
cuando Rodrigo entregue sus módulos; no se sustituyen con componentes falsos.
El usuario autorizó un commit explicativo y merge directo a main sin PR.
