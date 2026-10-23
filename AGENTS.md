# Guía de trabajo para GalenoFE

## Arquitectura

- `src/js/app/`: inicialización y composición de la aplicación.
- `src/js/boundary/components/`: Web Components reutilizables.
- `src/js/boundary/pages/`: páginas y coordinación de interfaz.
- `src/js/control/`: DAOs HTTP y lógica de coordinación; no crea HTML.
- `src/js/entity/`: entidades y respuestas; no importa DOM ni `fetch`.
- `src/resources/estilos/`: estilos y tokens compartidos.
- `test/`: pruebas unitarias e integrales con datos sintéticos.

Usa JavaScript nativo con módulos ES. Los componentes no acceden a la API.
El cliente HTTP consume el contrato publicado en `docs/api-contract.md`.
No conectes el navegador directamente a PostgreSQL ni incluyas datos reales,
credenciales o secretos en el repositorio.

## Contratos y cambios

- No inventes rutas, propiedades, filtros, permisos o estados de API.
- Marca fixtures como sintéticos y distingue errores de red de errores HTTP.
- Cambios incompatibles en contratos requieren coordinación con el backend.
- No añadas frameworks ni dependencias sin acuerdo del equipo y versiones fijas.
- No trabajes directamente en `main`; usa una rama por cambio y revisión por PR.
