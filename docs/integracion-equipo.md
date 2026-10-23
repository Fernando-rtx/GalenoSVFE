# Coordinación del módulo de Itzep

La rama `feature/itzep-acceso-datos` incorpora la historia oficial de
GalenoSVFE hasta `81a2056`, sin modificar main. Se conservan AGENTS.md, plantilla
PR y contratos oficiales. La publicación de esta rama está autorizada;
el merge hacia main queda pendiente de revisión del responsable.

## Archivos compartidos

README.md añade comandos y enlaces del módulo conservando la entrega oficial.
.gitignore conserva las reglas del equipo y excluye configuraciones locales.
test/fixtures/README.md documenta el único fixture añadido, TipoDocumento.
Los JSON oficiales de Clínica y Consulta se conservan intactos.

package.json y package-lock.json son incorporaciones respecto a main, con
Mocha 12.0.3, Chai 6.3.0, Sinon 22.1.0 y BrowserSync 3.0.4: versiones exactas
previamente autorizadas y sin dependencias de producción. bs-config.cjs sirve
src y el runner local de integración en loopback, sin proxy a la API.
No se modifican app, Boundary, estilos o código Java.

## Interfaz para Rodrigo

Importar los 20 DAO y tipos desde src/js/index.js. Las lecturas disponibles
resuelven con DefaultResponse.datos y totalDatos. Se preservan DTO, null y
fechas UTC; Boundary decide la presentación. Ver
[consumo-dao-rodrigo.md](consumo-dao-rodrigo.md) para composición, cancelación
y paginación sin Fetch desde los componentes.

No se cambian Web Components ni se inventa un contrato de eventos de tarjetas.
El acuerdo de presentación/eventos entre Rodrigo e Itzep sigue pendiente.
Los 17 DAO sin REST rechazan CONTRACT_PENDING; no usar fixtures como respaldo
de producción ni presentar sus operaciones como integradas.

## Coordinación con Fernando

TipoDocumento, Clínica y Consulta consumen API 0.2 con credentials omit.
Consulta exige clínica en lista y detalle. El servidor decide el máximo de
página y se conserva HTTP 422 si se excede. No se exportan relaciones JPA.

La integración real de las lecturas pasó contra el demo oficial aislado con
Java 21, Open Liberty y PostgreSQL sintético. Ver [verificacion.md](verificacion.md).
Cada nuevo entorno debe configurar URL, modo demo y CORS con origen exacto y
Total-registros expuesto. La comprobación desde navegador sigue pendiente.

El [inventario](inventario-dao.md) identifica campos/relaciones y métodos Java
sin confundirlos con REST. [necesidades-backend.md](necesidades-backend.md)
propone contratos para los otros 17 recursos: Fernando debe aprobar y publicar
rutas, DTO y pruebas antes de activarlos en api-routes.js. Escrituras,
autenticación y permisos reales requieren contratos nuevos.

La plantilla oficial de PR pide revisión de Fernando para REST y coordinación
con Rodrigo para el consumo. No se hace merge a main en esta publicación.
