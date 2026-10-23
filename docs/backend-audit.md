# Auditoría para el primer recurso REST

Fecha: 2026-10-23. Backend `Fernando-rtx/Galenos`.

## Base de trabajo

Se encontró limpio el checkout `Cortez` (`480b325`). Después de `git fetch
origin`, `origin/main` avanzó a `97b9c2f`. Se creó
`feat/rest-tipo-documento` desde esa referencia, sin modificar `main` ni
sobrescribir trabajo local. El frontend vive en `Fernando-rtx/GalenoSVFE`,
carpeta local `GalenoFE`; la semilla y los contratos se consolidan en `main`.

Antes de implementar no se encontraron recursos Jakarta REST, ApplicationPath
ni filtros CORS en `origin/main`. `TipoDocumentoDAO` ya ofrecía búsqueda por
UUID, consulta paginada con orden y conteo; no fue necesario duplicar SQL ni
modificar el esquema existente. La entidad contiene una relación hacia
documentos que el DTO REST excluye explícitamente.

También se buscaron recursos en las referencias remotas descargadas. La rama
`origin/Itzep` contiene únicamente `JakartaEE11Resource`, un ejemplo
`@Path("jakartaee11")` que responde texto `ping Jakarta EE`; no es un recurso
de TipoDocumento o Consulta y no está integrado en `origin/main`. No se encontró
otro recurso REST de dominio que hubiera que recuperar antes de este lote.

## Entorno observado

| Elemento | Evidencia efectiva |
|---|---|
| Java instalado | OpenJDK 25.0.4.1; no se encontró JDK 21 local |
| Objetivo de compilación | release 21 del POM, conservado |
| Maven | 3.9.16 |
| Open Liberty instalado y usado | 26.0.0.8 |
| Jakarta EE | 11.0.0; webProfile-11.0 en Liberty |
| PrimeFaces | 15.0.17 Jakarta |
| JDBC PostgreSQL | 42.7.4 |
| PostgreSQL efectivo | 12.22 en contenedor local `postgres-local` |
| Node/npm observados | 24.17.0 / 11.13.0; tooling FE todavía no fijado |

El anterior documento de entorno mencionaba PostgreSQL 18.6; la instancia local
usada en este ensayo responde 12.22. `server.xml` define `clinica` como nombre
de base por defecto, pero el ejemplo de entorno decía `universidad`. Se alineó
el ejemplo con `server.xml`; no se cambió ninguna base existente.

## Cambios y límites

Se añadió REST de lectura para `TipoDocumento` con DTO, validación, errores JSON
y CORS configurable. No se añadieron dependencias Maven/npm, escrituras REST,
endpoints clínicos ni cambios de tablas de la aplicación. El WAR sigue
conteniendo JSF/PrimeFaces y se ejecutaron las pruebas Java existentes.

La integración se hizo contra una nueva base `galenos_rest_test_*` con solo dos
tipos de documento sintéticos, usando un servidor Liberty separado en 19080.
No se leyó el contenido de la base clínica ni se copiaron credenciales al repo.

## Pendiente para Consulta

La aplicación contiene selección de rol y clínica en la sesión JSF. Eso no
demuestra autenticación ni autorización HTTP de una API para datos clínicos.
Antes del recurso `Consulta` deben acordarse identidad verificable, reglas de
acceso por actor/clínica y campos autorizados del DTO. No se asumen esos
permisos a partir de un selector visual.

Resultados y reproducción: `docs/rest-validation.md`. Contrato compartido:
`docs/api-contract.md`. Las invitaciones de los tres integrantes fueron
confirmadas por Fernando en la conversación. Fernando autorizó después la
publicación directa de esta entrega en `main`, sin PR. La protección de ramas
queda como política por acordar para futuros cambios.

## Segunda entrega: Consulta académica

Fernando confirmó que la entrega usará exclusivamente datos ficticios. La rama
`feat/consulta-read-model` agrega un modo demo explícito, desactivado por
defecto, que solo acepta nombres de base con prefijo de demostración/prueba.
No se interpreta la sesión JSF como autenticación. La API demo de Consulta
requiere una clínica y la aplica también al detalle; no publica información
clínica libre, documentos o colecciones.

`GET /v1/clinica` permite obtener las opciones del selector por HTTP, sin IDs
quemados en componentes. Se conservan los DAO y el esquema existentes.
Fixtures de siete consultas y relaciones sintéticas se cargaron únicamente en
la base aislada de la entrega anterior. Contrato 0.2 y reproducción:
`docs/consulta-demo.md`. El uso con datos reales sigue pendiente de un contrato
de autenticación y autorización.
