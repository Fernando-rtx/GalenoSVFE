# Notificaciones y órdenes históricas HU4

Se reutiliza `galenos:notificacion` y el componente `galenos-notifications`. Los avisos de una operación reemplazan su carga por identificador, el éxito desaparece a los 5,5 segundos y los errores/advertencias requieren cierre o una nueva acción. Los mensajes no incluyen pacientes ni cuerpos REST. Hay roles status/alert, regiones aria-live y soporte de movimiento reducido. El formulario bloquea envíos simultáneos, conserva texto en errores y no envía cuando el navegador informa desconexión.

El historial del backend leía `ConsultaProcedimientoPaso.ordenExamenCollection`, colección inversa que podía permanecer vacía en el contexto/caché JPA después de insertar una orden por su FK. Ahora consulta explícitamente las órdenes por UUID de ejecución y carga examen/resultados, evitando usar esa colección como fuente de verdad. La corrección no modifica registro de atención, transiciones, permisos, tablas ni datos.

No existe una columna de estado de orden en el modelo oficial. Se presenta únicamente un estado informativo derivado: «Sin resultados registrados» o «Con resultados registrados». No se inventan estados de laboratorio. Las órdenes históricas permanecen bajo el paso y responsable que las originaron; las actuales se presentan aparte.

Verificación:
- `npm test`: 427 pruebas pasan; `npm run check`: sintaxis válida.
- `npm run test:transport`: 9 pruebas pasan.
- Backend `mvn -q clean test`: 843 pruebas, cero fallos/errores.
- Chromium: fixture HU4 existente (avance, retroceso, finalización, conflictos, desconexión) y `test/browser/notificaciones.html` pasan.
- Escritorio 1440 px y móvil 390 px: contraste, cierre, aviso de carga reemplazado, éxito temporal y advertencia persistente.
- JDBC de solo lectura en 19084: la consulta `e5bd6458-4469-5543-98b0-1a5b595559a3` devuelve la orden `dba100db-f74c-4028-95fe-a4654eb0d26b` de Hemograma completo en la ejecución RETROCEDIDO; cero órdenes en la ejecución actual. Se comprobó también la presentación en Chromium. El runtime temporal se detuvo después; no reemplazó al servidor habitual en 9080.

Para probar en Safari, reiniciar el backend habitual con la rama corregida, abrir el frontend y recargar sin caché para activar la versión nueva de PWA. Abrir la consulta de Luis del 16/11/2026 como Doctor, desplegar Historial previo → Evaluación médica RETROCEDIDO → Ver registro. El hemograma aparece ahí, con responsable y fecha; no entre las órdenes actuales. Guardar una nota debe mostrar carga y, solo después del HTTP satisfactorio, confirmación. Si se asigna un examen nuevo permitido, la confirmación de asignación también requiere éxito REST. Se puede abrir `/test/browser/notificaciones.html` para comprobar los avisos sin escribir datos clínicos. Safari no fue automatizado en esta tarea.
