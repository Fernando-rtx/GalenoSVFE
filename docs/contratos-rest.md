# Correspondencia del cliente con API 0.2

Contrato canónico del equipo: [api-contract.md](api-contract.md), mantenido sin
cambios. Backend contrastado: `Fernando-rtx/Galenos` en `e4edd6c6`. Frontend base:
`Fernando-rtx/GalenoSVFE` en `81a2056`, revisión del 23 de octubre de 2026.

Las rutas se verificaron en RestApplication, TipoDocumentoResource,
ClinicaResource y ConsultaResource, junto a sus DTO, RestParameters, ApiSettings
y CorsFilter. Base configurable: `{origen-backend}/GalenosSV/resources/`.

| Recurso | Operación | Ruta relativa | Parámetros | Resultado |
|---|---|---|---|---|
| TipoDocumento | GET lista | `v1/tipo_documento` | first, max | Arreglo DTO y Total-registros. |
| TipoDocumento | GET detalle | `v1/tipo_documento/{id}` | UUID canónico | Objeto DTO; sin total. |
| Clínica | GET lista | `v1/clinica` | first, max | Clínicas activas, arreglo y total. |
| Consulta | GET lista | `v1/consulta` | first, max, idClinica obligatorio; fechaDesde, fechaHasta, idPersonaRol opcionales | Arreglo DTO y conteo filtrado. |
| Consulta | GET detalle | `v1/consulta/{id}` | UUID e idClinica obligatorio | Objeto DTO dentro de esa clínica; sin total. |

Todos los GET esperan 200, JSON y `credentials: "omit"`. POST, PUT y DELETE
no están publicados. Clínica no tiene detalle. Clínica y Consulta requieren
modo demo y una base exclusivamente ficticia según `consulta-demo.md`; cuando
la demo está desactivada devuelven 404. El cliente preserva ese error y no lo
transforma en conjunto vacío ni recurre automáticamente a un fixture.

Los límites de página del despliegue se validan en el backend. Los estados de
error, UUID y tipos/nulabilidad son los publicados en el contrato; el DAO no
deriva propiedades de JPA, no incluye relaciones como documentoCollection y
no inventa doctorNombre, pacienteNombre ni estados clínicos.

El registro ejecutable es `src/js/config/api-routes.js`. La cabecera de total
se declara obligatoria para listas; los detalles devuelven `totalDatos: null`.
`DefaultResponse` adapta a `datos` y `totalDatos` sin exigir un sobre JSON.

Los fixtures oficiales de Consulta/Clínica se conservaron sin cambios. El
fixture adicional de TipoDocumento copia el ejemplo sintético del contrato.
Solo se usan en pruebas; no son valores de respaldo del cliente de producción.

## Dependencias que continúan pendientes

- Contratos REST y DTO para los otros 17 DAO; ver [inventario](inventario-dao.md).
- Configuración de URL, fixture sintético y CORS de cada nuevo entorno.
- Comprobación CORS desde navegador: no hubo navegador disponible en esta sesión.
- Contratos futuros de escritura, autenticación y autorización para uso real.

Se ejecutaron las lecturas contra el demo oficial Java 21/Open Liberty/JPA/
PostgreSQL con datos sintéticos, sin mocks. Los resultados y sus límites están
en [verificacion.md](verificacion.md). Las rutas de necesidades-backend.md son
propuestas para discusión, no contratos confirmados ni rutas ejecutables.
