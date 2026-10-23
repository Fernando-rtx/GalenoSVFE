# Contrato API de GalenosSV

**Estado:** borrador de inventario, sin endpoints REST confirmados.
**Revisión:** 0 (2026-10-23).

## Estado actual

La auditoría del checkout `Galenos` en la rama `Cortez`, commit `480b325`,
encontró DAO y modelos Java para `TipoDocumento` y `Consulta`, pero no encontró
recursos Jakarta REST ni una ruta HTTP implementada. Los DAO existentes son
acceso JPA del servidor; no son contrato para el navegador.

Por tanto, todavía no hay URL base, path, esquema JSON, método de paginación,
roles, cabeceras CORS ni status de API confirmados. No uses la URL de ejemplo
`SNAPSHOT` ni infieras rutas a partir de nombres de entidades.

## Recurso prioritario: TipoDocumento

| Operación | Método/ruta | Estado |
|---|---|---|
| Listar tipos | Pendiente de acordar e implementar | No disponible/confirmado |
| Obtener por ID | Pendiente de acordar e implementar | No disponible/confirmado |

Antes de cerrar este contrato, backend debe documentar permisos, UUID y campos
del DTO, parámetros y límites de paginación, formato JSON, códigos de error,
cabeceras de conteo y CORS. Los ejemplos serán rotulados como sintéticos hasta
que un ambiente de prueba proporcione una respuesta real.

## Recurso Consulta

No se define todavía. Se deben confirmar permisos y campos autorizados antes de
exponer datos clínicos o derivar el view-model de tarjetas.

## Reglas para el cliente

- El frontend consume solamente endpoints confirmados aquí.
- La base URL debe venir de configuración validada cuando el cliente HTTP se
  implemente; no debe estar quemada en componentes.
- Un error de red/CORS se reporta distinto de un status HTTP de error.
- `Total-registros`, `Location`, `204`, y códigos `404`/`422` solo se tratarán
  según lo que el backend implemente y documente.
