import HttpClient from '../transport/HttpClient.js';

/** Clínicas activas del entorno demo; el contrato 0.2 publica solo la lista. */
export default class ClinicaService extends HttpClient {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'clinica' })); }
}
