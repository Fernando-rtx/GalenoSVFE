import HttpClient from '../transport/HttpClient.js';

/** API demo 0.2. Las lecturas requieren options.query.idClinica. */
export default class ConsultaService extends HttpClient {
  constructor(options = {}) {
    super(Object.assign({}, options, { resource: 'consulta' }));
  }
}
