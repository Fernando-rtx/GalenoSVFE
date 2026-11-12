# Atención clínica en GalenoSVFE

Base inicial: `fadb3aac9cd7d876cec22a1cc716dd9749281ca1`; integrada con `origin/main` en `568229b57323ca9001a55fbae002a9c02a6c1adc` y luego `a103fb71ac2afcb049f270f25b2ec54ce75fcd41`.
Rama: `feat/flujo-clinico-operativo`. Requiere la rama homónima de Galenos para las reglas de transición reforzadas.

## Uso

Abre **Atención clínica** en el menú académico local, elige una clínica y aplica los filtros de fecha o asignación disponibles. Selecciona una tarjeta de consulta para ver el paciente y los datos de la consulta. Debajo aparecen los procedimientos asociados y los pasos ejecutados, con estado, fecha y UUID del responsable. Puedes **Iniciar actividad** (`PENDIENTE → EN_CURSO`) o **Completar actividad** (`EN_CURSO → COMPLETADO`). **Órdenes y resultados** abre las lecturas y formularios ya existentes para el paso. Tras guardar, el Control vuelve a consultar REST.

La pestaña **Consultas** mantiene el dashboard general. Las dos entradas reutilizan `DashboardControl`, `DashboardModel`, `TarjetaSimple` y `TarjetaConsulta`; no se cambian sus contratos ni su obtención de datos. `ConsultaGestionControl` coordina las acciones y los Services hacen Fetch. `ConsultaGestionModel` presenta el estado y los botones. Las pantallas administrativas permanecen en el mismo menú y conservan el tema JSF azul, el modo oscuro y los estilos responsive.

## Funciones y contratos

| Función | Clase o componente | Contrato REST | Estado |
| --- | --- | --- | --- |
| Lista y detalle por clínica | `DashboardControl`, `DashboardModel`, `TarjetaConsulta` | `GET v2/consulta`, `GET v2/consulta/{id}` | Existía; reutilizada |
| Procedimientos y pasos ejecutados | `ConsultaGestionControl`, `ConsultaGestionModel` | `GET v2/consulta_procedimiento`, `GET v2/consulta_procedimiento_paso` | Existía; presentación operativa mejorada |
| Inicio y finalización | `ConsultaGestionControl` | `PUT v2/consulta_procedimiento_paso/{id}` | Añadidos botones; backend valida y bloquea la fila |
| Órdenes y resultados | `OrdenControl`, `OrdenModel` | `orden_examen`, `examen_resultado` | Existía; accesible desde cada paso |
| Administración | `CatalogoControl`, `ProcedimientoControl`, `PersonaControl` | REST v2 existente | Conservada |

El `main` actual es una aplicación académica local sin inicio de sesión y con datos ficticios. Por eso la interfaz no presenta colas personales de médico o enfermería ni concede permisos por profesión. El backend comprueba la pertenencia de los registros a la clínica indicada y el orden de estados, pero el selector de clínica no representa autorización de usuario. La política de permisos futura y la propuesta de FK ejecución–plantilla están en el documento homónimo del backend. La secuencia siguiente, las ramas alternativas y la vinculación orden–examen siguen pendientes de decisiones y modelo.

## Pruebas y límites

`npm ci --offline`, `npm run check`, `npm test`: 426 pruebas JavaScript aprobadas; `npm run test:transport`: 9 pruebas HTTP sintéticas aprobadas. La sintaxis de 84 archivos pasó. Los nuevos tests verifican la petición de inicio, la recarga, el conflicto HTTP 409 y el rechazo local de transiciones inválidas o sin clínica. En navegador se comprobaron ambas entradas de navegación, sus títulos y la ausencia de desplazamiento horizontal a 390 px, sin backend configurado. No se probó esta rama contra un servidor GalenosSV con PostgreSQL.

Para probar ambas ramas en otra computadora, descarga `feat/flujo-clinico-operativo` en cada repositorio. Configura el backend y el frontend local como indican sus respectivos `docs/desarrollo-local.md`. Usa únicamente datos ficticios. Las pruebas de escritura automatizadas deben usar una base aislada: no ejecutar limpieza ni migraciones en `clinica`.
