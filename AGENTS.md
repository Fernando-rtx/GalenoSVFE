# Guía de trabajo para GalenoFE

## Arquitectura

- `src/js/boundary/components/`: Web Components reutilizables.
- `src/js/boundary/modelos/`: pantallas y modelos de presentación como Custom Elements.
- `src/js/control/`: controles, los 20 Services REST, `DefaultService`, configuración y rutas API.
- `src/js/entity/`: errores y respuestas; no importa DOM ni Fetch.
- `src/js/main.js`: punto de composición y arranque.
- `src/resources/`: estilos, imágenes y recursos públicos.
- `test/`: pruebas unitarias, HTTP sintéticas y de navegador.

Boundary renderiza estado y emite eventos. Control coordina estado y casos de uso. Services y DefaultService consumen el contrato `docs/api-contract.md`. Entity representa objetos de respuesta del cliente.

Usa JavaScript nativo con módulos ES. No conectes el navegador a PostgreSQL. No guardes datos clínicos, credenciales ni respuestas REST en Cache Storage. El Service Worker precarga solo recursos públicos de lista cerrada.

## Contratos y cambios

- No inventes rutas, propiedades JSON, filtros, permisos ni estados REST.
- Distingue errores de red de errores HTTP; fixtures deben declararse sintéticos.
- No renombres DAO JPA del backend ni cambies DTO REST.
- No añadas frameworks o dependencias sin acuerdo del equipo y versiones fijas.
- No cambies reglas clínicas ni incluyas lógica de Cafefe.
- No trabajes directamente en `main`; usa rama y Pull Request.
- Sigue `.prettierrc.json` y `pyproject.toml`.
