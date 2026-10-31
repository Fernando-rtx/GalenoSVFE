import { createApiConfig } from './api-config.js';

// Copiar a environment.local.js y completar con el despliegue confirmado.
// baseUrl debe incluir /GalenosSV/resources/; el host/puerto los define el entorno.
// Una URL null permite importar el módulo, pero impide enviar solicitudes.
export const config = createApiConfig({ baseUrl: null });

// Gestión autenticada (desarrollo o demo según el servidor). No contiene credenciales.
export const gestionConfig = null;

// Para el modo development de Liberty sobre clinica:
// export const gestionConfig = { baseUrl: 'http://localhost:9080/GalenosSV/resources/' };
// config.baseUrl permanece null: ninguna lectura clínica se envía antes del login.
export const authenticatedOnly = true;
