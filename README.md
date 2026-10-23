# GalenoSVFE

Frontend web de GalenosSV. Incluye la estructura inicial del equipo, el módulo
de acceso a datos y el contrato REST de TipoDocumento, Clínica y Consulta académica.
La entrega se consolida en `main` de ambos repositorios. Los cambios nacieron
en las ramas backend `feat/rest-tipo-documento` y `feat/consulta-read-model`.

- Frontend: [Fernando-rtx/GalenoSVFE](https://github.com/Fernando-rtx/GalenoSVFE),
  carpeta local `/home/fernando/NetBeansProjects/GalenoFE`.
- Backend: [Fernando-rtx/Galenos](https://github.com/Fernando-rtx/Galenos),
  carpeta local `/home/fernando/NetBeansProjects/Galenos`.

## Estructura

El código se organiza en `boundary` (interfaz), `control` (acceso HTTP y
coordinación) y `entity` (datos). La estructura acordada está descrita en
[`AGENTS.md`](AGENTS.md). El contrato actual y sus pendientes están en
[`docs/api-contract.md`](docs/api-contract.md).

El módulo de acceso a datos incorpora, con autorización de su responsable,
Mocha, Chai, Sinon y BrowserSync como dependencias de desarrollo de versión
fija en `package.json` y `package-lock.json`. Requiere Node >=22 para pruebas
y herramientas; no añade dependencias de producción ni frameworks.
El contrato indica las rutas implementadas y los pendientes. Consulta y Clínica
requieren modo demo explícito y una base con datos exclusivamente ficticios;
todavía no hay integración del dashboard.

## Backend local para integrar

Desde la carpeta del backend, ejecutar `./demo start`. El comando prepara su
propio PostgreSQL, datos ficticios y Open Liberty con Java 21. `./demo info`
entrega la conexión pública; por defecto la base URL es
`http://localhost:19081/GalenosSV/resources` y el origen CORS es
`http://localhost:3000`.

Ver [`docs/demo-setup.md`](docs/demo-setup.md) para requisitos, puertos,
verificación y parada. Estos comandos y scripts pertenecen al repositorio
`Galenos`; la elección del módulo de configuración JS corresponde a Itzep.

## Colaboración

Trabaja en ramas cortas distintas de `main`. Abre PR para revisar cambios de
código y contrato. El remoto `origin` apunta a `Fernando-rtx/GalenoSVFE`.
Fernando confirmó las invitaciones de los tres integrantes y autorizó publicar
esta entrega directamente en `main`, sin PR. Esa excepción corresponde a esta
carga inicial; las reglas de protección para futuros cambios quedan por acordar.

## Entrega para el equipo

- Itzep: adaptar el arreglo JSON y `Total-registros` a `DefaultResponse`, con
  base URL configurable y `credentials: "omit"`. El módulo local implementa las
  lecturas confirmadas y rechaza escrituras no publicadas; ver `docs/acceso-datos.md`.
- Rodrigo: el DTO de Consulta ya define nombres de persona/rol/clínica y fechas.
  Los fixtures sintéticos están en `test/fixtures/`. Acordar con Itzep el modelo
  de presentación y los eventos de tarjetas en `docs/ui-contract.md`.
- Fernando: recursos REST y contratos entregados para integración. El modo demo fue autorizado
  para esta entrega; autenticación real y permisos siguen pendientes antes de
  cualquier uso con información clínica real.

El contrato canónico está en `Galenos/docs/api-contract.md`. La copia de este
repositorio corresponde a la misma revisión 0.2; las siguientes modificaciones
deben coordinarse en ambos repositorios. Las instrucciones de validación usan
archivos del backend y están en [`docs/rest-validation.md`](docs/rest-validation.md).
La entrega académica y su configuración están en
[`docs/consulta-demo.md`](docs/consulta-demo.md).

## Acceso a datos y verificación local

```sh
npm ci
npm test
npm run check
npm run test:transport
npm run dev
```

BrowserSync sirve `src/` y el runner `/test/integration/runner.html`, sin proxy
al backend. Copiar `src/js/config/environment.example.js` a
`environment.local.js` y completar la URL efectiva, incluido
`/GalenosSV/resources/`. No hay host ni puerto de backend fijados en los DAO.

`npm run test:integration` requiere configuración de prueba local y un backend
real. Sin ellos informa **INTEGRACIÓN NO EJECUTADA** y devuelve código 1.
Las pruebas de transporte usan un servidor sintético, no acreditan GalenosSV.

- [API del cliente y ejemplos](docs/acceso-datos.md)
- [Correspondencia con el contrato oficial](docs/contratos-rest.md)
- [Inventario de los 20 DAO y estado REST](docs/inventario-dao.md)
- [Contratos pendientes y propuestas para Fernando](docs/necesidades-backend.md)
- [Consumo desde los componentes de Rodrigo](docs/consumo-dao-rodrigo.md)
- [CORS y entorno](docs/cors.md)
- [Resultados comprobados](docs/verificacion.md)
- [Preparación del Pull Request](docs/preparacion-pr.md)

Hay 20 clases DAO: TipoDocumento, Clínica y Consulta consumen las cinco lecturas
publicadas en API 0.2. Las otras 17 rechazan `CONTRACT_PENDING` sin enviar HTTP;
su existencia no implica que estén integradas. Ninguna habilita escrituras.
