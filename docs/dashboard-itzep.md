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

## Validación y estado al publicar

Antes de que el usuario pidiera detener las pruebas se observaron:

- 400 pruebas unitarias aprobadas (33 nuevas de dashboard/presentación).
- Revisión de sintaxis aprobada para 54 archivos en ese momento.
- 9 pruebas de transporte y 20 de integración DAO real aprobadas.
- La suite de navegador del dashboard registró dos fallos y quedó interrumpida.
  No se investigaron ni corrigieron esos fallos tras la instrucción de parar.
  La prueba de propagación desde el emisor sintético estaba en curso al detenerse:
  no se acredita su aprobación ni integración con las tarjetas reales.

Se incluyen `test/unit/DashboardControl.test.js` y el verificador opcional
`test/browser/dashboard.py`. Este último distingue los casos con respuestas
interceptadas y el emisor Shadow DOM sintético; no los presenta como componentes
reales de Rodrigo. Requiere Playwright Python externo y Chromium. Ejecución
manual futura, si se autoriza reanudar la validación:

```sh
GALENO_DASHBOARD_ORIGIN=http://127.0.0.1:3000 \
PLAYWRIGHT_BROWSERS_PATH=/tmp/galeno-browser-tools/browsers \
  /tmp/galeno-browser-tools/bin/python test/browser/dashboard.py
```

El dashboard se publica por instrucción expresa del usuario de detener las
pruebas y hacer merge directo a main sin PR. **La validación del dashboard
está incompleta.** La evidencia DAO de `docs/verificacion.md` corresponde a la
etapa anterior; no acredita por sí sola este dashboard ni sus tarjetas.
