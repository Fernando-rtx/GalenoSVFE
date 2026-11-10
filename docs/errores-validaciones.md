# Errores y validaciones

Boundary usa restricciones HTML (`required`, tipos fecha, formatos y límites declarados por cada formulario). `bindFormValidation` comprueba el formulario antes de ejecutar el submit, publica un mensaje junto al campo con `aria-invalid` y `aria-errormessage`, mueve el foco al primer error y limpia los mensajes al editar. El mismo límite captura excepciones síncronas y rechazos de Promise usando mensajes seguros. Los modelos devuelven la Promise de guardar para que ese límite pueda observarla.

Control mantiene estados de carga/guardado, impide envíos duplicados y conserva el editor después de fallos de persistencia. Cada lectura usa AbortController e identidad de solicitud para descartar resultados obsoletos. La autorización y las reglas clínicas definitivas corresponden al backend.

DefaultService valida contratos y parámetros antes de Fetch. Centraliza timeout, cancelación, transporte, lectura del cuerpo y validación de respuesta. Conserva `DefaultError` sin envolverlo nuevamente. Los errores HTTP preservan el estado incluso si el cuerpo no es JSON; la causa de parseo queda disponible en memoria. Las respuestas inválidas del transporte usan INVALID_RESPONSE. DefaultResponse rechaza estados HTTP de error como resultados exitosos.

Se conservan los códigos públicos existentes: INVALID_PARAMETER/INVALID_DATA para validación, NETWORK_ERROR, TIMEOUT, CANCELLED, HTTP_ERROR, INVALID_RESPONSE y OPERATION_UNSUPPORTED. No se añade VALIDATION_ERROR como sinónimo. Los errores técnicos, de parámetros y HTTP mantienen tipos separados.

`dashboard-presentation.js` traduce estados HTTP a mensajes controlados. No presenta `details.mensaje` arbitrario del servidor. CANCELLED genera mensaje vacío y no publica aviso. La notificación global deduplica por tipo y mensaje; los campos muestran sus errores localmente. DefaultError conserva causa, cuerpo y cabeceras en memoria, pero `toJSON` excluye causa, trazas, cabeceras y detalles para evitar su difusión accidental.

Validación ejecutada: sintaxis (86 archivos), 426 pruebas unitarias, 9 HTTP locales sintéticas y Chromium (campos obligatorios accesibles, tarjetas, SPA, eventos desde Shadow DOM, deduplicación/cierre, móvil, tema y shell offline). Las pruebas HTTP sintéticas no equivalen a una integración contra backend clínico. No se modificó PostgreSQL ni se ejecutaron escrituras clínicas.
