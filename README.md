# GalenoSVFE

Frontend web de GalenosSV. Esta carpeta contiene la semilla inicial del
repositorio y el contrato del primer recurso REST de lectura de TipoDocumento,
implementado en la rama backend `feat/rest-tipo-documento`, pendiente de integrar.

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
El contrato indica las rutas implementadas y los pendientes. La API del catálogo
ya se comprobó en un ambiente aislado; todavía no hay integración del dashboard.

## Colaboración

Trabaja en ramas cortas distintas de `main`. Abre PR para revisar cambios de
código y contrato. El remoto `origin` apunta a `Fernando-rtx/GalenoSVFE`.
Al vincularlo no se encontraron ramas ni etiquetas remotas; la semilla permanece
local hasta su publicación. Fernando confirmó que las invitaciones de los tres
integrantes ya están hechas. Las reglas de protección todavía no se han
verificado.

## Entrega para el equipo

- Itzep: adaptar el arreglo JSON y `Total-registros` a `DefaultResponse`, con
  base URL configurable y `credentials: "omit"`; consultar el contrato antes
  de implementar DAOs. Esta semilla no incluye tooling ni acceso HTTP del cliente.
- Rodrigo: el catálogo todavía no define una tarjeta de Consulta. Los campos,
  eventos y permisos del dashboard se acordarán cuando exista ese contrato.
- Fernando: revisar e integrar el primer recurso REST; definir identidad,
  permisos por clínica y DTO antes de exponer Consulta.

El contrato canónico está en `Galenos/docs/api-contract.md`. La copia de este
repositorio corresponde a la misma revisión 0.1; las siguientes modificaciones
deben coordinarse en ambos repositorios. Las instrucciones de validación usan
archivos del backend y están en [`docs/rest-validation.md`](docs/rest-validation.md).
