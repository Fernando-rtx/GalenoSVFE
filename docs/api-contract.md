# API de GalenosSV — contrato 0.2

Fecha: 2026-10-23. Implementación inicial en `feat/rest-tipo-documento`, basada
en `origin/main` (`97b9c2f`). Requiere revisión e integración de la rama.
La revisión 0.2 agrega recursos académicos en `feat/consulta-read-model`,
dependiente del commit backend `19425d3`. Conserva el contrato de TipoDocumento.

## Base y alcance

`{origen-backend}/GalenosSV/resources` con el `server.xml` versionado.
El host y el puerto dependen del despliegue; no usar una URL `SNAPSHOT`.
El cliente recibe esta base desde configuración, sin quemarla en tarjetas.

Este lote publica únicamente lectura del catálogo `TipoDocumento`. No requiere
sesión ni credenciales y no devuelve documentos, personas o información clínica.
Las operaciones de escritura no están implementadas. Los recursos de Consulta
y Clínica descritos abajo solo están habilitados en la demostración sintética
autorizada por Fernando. CORS no sustituye autorización.

## GET /v1/tipo_documento

| Parámetro | Tipo y límites | Valor al omitir |
|---|---|---|
| `first` | Entero decimal >= 0, hasta 2147483647 | 0 |
| `max` | Entero decimal entre 1 y el máximo configurado | Tamaño configurado |

`GALENOS_API_PAGE_SIZE` define el tamaño por defecto (20) y
`GALENOS_API_MAX_PAGE_SIZE` el máximo (100). Ambos deben ser enteros positivos,
y el primero no puede superar al segundo. Vacíos, fracciones, signos y valores
fuera de rango producen 422; no se corrigen silenciosamente.

200 devuelve **un arreglo JSON**, no un objeto `DefaultResponse`. El DAO de
JavaScript adapta el arreglo y la cabecera a `datos` y `totalDatos`. Incluye
activos e inactivos y ordena por UUID ascendente para tener un orden estable.
No hay filtros adicionales en esta versión. `Total-registros` contiene el
conteo completo del catálogo, incluso en páginas vacías (`[]`). Conteo y página
son lecturas separadas; cambios concurrentes pueden modificar el total.

Ejemplo exclusivamente sintético del fixture `test/fixtures/tipo_documento.sql`:

```json
[
  {
    "idTipoDocumento": "00000000-0000-4000-8000-000000000001",
    "nombre": "Documento sintético A",
    "indicaciones": "Solo pruebas",
    "expresionRegular": "^[A-Z]{3}$",
    "activo": true
  }
]
```

## GET /v1/tipo_documento/{id}

`id` es UUID en forma canónica de 36 caracteres; acepta letras mayúsculas o
minúsculas. 200 devuelve un objeto con los mismos cinco campos del arreglo.
UUID válido ausente produce 404; UUID mal formado produce 422.
No incluye `Total-registros`.

| Campo | Tipo JSON | Nulabilidad |
|---|---|---|
| `idTipoDocumento` | string UUID | No nulo |
| `nombre` | string | Puede ser null |
| `indicaciones` | string | Puede ser null |
| `expresionRegular` | string | Puede ser null |
| `activo` | boolean | Puede ser null |

Los campos anulables se incluyen como `null`; no se omiten. El DTO excluye
`documentoCollection` y todas las relaciones JPA.

## Estados y errores

| Status | Caso | Cuerpo |
|---|---|---|
| 200 | GET de lista o detalle | Arreglo u objeto del catálogo |
| 204 | Preflight CORS permitido | Sin cuerpo |
| 403 | Origen o preflight no permitido | Error JSON |
| 404 | UUID válido sin registro | Error JSON |
| 405 | Método no implementado | Error JSON y cabecera `Allow` |
| 422 | Parámetros o UUID inválidos | Error JSON |
| 500 | Error inesperado, por ejemplo persistencia no disponible | Error JSON seguro |

