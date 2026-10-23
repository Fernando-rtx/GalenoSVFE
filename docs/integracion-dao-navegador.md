# Integración de los DAO de Itzep con el backend

Fecha: 2026-10-23. Frontend revisado: `main` en `d0025b3` (PR #1 de Itzep,
commits `89fd44d`, `f9d165f`, `7a29c18`). Backend API 0.2 de `e4edd6c`, con
la corrección del arranque dependiente del idioma. No se cambian rutas ni DTO.

## Qué está comprobado

La nueva entrega incorpora DefaultDAO, DefaultResponse/DefaultError, los DAO
concretos, configuración, validadores, suites de pruebas y BrowserSync. Se
consumen las cinco lecturas confirmadas de TipoDocumento, Clínica y Consulta.
Los otros 17 recursos siguen marcados como pendientes; no se convierten en
endpoints por declarar una clase DAO.

| Ejecución en este equipo | Resultado |
|---|---|
| `npm ci` | Dependencias del lock instaladas, sin cambiar versiones |
| `npm test` | 344 pruebas aprobadas |
| `npm run test:transport` | 9 pruebas aprobadas |
| `npm run check` | 45 archivos válidos antes de crear la configuración local |
| `npm run test:integration` | 7 pruebas aprobadas con Fetch real en Node |
| Runner HTML en Chromium/BrowserSync | Las mismas 7 pruebas aprobadas, cero fallos |
| Backend, orquestador | 10 pruebas Python aprobadas; arranque real en español con Java 21 |

El navegador ejecutó los módulos publicados por Itzep desde BrowserSync y
usó su `test/integration/runner.html`, sin simular Fetch ni sustituir DefaultDAO.
Se observó `DefaultResponse` real, con datos normalizados y cabeceras leídas
por JavaScript desde un origen distinto al del backend.

Comprobaciones adicionales en Chromium mediante esos DAO:

- `Total-registros` expuesto y convertido correctamente: 2 clínicas activas,
  5 consultas en la clínica seleccionada y una fila al pedir `max=1`.
- Página vacía conserva el total 5; un día del fixture filtra a 2 consultas.
- Detalle con otra clínica produce DefaultError de tipo HTTP y status 404.
- Exceso del máximo de página conserva HTTP 422, sin convertirlo en error de red.
- GET con `Content-Type: application/json` desencadena preflight real 204 y
  posteriormente permite leer datos y conteo. Se registró por CDP en Chromium.
- Desde un origen local no permitido, el navegador bloquea la lectura: el
  cliente entrega `connection / NETWORK_ERROR / status null`. No confunde ese
  fallo CORS con un HTTP 403 legible por JavaScript.

Artefactos de esta ejecución, con datos exclusivamente ficticios:
`test/evidence/frontend-dao-browser.json` y
`test/evidence/frontend-dao-browser.png` en el backend. Los logs completos y
la configuración de IDs descubiertos por HTTP quedan fuera de Git.

## Reproducción

1. En backend, seguir `docs/demo-setup.md` y ejecutar `./demo start`.
2. En frontend, ejecutar `npm ci` y configurar
   `test/integration/environment.local.js` usando el ejemplo de Itzep. Obtener
   IDs de las respuestas de la demo; comprobar que los IDs de ausencia produzcan
   404. No enviar credenciales PostgreSQL al frontend.
3. Ejecutar `npm run test:integration` y `npm run dev` desde frontend.
4. Abrir **http://localhost:3000/test/integration/runner.html**. BrowserSync
   anuncia `127.0.0.1`, pero el origen permitido por defecto en esta demo es
   `localhost`; para usar otro origen hay que configurarlo explícitamente en CORS.

La configuración local creada durante este ensayo está ignorada por Git,
contiene solo URL y casos de datos sintéticos, y usa el contrato del compañero.
Los módulos de `src/js/control`, `entity`, `config`, scripts npm y runner HTML
del frontend permanecieron iguales a la entrega remota.

Para automatizar la comprobación del navegador desde backend, con Playwright
externo y Chromium instalado:

```sh
GALENOS_FRONTEND_ORIGIN=http://localhost:3000 \
GALENOS_TEST_DENIED_ORIGIN=http://127.0.0.1:3000 \
python3 test/integration/frontend_dao_browser.py
```

`GALENOS_TEST_DENIED_ORIGIN` es opcional y debe apuntar a un alias local servido
por BrowserSync que el backend no permita. Si ambos alias están autorizados,
omitir esa comprobación o preparar un origen no permitido. Puede indicarse el
ejecutable mediante `GALENOS_TEST_CHROMIUM`. Los artefactos locales van a
`.galenos-demo/frontend-integration/`, o a `GALENOS_INTEGRATION_ARTIFACTS`.

## Corrección de Fernando y límite actual

El documento de Itzep identificó que el demo solo reconocía la etiqueta inglesa
`Product version:`. Se reprodujo la salida española `Versión del producto:` y
se corrigió leyendo el metadato estable de la distribución. Se conserva el
rechazo de una versión distinta de la fijada en el POM. Se probó el arranque con
`JAVA_TOOL_OPTIONS='-Duser.language=es -Duser.country=SV'`, sin el workaround inglés.

La conexión **DAO → REST → PostgreSQL → DefaultResponse** está comprobada
también desde navegador. El siguiente tramo requiere el dashboard/modelo de
Itzep y los Web Components de Rodrigo: en esta revisión `src/js/app` y
`src/js/boundary` siguen con `.gitkeep`. Se detiene el trabajo en ese límite,
sin implementar sus módulos ni inventar el contrato de eventos/presentación.
