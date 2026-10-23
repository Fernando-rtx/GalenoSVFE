# GalenoFE

Frontend web de GalenosSV. Esta carpeta contiene la semilla inicial del
repositorio; la API REST todavía debe implementarse y verificarse en el backend.

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
código y contrato. La carpeta local aún no tiene remoto configurado; no se han
creado permisos, invitaciones ni reglas de protección en GitHub.
