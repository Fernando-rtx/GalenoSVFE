import { createApiConfig } from './api-config.js';

// Copiar a environment.local.js y completar con el despliegue confirmado.
// baseUrl debe incluir /GalenosSV/resources/; el host/puerto los define el entorno.
// Una URL null permite importar el módulo, pero impide enviar solicitudes.
export const config = createApiConfig({ baseUrl: null });