Error de ejemplo: `{"mensaje":"Tipo de documento no encontrado"}`.
Los errores internos usan `{"mensaje":"Error interno del servidor"}`;
no devuelven SQL, trazas ni mensajes de excepciones de base de datos.
Un fallo de red/CORS no constituye una respuesta HTTP 404 o 500 para `fetch`.
La API usa `Cache-Control: no-store`.

## CORS

`GALENOS_CORS_ORIGINS` contiene orígenes HTTP(S) exactos separados por comas.
Ejemplo de desarrollo: `http://localhost:3000`. La configuración por defecto
es vacía y rechaza requests que incluyan `Origin`; requests sin `Origin` pueden
usar la API. No acepta wildcard, `null`, rutas, query, fragmentos o credenciales
en los orígenes configurados. `localhost` y `127.0.0.1` son orígenes distintos.

- Preflight: métodos `GET`/`HEAD`; anuncia `GET, HEAD, OPTIONS`.
- Request headers permitidos: `Accept`, `Content-Type`.
- Response expuesta: `Total-registros`.
- No habilita `Access-Control-Allow-Credentials`; el cliente debe usar
  `credentials: "omit"` para este catálogo.
- Los GET de error desde un origen permitido conservan cabeceras CORS.
- `Vary` incluye origen, método y cabeceras del preflight.
- No se emite `Location`, pues no hay POST implementado.

## Ejemplos HTTP

Definir `API_BASE` según el despliegue. En la prueba aislada se usa
`http://localhost:19080/GalenosSV/resources`; el puerto versionado habitual
del backend es 9080 y puede cambiarse mediante `HTTP_PORT`.

```sh
curl -i "$API_BASE/v1/tipo_documento?first=0&max=1"
curl -i "$API_BASE/v1/tipo_documento/$TIPO_DOCUMENTO_ID"
curl -i -H "Origin: $FRONTEND_ORIGIN" "$API_BASE/v1/tipo_documento"
curl -i -X OPTIONS -H "Origin: $FRONTEND_ORIGIN" \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: Content-Type' \
  "$API_BASE/v1/tipo_documento"
```

Ver `docs/rest-validation.md` para reproducir las pruebas del catálogo.

## Demostración académica de Consulta y Clínica

Decisión confirmada por Fernando: usar exclusivamente datos ficticios y el
contexto académico de selección, sin login real en esta entrega. La selección
de una clínica permite consultar todos sus registros sintéticos. No implica
permisos clínicos ni sirve para exponer una base con información real.

`GALENOS_DEMO_MODE=false` por defecto: estos dos recursos responden 404 sin
consultar sus DAO. Para habilitarlos, usar `true` y definir
`POSTGRESQL_DB_NAME` con patrón `galenos_demo_*` o `galenos_rest_test_*`
(sufijo en minúsculas, dígitos o guiones bajos). La configuración rechaza otros
nombres; el operador debe cargar únicamente el fixture sintético en esa base.
El prefijo de la base es una protección de configuración, no una comprobación
de que su contenido sea ficticio. No hay autenticación real en el modo demo.

### GET /v1/clinica

Lista paginada de clínicas activas para que el cliente obtenga las opciones y
UUID por HTTP, sin escribir IDs en componentes. Parámetros `first`/`max` y
cabecera `Total-registros` con las mismas reglas del catálogo; orden UUID
ascendente. No hay detalle de clínica en esta revisión.

```json
[{"idClinica":"00000000-0000-4000-8000-000000000011","nombre":"Clínica ficticia A"}]
```

Ejemplo sintético del fixture, no información real. El DTO excluye comentarios
y relaciones. El total cuenta solo clínicas activas.

### GET /v1/consulta

