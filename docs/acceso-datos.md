# Acceso a datos — contrato del cliente

Implementación JavaScript nativa con módulos ES, Fetch y Promises. Contrato REST
canónico: [API 0.2](api-contract.md), contrastado con Galenos `e4edd6c6`.

## Arquitectura y responsabilidades

Boundary consume los DAO a través del Control de la funcionalidad. No ejecuta
Fetch. Los DAO viven en `src/js/control/`, no crean HTML ni acceden al DOM.
`entity/` contiene `DefaultResponse` y `DefaultError`, sin DOM ni Fetch.
`config/` centraliza opciones y rutas; no hay dependencia directa de JPA.
Los datos recibidos son los DTO REST; no se reconstruyen entidades Java.

`DefaultDAO` implementa una vez el transporte y consulta el registro de
operaciones. TipoDocumento, Clínica y Consulta seleccionan su recurso sin
repetir URL, Fetch, errores ni validación. Los validadores REST y la
serialización de parámetros están extraídos a funciones reutilizables.

## Configuración e importación

Copiar `src/js/config/environment.example.js` como `environment.local.js`.
Definir allí la URL efectiva del backend, incluido `/GalenosSV/resources/`.
El valor inicial es `null`: importar funciona, enviar HTTP requiere configurarlo.
No se supone que los puertos de prueba de Fernando estén disponibles aquí.

```js
import { TipoDocumentoDAO, ClinicaDAO, ConsultaDAO } from './js/index.js';
import { config } from './js/config/environment.local.js';

const tipos = new TipoDocumentoDAO({ config });
const clinicas = new ClinicaDAO({ config });
const consultas = new ConsultaDAO({ config });

export function cargarTipos(first, max) {
  return tipos.findRange(first, max); // Promise<DefaultResponse>
}

export function cargarClinicas(first, max) {
  return clinicas.findRange(first, max);
}

export function cargarConsultas(first, max, idClinica, filtros = {}) {
  return consultas.findRange(first, max, {
    query: Object.assign({}, filtros, { idClinica })
  });
}

export function cargarDetalle(idConsulta, idClinica, signal) {
  return consultas.findById(idConsulta, { query: { idClinica }, signal });
}
```

Los IDs provienen de respuestas API y selecciones del usuario, nunca de
constantes del fixture dentro del cliente. Los filtros admitidos en lista son
`fechaDesde`, `fechaHasta` e `idPersonaRol`. El detalle admite únicamente
`idClinica`; no pasarle los filtros de lista. Todos son `options.query` y se
serializan con `URLSearchParams`, sin concatenación de valores a URLs.

`findRange(first, max, options)` y `findById(id, options)` mantienen una interfaz
uniforme. `options` permite `query`, `headers` y `signal` (AbortSignal).
Las operaciones devuelven Promises también al fallar validación; los errores
de construcción de configuración/DAO son síncronos.

| Opción de configuración | Comportamiento |
|---|---|
| `baseUrl` | HTTP(S) absoluta sin credenciales, query ni fragmento; conserva el contexto del WAR y normaliza la barra final. |
| `timeoutMs` | Por defecto 15000; entero positivo hasta 2147483647. Incluye espera y lectura del cuerpo. |
| `http.credentials` | Por defecto `omit`; los tres recursos oficiales fuerzan `omit` por contrato, incluso si otro entorno genérico utiliza credenciales. |
| `http.headers` | Cabeceras comunes; prioridad entorno → operación → solicitud. |
| `http.mode` | `cors`; no admite `no-cors`. |
| `http.cache` | Por defecto `no-store`. |
| `http.redirect` | Por defecto `error`; configurable como `follow` si otro despliegue lo exige. |
| `routes` | Registro central de contratos; su valor oficial es `API_ROUTES`. |

La configuración se copia e inmoviliza por DAO. Se puede inyectar `fetchImpl`
para pruebas. No se leen variables `process.env` desde el código del navegador.
No se añadió autenticación ni se cambió la política demo del backend.

## Operaciones disponibles

| DAO | Lecturas | Dependencias |
|---|---|---|
| `TipoDocumentoDAO` | `findRange`, `findById` | API pública de catálogo; UUID canónico para detalle. |
| `ClinicaDAO` | `findRange` | Modo demo activo; solo clínicas activas; sin detalle publicado. |
| `ConsultaDAO` | `findRange`, `findById` | Modo demo y clínica obligatoria, incluso para detalle. |

`create`, `update` y `deleteById` rechazan con `OPERATION_UNSUPPORTED` antes de
Fetch para los tres recursos. Los otros 17 DAO están exportados y rechazan
todas sus operaciones con `CONTRACT_PENDING`, sin HTTP. Consultar la
[matriz de los 20 DAO](inventario-dao.md) y las
[dependencias del backend](necesidades-backend.md).
El transporte genérico conserva preparación
para esos métodos y sus pruebas sintéticas anteriores; eso no habilita
escrituras contra Galenos. Un futuro contrato debe registrarlas expresamente.

El registro exige estado `verified`, fuente con revisión, método, ruta relativa,
formato de respuesta y estados de éxito. Puede declarar validadores de ID,
rango, query y DTO, cabeceras, mapeos y configuración de paginación. Un recurso
desconocido o deshabilitado produce `CONTRACT_PENDING` sin solicitudes.

