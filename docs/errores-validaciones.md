# Errores y validaciones

Boundary usa restricciones HTML (`required`, tipos fecha, formatos y límites declarados por cada formulario). `bindFormValidation` comprueba el formulario antes de ejecutar el submit, publica un mensaje junto al campo con `aria-invalid` y `aria-errormessage`, mueve el foco al primer error y limpia los mensajes al editar. El mismo límite captura excepciones síncronas y rechazos de Promise usando mensajes seguros. Los modelos devuelven la Promise de guardar para que ese límite pueda observarla.

Control mantiene estados de carga/guardado, impide envíos duplicados y conserva el editor después de fallos de persistencia. Cada lectura usa AbortController e identidad de solicitud para descartar resultados obsoletos. La autorización y las reglas clínicas definitivas corresponden al backend.

DefaultService valida contratos y parámetros antes de Fetch. Centraliza timeout, cancelación, transporte, lectura del cuerpo y validación de respuesta. Conserva `DefaultError` sin envolverlo nuevamente. Los errores HTTP preservan el estado incluso si el cuerpo no es JSON; la causa de parseo queda disponible en memoria. Las respuestas inválidas del transporte usan INVALID_RESPONSE. DefaultResponse rechaza estados HTTP de error como resultados exitosos.

Se conservan los códigos públicos existentes: INVALID_PARAMETER/INVALID_DATA para validación, NETWORK_ERROR, TIMEOUT, CANCELLED, HTTP_ERROR, INVALID_RESPONSE y OPERATION_UNSUPPORTED. No se añade VALIDATION_ERROR como sinónimo. Los errores técnicos, de parámetros y HTTP mantienen tipos separados.

`dashboard-presentation.js` traduce estados HTTP a mensajes controlados. No presenta `details.mensaje` arbitrario del servidor. CANCELLED genera mensaje vacío y no publica aviso. La notificación global deduplica por tipo y mensaje; los campos muestran sus errores localmente. DefaultError conserva causa, cuerpo y cabeceras en memoria, pero `toJSON` excluye causa, trazas, cabeceras y detalles para evitar su difusión accidental.

Validación ejecutada: sintaxis (86 archivos), 426 pruebas unitarias, 9 HTTP locales sintéticas y Chromium (campos obligatorios accesibles, tarjetas, SPA, eventos desde Shadow DOM, deduplicación/cierre, móvil, tema y shell offline). Las pruebas HTTP sintéticas no equivalen a una integración contra backend clínico. No se modificó PostgreSQL ni se ejecutaron escrituras clínicas.

## Recepción: catálogo y nacimiento manual

El registro de pacientes usa el catálogo público existente `v1/tipo_documento`, igual que identificación. `v2/tipo_documento` es una ruta de gestión restringida; el arreglo no concede permisos ni modifica el filtro del backend. Las altas siguen exigiendo sesión, asignación vigente y Atención al público.

En los dos formularios de registro de ConsultaGestionModel se escribe nacimiento como DD/MM/AAAA, sin depender del calendario nativo de Safari. La validación reutiliza isCalendarDate y respeta el mínimo01/01/1900 y el máximo de hoy en America/El_Salvador. Rechaza formato incorrecto, días inexistentes y fechas futuras; conserva el texto y enfoca el campo con error asociado. El DTO sigue enviando el instante ISO correspondiente a mediodía de El Salvador, conservando el día. No se añaden librerías ni un sistema visual duplicado: el campo pertenece al Web Component existente.

Pruebas: `fecha-nacimiento.test.js` y fixture `recepcion_fecha.html` (Fetch y altas sintéticas, no PostgreSQL). El catálogo público se verificó adicionalmente con el Service real y GET contra Liberty. La caché del shell pasa a v38: recargar con el servidor activo y volver a abrir el formulario para adoptar los módulos nuevos. Si una sesión seguía abierta durante el vaciado de datos, identificarse de nuevo con una asignación vigente.
