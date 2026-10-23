# GalenoSVFE

Frontend web de GalenosSV. Esta carpeta contiene la semilla inicial del
repositorio y el contrato REST de TipoDocumento, Clínica y Consulta académica.
Las ramas backend `feat/rest-tipo-documento` y `feat/consulta-read-model`
todavía están pendientes de integrar y publicar.

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
El contrato indica las rutas implementadas y los pendientes. Consulta y Clínica
requieren modo demo explícito y una base con datos exclusivamente ficticios;
todavía no hay integración del dashboard.

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
- Rodrigo: el DTO de Consulta ya define nombres de persona/rol/clínica y fechas.
  Los fixtures sintéticos están en `test/fixtures/`. Acordar con Itzep el modelo
  de presentación y los eventos de tarjetas en `docs/ui-contract.md`.
- Fernando: revisar e integrar los recursos REST. El modo demo fue autorizado
  para esta entrega; autenticación real y permisos siguen pendientes antes de
  cualquier uso con información clínica real.

El contrato canónico está en `Galenos/docs/api-contract.md`. La copia de este
repositorio corresponde a la misma revisión 0.2; las siguientes modificaciones
deben coordinarse en ambos repositorios. Las instrucciones de validación usan
archivos del backend y están en [`docs/rest-validation.md`](docs/rest-validation.md).
La entrega académica y su configuración están en
[`docs/consulta-demo.md`](docs/consulta-demo.md).
