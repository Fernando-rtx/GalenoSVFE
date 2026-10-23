# GalenoSVFE

Frontend web de GalenosSV. Esta carpeta contiene la semilla inicial del
repositorio; la API REST todavía debe implementarse y verificarse en el backend.

- Frontend: [Fernando-rtx/GalenoSVFE](https://github.com/Fernando-rtx/GalenoSVFE),
  carpeta local `/home/fernando/NetBeansProjects/GalenoFE`.
- Backend: [Fernando-rtx/Galenos](https://github.com/Fernando-rtx/Galenos),
  carpeta local `/home/fernando/NetBeansProjects/Galenos`.

## Estructura

El código se organiza en `boundary` (interfaz), `control` (acceso HTTP y
coordinación) y `entity` (datos). La estructura acordada está descrita en
[`AGENTS.md`](AGENTS.md). El contrato actual y sus pendientes están en
[`docs/api-contract.md`](docs/api-contract.md).

Todavía no se fijan versiones de Node/npm ni un servidor de desarrollo: se
acordarán con el responsable del tooling antes de incorporar dependencias.
No se debe consumir ningún endpoint hasta que aparezca como confirmado en el
contrato.

## Colaboración

Trabaja en ramas cortas distintas de `main`. Abre PR para revisar cambios de
código y contrato. El remoto `origin` apunta a `Fernando-rtx/GalenoSVFE`.
Al vincularlo no se encontraron ramas ni etiquetas remotas; la semilla permanece
local hasta su publicación. Los permisos, invitaciones y reglas de protección
en GitHub todavía no se han verificado.
