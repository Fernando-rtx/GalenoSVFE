# Consumo de DAO desde Boundary — Rodrigo

## Interfaz estable

El punto público es `src/js/index.js`. Hay 20 clases con nombres PascalCase
existentes y sufijo DAO; no se renombraron los tres DAO anteriores ni sus
métodos. Se conserva la convención del proyecto para no romper imports.

Cada DAO hereda estas firmas de DefaultDAO:

```text
findRange(first, max, options = {})
findById(id, options = {})
create(datos, options = {})
update(id, datos, options = {})
deleteById(id, options = {})
```

`options.query` contiene filtros/contexto; `options.signal` permite cancelar y
`options.headers` cabeceras de solicitud. Se mantiene ese envoltorio de opciones
para no introducir un tercer argumento ambiguo entre filtros y cancelación.
No enviar filtros JPA, nombres de tablas ni objetos FiltroDAO/OrdenDAO Java.

Los tres recursos confirmados son TipoDocumento (lista/detalle), Clínica
(lista) y Consulta (lista/detalle con idClinica). Los otros 17 devuelven
CONTRACT_PENDING sin HTTP. En recursos confirmados, una escritura o detalle de
Clínica no publicado devuelve OPERATION_UNSUPPORTED. No sustituir esos errores
por listas o registros ficticios en producción.

## Composición de la aplicación y Control

La inicialización importa una única configuración del entorno y entrega los
DAO al Control. Este ejemplo es una receta de integración; no modifica ni
implementa componentes asignados a Rodrigo.

```js
import { ClinicaDAO, ConsultaDAO } from './js/index.js';
import { config } from './js/config/environment.local.js';

const clinicas = new ClinicaDAO({ config });
const consultas = new ConsultaDAO({ config });

export function cargarClinicas(first, max, signal) {
  return clinicas.findRange(first, max, { signal });
}

export function cargarConsultas(first, max, idClinica, filtros, signal) {
  return consultas.findRange(first, max, {
    query: Object.assign({}, filtros, { idClinica }), signal
  });
}

export function cargarConsulta(idConsulta, idClinica, signal) {
  return consultas.findById(idConsulta, { query: { idClinica }, signal });
}
```

Los IDs de clínica se toman de la respuesta de ClinicaDAO y la selección de la
interfaz, nunca de un UUID del fixture. La clínica debe enviarse también al
detalle para conservar el ámbito. Lista admite fechaDesde/fechaHasta en formato
YYYY-MM-DD e idPersonaRol opcional. El detalle no admite esos filtros de lista.

## Ejemplo de consumo desde un Web Component existente

Fragmento para adaptar dentro del componente y sus eventos acordados:

```js
// this.cargarPagina es una función recibida del Control, no un Fetch.
actualizar(first, max) {
  if (this._consultaAbort) this._consultaAbort.abort();
  const controller = new AbortController();
  this._consultaAbort = controller;

  return this.cargarPagina(first, max, controller.signal).then(respuesta => {
    if (controller.signal.aborted) return;
    this.registros = respuesta.datos;
    this.totalRegistros = respuesta.totalDatos;
    this.renderizar();
  }).catch(error => {
    if (controller.signal.aborted || error.code === 'CANCELLED') return;
    this.presentarError(error);
  });
}

// Incorporar al disconnectedCallback existente, sin reemplazar otras limpiezas:
// if (this._consultaAbort) this._consultaAbort.abort();
```

El fragmento no fija eventos ni nombres públicos de los componentes: estos
siguen por acordar en el contrato de UI. renderizar/presentarError son puntos
de adaptación del componente, no métodos entregados por el módulo DAO. El
componente no importa Fetch ni la configuración del backend.

## Respuesta y errores

`DefaultResponse.datos` conserva el arreglo/objeto DTO; `totalDatos` es el total
real de lista y null en detalle. No usar datos.length como total. Una lista
vacía puede conservar un total mayor que cero si se pidió una página posterior.
`data` y `total` son alias de lectura de compatibilidad, no nombres para código
nuevo. metadata, status y getHeader son auxiliares; no trasladar HTTP al DOM.

Consulta usa personaNombre, rolNombre, clinicaNombre, fechaInicio y fechaFin
según API 0.2. Los null se preservan para que la UI elija su presentación. No
usar UUID como nombre ni inventar doctorNombre, pacienteNombre o estado clínico.
Las fechas DTO son UTC; los filtros son días de la zona clínica del backend.

Distinguir error.type (`validation`, `http`, `connection`, `processing`) y code.
CONTRACT_PENDING/OPERATION_UNSUPPORTED representan una dependencia del contrato;
TIMEOUT/NETWORK_ERROR un fallo de conexión; INVALID_RESPONSE un cuerpo/DTO/total
incompatible; HTTP_ERROR conserva status y details.mensaje cuando exista.
CANCELLED se puede ignorar al sustituir una búsqueda. La UI decide mensajes y
reintentos; una cancelación no prueba rollback de futuras escrituras.

## Entorno y entrega

La base URL solo se configura en environment.local.js. Para API 0.2 se fuerzan
credentials omit. El backend demo de Fernando usa únicamente fixtures y debe
permitir el origen de BrowserSync y exponer Total-registros. Ver demo-setup.md.

No se implementa un dashboard ni se cambian Web Components como parte de esta
entrega. El consumo real se verifica aparte de las pruebas unitarias y el
estado exacto está en verificacion.md e inventario-dao.md.
