import HttpClient from '../transport/HttpClient.js';

/** Examen: operaciones según el contrato configurado (API0.2 o gestión v2). Ver docs/api-gestion-v2.md. */
export default class ExamenService extends HttpClient {
  constructor(options = {}) {
    super(Object.assign({}, options, { resource: 'examen' }));
  }
}
