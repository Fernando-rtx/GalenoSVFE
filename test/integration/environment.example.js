import { createApiConfig } from '../../src/js/index.js';

// Copiar como environment.local.js. No contiene URLs ni JSON de backend supuestos.
// Los contratos 0.2 están registrados. Completar la URL de un backend de prueba real.
export const config = createApiConfig({ baseUrl: null });

// Cada caso debe suministrar resource, first, max e id (si hay detalle) de datos sintéticos.
// Consulta exige query: { idClinica }; filtros de lista pueden ir en query y
// detailQuery: { idClinica } conserva el contexto sin enviar filtros al detalle.
// Clínica solo requiere resource: 'clinica', first y max.
// Opcional: write = { createData, updateData, idFromResponse(response), assertUpdated(response) }.
// write exige create, findById, update y deleteById confirmados y limpia lo creado.
// Opcional: missingId y missingStatus, confirmados por el contrato REST.
// listChecks: [{ name, first, max, query, expectedTotal, expectedLength }].
// listErrors: [{ name, first, max, query, status }], con parámetros válidos para el cliente.
// detailErrors: [{ name, id, query, status }], por ejemplo detalle de otra clínica (404).
// Para el demo oficial completo ver environment.demo.example.js; no usa datos reales.
export const cases = [];
