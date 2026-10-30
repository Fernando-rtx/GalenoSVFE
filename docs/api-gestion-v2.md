# Gestión sintética autenticada (v2)

Extensión compatible de API 0.2: `/resources/v1` conserva sus rutas y contrato.
`/resources/v2` requiere BASIC validado por Liberty y cabecera Authorization explícita.
Solo está disponible con GALENOS_CRUD_DEMO=true, GALENOS_DEMO_MODE=true y base **galenos_demo_crud**.
No habilitar en clinica. No constituye autenticación clínica de producción.

Roles técnicos de prueba: galenos-demo-read permite lectura; galenos-demo-write permite escritura.
Las credenciales privadas del launcher permanecen fuera de Git; no se guardan en el navegador.
El selector JSF de rol no autentica esta API. GET contexto devuelve actor, puedeEscribir y UUID de clinicas autorizadas.
Para entidades clínicas el alcance debe comprobarse por identidad y clínica, nunca por selector visual.

## Catálogos

| Ruta v2 | Identificador | Campos publicados y de entrada (sin identificador) | Operaciones |
| --- | --- | --- | --- |
| tipo_documento | idTipoDocumento | nombre, indicaciones, expresionRegular, activo | GET lista/ID, POST, PUT |
| tipo_medio_contacto | idTipoMedioContacto | nombre, indicaciones, expresionRegular, activo | GET lista/ID, POST, PUT |
| tipo_examen | idTipoExamen | nombre, observaciones, activo | GET lista/ID, POST, PUT |
| clinica | idClinica | nombre, tipo, comentarios, activo | GET lista/ID, POST, PUT, DELETE |
| rol | idRol | nombre, observaciones, activo | GET lista/ID, POST, PUT, DELETE |

DTO explícitos, valores null incluidos. Strings o null, activo boolean o null; no entidades JPA ni relaciones.
PUT reemplaza los campos publicados, no es PATCH. UUID asignado por DAO. POST201 con Location, PUT200 DTO, DELETE204.
Listas paginadas en PostgreSQL: first>=0, max1..100, predeterminados0/20, Total-registros obligatorio.
Filtro opcional nombre (LIKE contiene, semántica DAO existente), orden estable UUID ascendente.
GET ID inexistente404; UUID/JSON/campo inválido422 (JSON mal formado puede producir400 del runtime).
Errores de negocio422; duplicados o referencias409; falta identidad401; permisos403; método no publicado405;
fallos inesperados500 con mensaje seguro. Las causas de persistencia no se convierten en resultados normales.

Validaciones compartidas con JSF en CatalogoService. TipoDocumento y tipos de contacto validan regex Java.
TipoMedioContacto mantiene la regla JSF: no se impone unicidad de nombre que no existía.
Tipos se desactivan por PUT activo=false: la pantalla JSF no ofrece eliminación física.
Clínica y Rol permiten eliminación según sus Models, con rechazo de referencias existentes.

CORS exacto del origen configurado; v2 permite Authorization y GET/HEAD/POST/PUT/DELETE/OPTIONS.
401 del contenedor también publica CORS para permitir mensajes visibles. Cache-Control no-store.
No hay Access-Control-Allow-Credentials: el frontend usa credentials:omit y Basic en memoria.
