# Atención clínica en GalenoSVFE

Base inicial: `fadb3aac9cd7d876cec22a1cc716dd9749281ca1`; integrada después con `origin/main` en `568229b57323ca9001a55fbae002a9c02a6c1adc`.
Rama: `feat/flujo-clinico-operativo`. Requiere la rama homónima de Galenos para las reglas de transición reforzadas.

## Uso

Abre **Atención clínica** en el menú. Inicia sesión con una cuenta de desarrollo autorizada, elige su clínica y aplica los filtros de fecha o asignación disponibles. Selecciona una tarjeta de consulta para ver el paciente y los datos de la consulta. Debajo aparecen los procedimientos asociados y los pasos ejecutados, con estado, fecha y UUID del responsable. Una cuenta con permiso de escritura puede **Iniciar actividad** (`PENDIENTE → EN_CURSO`) o **Completar actividad** (`EN_CURSO → COMPLETADO`). **Órdenes y resultados** abre las lecturas y formularios ya existentes para el paso. Tras guardar, el Control vuelve a consultar REST.

La pestaña **Consultas** mantiene el dashboard general. Las dos entradas reutilizan `DashboardControl`, `DashboardModel`, `TarjetaSimple` y `TarjetaConsulta`; no se cambian sus contratos ni su obtención de datos. `ConsultaGestionControl` coordina las acciones y los Services hacen Fetch. `ConsultaGestionModel` presenta el estado y los botones. Las pantallas administrativas permanecen en el mismo menú y conservan el tema JSF azul, el modo oscuro y los estilos responsive.

## Funciones y contratos

| Función | Clase o componente | Contrato REST | Estado |
| --- | --- | --- | --- |
| Lista y detalle por clínica | `DashboardControl`, `DashboardModel`, `TarjetaConsulta` | `GET v2/consulta`, `GET v2/consulta/{id}` | Existía; reutilizada |
| Procedimientos y pasos ejecutados | `ConsultaGestionControl`, `ConsultaGestionModel` | `GET v2/consulta_procedimiento`, `GET v2/consulta_procedimiento_paso` | Existía; presentación operativa mejorada |
| Inicio y finalización | `ConsultaGestionControl` | `PUT v2/consulta_procedimiento_paso/{id}` | Añadidos botones; backend valida y bloquea la fila |
| Órdenes y resultados | `OrdenControl`, `OrdenModel` | `orden_examen`, `examen_resultado` | Existía; accesible desde cada paso |
| Administración | `CatalogoControl`, `ProcedimientoControl`, `PersonaControl` | REST v2 existente | Conservada |

No hay enlace persistente entre la cuenta Liberty y `PersonaRol`. Por eso la interfaz muestra la función responsable registrada, pero no presenta colas personales de médico o enfermería ni concede permisos por profesión. Las acciones se muestran según `contexto.puedeEscribir`; el filtro REST y la clínica autorizada deciden realmente. La política de permisos y la propuesta de FK ejecución–plantilla están en el documento homónimo del backend. La secuencia siguiente, las ramas alternativas y la vinculación orden–examen siguen pendientes de decisiones y modelo.

## Pruebas y límites

`npm ci --offline`, `npm run check`, `npm test`: 429 pruebas JavaScript aprobadas; `npm run test:transport`: 9 pruebas HTTP sintéticas aprobadas. La sintaxis de 84 archivos pasó. Los nuevos tests verifican la petición de inicio, la recarga, el conflicto HTTP 409 y el rechazo local de transiciones inválidas y sesiones lectoras. En navegador se comprobaron ambas entradas de navegación, sus títulos y la ausencia de desplazamiento horizontal a 390 px, sin backend configurado. No se probó esta rama contra un servidor GalenosSV con PostgreSQL ni se validó una sesión profesional real.

Para probar ambas ramas en otra computadora, descarga `feat/flujo-clinico-operativo` en cada repositorio. Configura el backend local como indica `docs/desarrollo-local.md` y el frontend como indica su `docs/desarrollo-local.md`. Usa una clínica y cuenta de prueba autorizadas. Las pruebas de escritura deben usar una base aislada: no ejecutar limpieza ni migraciones en `clinica`.
