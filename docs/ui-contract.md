# Contrato de interfaz: tarjetas de consulta

**Estado:** implementado en `cortez` conforme al consumo del dashboard de Itzep.
**Alcance:** presentación de consultas académicas con datos sintéticos. Este documento no define ni modifica el contrato REST.

## Responsabilidades

- El DAO HTTP y el dashboard obtienen la respuesta de la API y manejan carga, error, filtros y paginación.
- El dashboard transforma cada registro de la API al modelo de presentación y entrega un modelo a cada `tarjeta-consulta`.
- `tarjeta-consulta` presenta una consulta y emite un evento al seleccionarla. No hace `fetch`, no decide permisos y no navega por rutas propias.
- `tarjeta-simple` es genérica y no conoce consultas ni la API.

La API devuelve un arreglo JSON y la cabecera `Total-registros`. El DAO adapta esos datos a `DefaultResponse`; una tarjeta recibe un solo modelo de consulta, nunca el arreglo completo ni `DefaultResponse`.

## Modelo propuesto para una tarjeta

El dashboard asigna el modelo a una propiedad JavaScript, no a un atributo de texto:

```js
tarjeta.consulta = {
  idConsulta: "UUID de la consulta",
  personaNombre: "Persona ficticia Uno",
  rolNombre: "Rol sintético",
  clinicaNombre: "Clínica ficticia A",
  fechaInicio: "2026-10-22T06:00:00Z",
  fechaFin: null
};
```

Campos:

| Campo | Tipo | Uso en la interfaz |
|---|---|---|
| `idConsulta` | UUID en texto | Se conserva para identificar la consulta en el evento; no se muestra como título. |
| `personaNombre` | texto o `null` | Nombre visible cuando está disponible. |
| `rolNombre` | texto o `null` | Rol asociado a la persona; no asumir que es médico. |
| `clinicaNombre` | texto o `null` | Clínica visible cuando está disponible. |
| `fechaInicio` | fecha ISO 8601 UTC o `null` | Fecha de inicio, formateada para lectura. |
| `fechaFin` | fecha ISO 8601 UTC o `null` | Fecha de finalización, si existe. |

Estos campos provienen del DTO de Consulta del contrato REST 0.2. Los nombres y las fechas pueden ser `null`. No hay campos confirmados de médico ni estado clínico, por lo que la tarjeta no debe inventarlos. La tarjeta usa “Persona sin nombre” para el título ausente y “Sin especificar” para los demás datos ausentes, igual que el dashboard.

La API representa las fechas en UTC. La tarjeta y el dashboard comparten `formatUtcDate`: muestra fecha y hora con `Intl.DateTimeFormat('es-SV', { timeZone: 'UTC' })` y el sufijo “UTC”. Esta decisión fue indicada por Rodrigo para mantener ambas vistas coherentes.

## Contrato de `tarjeta-simple`

Componente presentacional genérico. No importa entidades de consulta, no consume la API y no contiene textos clínicos.

Slots disponibles:

- `titulo`: encabezado de la tarjeta.
- `contenido`: contenido principal.
- `pie`: acciones o información adicional provista por la página.

El componente presenta contenido alternativo neutral si un slot no recibe contenido. Los controles interactivos que se coloquen en `pie` deben ser accesibles por teclado.

## Contrato de `tarjeta-consulta`

- Recibe un objeto `consulta` mediante propiedad JavaScript.
- Compone `tarjeta-simple` y asigna sus hijos a los slots `titulo`, `contenido` y, si corresponde, `pie`.
- Presenta solo los campos disponibles y los textos de respaldo acordados.
- Inserta datos recibidos usando nodos DOM y `textContent`; no interpola datos en `innerHTML`.
- No hace peticiones HTTP ni contiene URL, navegación, clínica o permisos fijos.

## Evento de selección propuesto

Cuando la persona activa el control de selección de la tarjeta, esta emite `consulta-seleccionada`:

```js
new CustomEvent("consulta-seleccionada", {
  detail: { idConsulta: consulta.idConsulta },
  bubbles: true,
  composed: true
});
```

`detail` contiene solo el identificador necesario para que el dashboard determine qué consulta fue seleccionada. `DashboardPage` ya escucha este evento en la raíz y pide el detalle a través de `DashboardControl`. El control visible del pie se llama “Ver detalle”.

## Estados y límites

- La lista vacía, la carga y los errores pertenecen al dashboard; no a cada tarjeta.
- Un campo `null` no se representa como `null`, `undefined` ni como UUID.
- Los datos de Consulta y Clínica descritos en API 0.2 son únicamente para la demostración sintética. La demo está desactivada por defecto y no cuenta con autenticación real.
- Las tarjetas no almacenan datos clínicos en `localStorage`.

## Registro e integración

`src/js/app/main.js` importa `tarjeta_consulta.js`, que registra ambos elementos. La página crea `tarjeta-consulta`, asigna la propiedad `consulta` antes de conectarla al DOM y escucha `consulta-seleccionada`. Si se actualiza la propiedad después, la tarjeta vuelve a presentar sus datos sin duplicar su estructura.

Los estilos se cargan dentro de cada Shadow DOM desde `src/resources/estilos/tarjeta.css` y `tarjeta_consulta.css`. Las rutas se resuelven con `new URL(..., import.meta.url)` al servir el proyecto desde `src`.