## Validación y paginación

Se validan UUID canónicos sin imponer versiones UUID no exigidas por Java.
`first` es entero >=0 y `max` entero >0, ambos dentro del rango Java Integer.
El máximo por página depende de `GALENOS_API_MAX_PAGE_SIZE` del despliegue:
no se presupone 100 en el cliente. Un límite excedido conserva HTTP 422.

Las fechas de filtro son calendario `YYYY-MM-DD`, años 0001–9999, sin
normalizaciones de Date ni zona del navegador; se valida el orden desde/hasta.
El backend aplica su zona clínica y devuelve timestamps UTC; el DAO preserva
esas cadenas, los nombres y todos los null del DTO, sin traducirlos a texto UI.
Los parámetros desconocidos y la sustitución de first/max mediante query se
rechazan antes de enviar HTTP. Un valor opcional `undefined` se omite; `null` o
vacío en un filtro que exige valor es inválido.

Cada lista espera arreglo JSON y `Total-registros`, incluidos resultados vacíos.
Un total faltante/no expuesto o inválido es `INVALID_RESPONSE`; nunca se
sustituye por longitud de página o un número fijo. El total se desconoce en
los detalles y vale `null`. Los DTO se validan por los campos requeridos y sus
tipos/nulabilidad publicados; no se convierten en entidades JPA.

## DefaultResponse y compatibilidad

La interfaz pública y los argumentos de su constructor son `datos` y
`totalDatos`. Incluye además `status`, `statusText`, `headers`, `url` y
`metadata` (recurso, operación y rango pedido). `getHeader(name)` consulta la
instantánea de cabeceras sin distinguir mayúsculas.

`data` y `total` se conservan únicamente como getters de lectura para código
que consumiera la primera versión local. No son campos enumerables ni se
duplican al serializar. El constructor y el nuevo código deben usar los nombres
acordados. No se exige un sobre DefaultResponse al servidor: este devuelve
arreglo/objeto JSON y cabeceras.

## Errores y respuestas vacías

| `type` | Códigos principales y significado |
|---|---|
| `validation` | `INVALID_PARAMETER`, `INVALID_QUERY`, `INVALID_DATA`, `INVALID_CONFIG`, `INVALID_CONTRACT`, `BASE_URL_REQUIRED`, `CONTRACT_PENDING`, `OPERATION_UNSUPPORTED`. |
| `http` | `HTTP_ERROR`; conserva estado, cabeceras y cuerpo JSON o texto, incluido `mensaje` del backend. |
| `connection` | `NETWORK_ERROR`, `BODY_READ_ERROR`, `TIMEOUT`, `CANCELLED`. |
| `processing` | `INVALID_RESPONSE`: JSON, DTO, total o estado de éxito incompatible. |

Los fallos HTTP no se convierten en errores de red por un cuerpo no JSON.
Si falla la lectura o se alcanza el timeout después de recibir cabeceras,
se conserva el estado HTTP conocido. Sin respuesta accesible, el estado es
`null`: Fetch no distingue con certeza CORS de otros errores de conexión.
`cause` sirve para diagnóstico y no aparece en `toJSON()` ni se registra solo.

El núcleo procesa 204/205 sin parsear JSON cuando el contrato de la operación
admite ese estado. Los GET oficiales esperan 200: no se interpreta un 204 de
preflight como una lista válida. JSON 200 vacío o inválido es procesamiento.
No se reintentan escrituras automáticamente. Abortar o agotar el timeout no
acredita rollback de una operación futura que el backend haya recibido.

## Pruebas e integración

```sh
npm test
npm run check
npm run test:transport
```

Unitarias: Mocha, Chai y Sinon, con Fetch simulado. Transporte: Fetch nativo y
servidores HTTP sintéticos, incluidos los tres contratos oficiales. Ninguna de
esas suites demuestra una integración con GalenosSV/JPA/PostgreSQL.

Para integración real, copiar `test/integration/environment.example.js` como
`environment.local.js`. Completar URL y casos sintéticos con `resource`, `first`,
`max` e `id` si hay detalle. Consulta necesita `query: { idClinica }`; puede
usar filtros de lista y `detailQuery: { idClinica }` por separado. Opcionalmente
`missingId`/`missingStatus` permiten comprobar un error HTTP real confirmado.
No declarar casos de escritura para API 0.2. El runner genérico anterior solo
admitiría escrituras con contratos futuros explícitos y comprobación/limpieza.

Ejecutar `npm run test:integration`. `GALENO_INTEGRATION_CONFIG` permite elegir
otro módulo de configuración en Node. Sin URL/casos/configuración local, el
comando informa **INTEGRACIÓN NO EJECUTADA** y devuelve código 1.

Para navegador, ejecutar `npm run dev` y abrir `/test/integration/runner.html`.
La misma suite, Mocha y Chai se sirven localmente sin CDN ni proxy. CORS requiere
el origen exacto de BrowserSync en el backend. Los resultados de Fernando en
`rest-validation.md` y `consulta-demo.md` son evidencia de su entorno. La
integración ejecutada por este módulo se registra en
[verificacion.md](verificacion.md), separada de esas pruebas del backend.
