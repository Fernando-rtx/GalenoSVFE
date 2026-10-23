# API de GalenosSV — contrato 0.1

Fecha: 2026-10-23. Implementación inicial en `feat/rest-tipo-documento`, basada
en `origin/main` (`97b9c2f`). Requiere revisión e integración de la rama.

## Base y alcance

`{origen-backend}/GalenosSV/resources` con el `server.xml` versionado.
El host y el puerto dependen del despliegue; no usar una URL `SNAPSHOT`.
El cliente recibe esta base desde configuración, sin quemarla en tarjetas.

Este lote publica únicamente lectura del catálogo `TipoDocumento`. No requiere
sesión ni credenciales y no devuelve documentos, personas o información clínica.
No se publican operaciones de escritura ni endpoints de `Consulta`; sus roles
de lectura y DTO todavía requieren definición. CORS no sustituye autorización.

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

Ver `docs/rest-validation.md` para reproducir las pruebas. Antes de publicar
`Consulta`, acordar autenticación, actor y clínica; la selección de rol en JSF
no debe asumirse como autorización de una API clínica.
