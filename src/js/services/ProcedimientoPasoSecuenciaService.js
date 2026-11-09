import HttpClient from '../transport/HttpClient.js';

/** ProcedimientoPasoSecuencia: operaciones según el contrato configurado (API0.2 o gestión v2). Ver docs/api-gestion-v2.md. */
export default class ProcedimientoPasoSecuenciaService extends HttpClient {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'procedimientoPasoSecuencia' })); }
}