| Parámetro | Regla |
|---|---|
| `idClinica` | UUID canónico obligatorio de una clínica activa |
| `first`, `max` | Mismas reglas y configuración del catálogo |
| `fechaDesde` | Opcional, fecha `YYYY-MM-DD` válida, inclusiva |
| `fechaHasta` | Opcional, fecha `YYYY-MM-DD` válida, inclusiva |
| `idPersonaRol` | UUID canónico opcional; filtra la asignación dentro de la clínica |

Las fechas admiten años 0001–9999 y se aplican a `fechaInicio`. Cuando se envían
ambas, desde debe ser <= hasta. Se interpretan en
`GALENOS_CLINIC_TIME_ZONE` (por defecto `America/El_Salvador`, igual que la vista
JSF actual). El límite superior se convierte al comienzo del día siguiente y
usa comparación estricta `<`; los timestamps JSON se devuelven como ISO 8601 UTC
con `Z`, independientemente de la zona del filtro.

200 devuelve un arreglo ordenado por UUID de consulta ascendente y
`Total-registros` cuenta exactamente el conjunto filtrado. El total no es la
cantidad de elementos de la página. Clínica activa sin coincidencias o página
posterior al último registro produce `[]`, manteniendo el conteo correspondiente.
Las consultas sin `PersonaRol`/clínica no pertenecen a un conjunto seleccionable.

### GET /v1/consulta/{id}?idClinica={idClinica}

Clínica obligatoria. Busca el UUID **dentro de esa clínica**. Un UUID de otra
clínica produce el mismo 404 que uno ausente. 200 devuelve un objeto, sin
`Total-registros`. Clínica ausente o inactiva produce 404; UUID, fecha o rango
inválidos producen 422. Con demo desactivada prevalece 404.

### DTO de Consulta

Ejemplo exclusivamente sintético de `test/fixtures/consulta_demo.sql`:

```json
{
  "idConsulta": "00000000-0000-4000-8000-000000001002",
  "fechaInicio": "2026-10-22T06:00:00Z",
  "fechaFin": "2026-10-22T07:00:00Z",
  "idPersonaRol": "00000000-0000-4000-8000-000000000101",
  "personaNombre": "Persona ficticia Uno",
  "rolNombre": "Rol sintético",
  "idClinica": "00000000-0000-4000-8000-000000000011",
  "clinicaNombre": "Clínica ficticia A"
}
```

`idConsulta` es string UUID no nulo. El resto de campos puede ser `null`; las
propiedades siempre se incluyen. Fechas son string UTC o null. Identificadores
son string UUID o null; nombres son string o null. El nombre de persona se
forma con nombres y apellidos disponibles, sin sustituir ausencias por un UUID.

El DTO no expone observaciones, referencia externa, DUI, documentos, fechas de
nacimiento ni colecciones JPA. No existe campo médico o estado persistido de
Consulta; no se inventan `doctorNombre`, `pacienteNombre` ni estados clínicos.
El vínculo real es `Consulta -> PersonaRol -> Persona/Rol/Clínica`.

Estos recursos usan los mismos errores JSON, CORS, `credentials: "omit"` y
`Cache-Control: no-store` del catálogo. Solo lectura: no POST, PUT o DELETE.
No se implementó búsqueda por texto, médicos ni HTTP QUERY.

```sh
curl -i "$API_BASE/v1/clinica?first=0&max=20"
curl -i --get "$API_BASE/v1/consulta" \
  --data-urlencode "idClinica=$CLINICA_ID" \
  --data-urlencode 'fechaDesde=2026-10-22' \
  --data-urlencode 'fechaHasta=2026-10-22'
curl -i "$API_BASE/v1/consulta/$CONSULTA_ID?idClinica=$CLINICA_ID"
```

Las fechas del ejemplo pertenecen al fixture sintético; el cliente obtiene
clínicas por HTTP y fechas de los filtros de usuario. Reproducción y límites:
`docs/consulta-demo.md`. Autenticación y autorización reales serán un contrato
posterior antes de usar datos clínicos.
