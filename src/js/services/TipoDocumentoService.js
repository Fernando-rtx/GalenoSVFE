import HttpClient from '../transport/HttpClient.js';

/** Catálogo REST 0.2: lista y detalle de DTO, sin relaciones JPA ni escrituras. */
export default class TipoDocumentoService extends HttpClient {
  constructor(options = {}) {
    super(Object.assign({}, options, { resource: 'tipoDocumento' }));
  }
}
