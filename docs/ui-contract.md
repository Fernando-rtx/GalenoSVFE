# Contrato de interfaz: tarjetas de consulta

**Estado:** borrador para revisión de Rodrigo e Itzep.  
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

Estos campos provienen del DTO de Consulta del contrato REST 0.2. Los nombres y las fechas pueden ser `null`. No hay campos confirmados de médico ni estado clínico, por lo que la tarjeta no debe inventarlos. Los textos de respaldo propuestos son “Persona no especificada”, “Clínica no disponible” y “Fecha no disponible”; Rodrigo e Itzep pueden acordar otros textos.

La API representa las fechas en UTC. Propuesta de presentación: formatearlas con `Intl.DateTimeFormat` para `es-SV` y la zona `America/El_Salvador`. Confirmar esta decisión antes de cerrar el contrato.

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

`detail` contiene solo el identificador necesario para que el dashboard determine qué consulta fue seleccionada. El dashboard decide la acción posterior. Confirmar con Itzep el nombre del evento, el elemento que lo escucha y la acción esperada antes de implementar la integración.

## Estados y límites

- La lista vacía, la carga y los errores pertenecen al dashboard; no a cada tarjeta.
- Un campo `null` no se representa como `null`, `undefined` ni como UUID.
- Los datos de Consulta y Clínica descritos en API 0.2 son únicamente para la demostración sintética. La demo está desactivada por defecto y no cuenta con autenticación real.
- Las tarjetas no almacenan datos clínicos en `localStorage`.

## Pendientes de revisión con Itzep

1. Confirmar que el dashboard asignará el modelo por la propiedad `consulta`.
2. Confirmar textos de respaldo y formato de fecha.
3. Confirmar nombre y detalle del evento, y cómo lo usará el dashboard.
4. Confirmar si el pie de tarjeta requiere una acción para esta primera entrega.
