# Unificación visual con GalenosSV JSF

Rama: `feat/unificacion-visual-jsf`. Backend sin modificaciones. Se conserva la conexión
REST autenticada a clinica y los contratos de los veinte DAO y de las tarjetas.

## Referencia y adaptación

Se inspeccionaron las 19 páginas de `GalenosSV_CRUD/src/main/webapp/paginas`,
la plantilla `general.xhtml`, los estilos de sus módulos, `galenos.css`,
`galenos-oscuro.css`, `tema.js` y el logotipo original. El tema final de JSF
sobrescribe el CSS base: usa Segoe UI, superficies azul grisáceas, bordes de 4–6px,
cabecera compacta, menú de 224px y tarjeta de contenido con línea azul de 2px.
Se adoptan estos valores finales, no solo el azul del CSS inicial.

`src/resources/estilos/galenos.css` adapta los tokens reales claro/oscuro y la geometría
a HTML nativo. Los alias existentes alimentan las tarjetas con Shadow DOM sin cambiar
sus propiedades, estructura JavaScript ni eventos. El logotipo y el script de preferencia
de tema son los originales de JSF. No se añadió ninguna dependencia.

| Vistas | Adaptación disponible |
| --- | --- |
| Consultas/dashboard | Cabecera, filtros, conteos, tarjetas originales, detalle, diálogos y relaciones con el tema JSF |
| Clínicas, Roles, TipoDocumento, TipoMedioContacto, TipoExamen | Tarjeta con línea azul, títulos, Nuevo, tablas, buscador dentro de la cabecera, paginación y formularios |
| Personas | Tabla y formulario; documentos, contactos y PersonaRol anidados con sus controles actuales |
| Procedimientos/Pasos | Catálogo y editor anidado, acciones y formularios con el mismo tema |
| PasoExamen/PasoSecuencia/ExamenTipoExamen | Relaciones anidadas y diálogos con los estilos comunes |
| Exámenes | Catálogo, edición y tipos asociados |
| Órdenes/Resultados | Vistas contextuales desde el paso de una consulta, con formularios y controles existentes |
| CambiarRol/contexto | Acceso a la sesión autorizada desde cabecera/menú, sin suplantar identidad |

## Diferencias conservadas deliberadamente

- Las tarjetas y el dashboard siguen presentes; JSF utiliza principalmente tablas.
- Los campos de fecha y selectores son nativos, no widgets PrimeFaces. Sus ventanas
  dependen del navegador y del sistema operativo.
- La paginación conserva Anterior/Siguiente y los conteos REST; no se simulan botones
  numéricos ni filtros que el contrato no implemente.
- Documentos/contactos/roles se abren en Personas; órdenes/resultados desde un paso.
  No se añaden enlaces globales que carezcan del contexto requerido por REST.
- El idioma disponible en JavaScript sigue siendo español. El selector no ofrece
  idiomas incompletos. Las traducciones JSF no son un catálogo completo del frontend.
- El control de usuario abre la gestión de sesión real; no reproduce el selector JSF
  de cualquier PersonaRol como si fuera autenticación.
- Los listados anidados conservan su estructura funcional; no se afirma una réplica
  píxel por píxel ni una comparación automática de todos los controles PrimeFaces.

## Verificación de esta revisión

- `npm test`: 416 aprobadas, 0 fallos.
- `npm run check`: 77 archivos con sintaxis válida.
- `npm run test:transport`: 9 aprobadas; transporte sintético.
- Integración development: 24 aprobadas, peticiones HTTP reales de lectura/autorización.
- `test/browser/apariencia_jsf.py`: recorrido autenticado en Chromium, compara tokens
  y ancho del menú con JSF y captura Consultas, Personas, Documentos, Clínicas,
  TipoDocumento, Procedimientos y Exámenes. Revisa diálogos de los siete catálogos,
  persona/pasos/asociaciones, navegación a contactos/roles/órdenes/resultados,
  filtros, selección de clínica, eventos de tarjetas, sesión y menú contraíble.
  Revisa 1920, 1280, 768, 390 y 360px en ambos temas, sin desbordamiento de página.
- El recorrido intercepta y rechaza toda escritura REST: no ejecuta POST/PUT/DELETE.
  Verifica los botones/formularios sin volver a crear/eliminar datos por motivos visuales.
- No se volvió a ejecutar Maven: no hay cambios de Java, REST ni persistencia.

Capturas comparativas locales: `/private/tmp/galenos-visual/` (no versionadas).
La automatización integrada de navegador no tenía navegadores conectados; se utilizó
Playwright Python/Chromium ya instalado, sin añadir dependencias al repositorio.

```sh
npm run dev
# Automatización local disponible en esta estación:
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/galeno-browser-final-20261028/browsers \
/private/tmp/galeno-browser-final-20261028/bin/python test/browser/apariencia_jsf.py
```

Abrir http://localhost:3000/ y recargar si la pestaña conservaba los estilos anteriores.
El acceso y los comandos de integración están en `docs/desarrollo-local.md`.

## Archivos de esta adaptación

- `src/index.html`: cabecera, logotipo, clínica compartida y menú con orden JSF.
- `src/js/app/appearance.js`, `main.js`, `gestion.js`: interacción visual y conexión
  de los controles de sesión con la autenticación existente.
- `src/js/boundary/pages/CatalogoPage.js`, `PersonaPage.js`: títulos, cabecera,
  búsqueda en tabla y columnas de datos del DTO ya disponible.
- `src/resources/estilos/galenos.css`: tokens usados y adaptación común de todos los flujos.
- `dashboard.css`, `tarjeta.css`, `tarjeta_consulta.css`: eliminación de la identidad
  verde y adaptación de colores sin cambiar eventos de los componentes.
- `src/resources/scripts/tema.js`, `src/resources/imagenes/galenos-sv-logo.png`:
  recursos originales reutilizados.
- `test/browser/apariencia_jsf.py`: comparación/regresión de solo lectura.
- Este informe.


## Edición mediante doble clic

Los registros de catálogos, personas, documentos/contactos/roles, pasos, asociaciones,
órdenes y resultados abren su editor con doble clic, Enter o espacio, sin botones
Editar. Las tarjetas de consulta permiten doble clic; el panel de detalle permite
además apertura con teclado. Se conservan los controles de creación, eliminación,
navegación a asociaciones y el evento original Ver detalle de las tarjetas.
Las acciones y campos anidados no activan el editor y se mantienen los permisos y
el bloqueo durante guardado. La tabla de catálogos omite Acciones cuando no hay
acciones relacionadas que mostrar.

Verificación del cambio: 420 pruebas unitarias aprobadas, sintaxis válida de 79
archivos y recorrido Chromium `apariencia_jsf.py` aprobado con doble clic/teclado
real y todas las escrituras REST bloqueadas. Los scripts de escritura existentes
se actualizaron al nuevo gesto, pero no se ejecutaron para este cambio de interfaz.
