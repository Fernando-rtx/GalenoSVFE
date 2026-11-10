import DefaultService from './DefaultService.js';

/** Catálogo REST 0.2: lista y detalle de DTO, sin relaciones JPA ni escrituras. */
export default class TipoDocumentoService extends DefaultService {
  constructor(options = {}) {
    super(Object.assign({}, options, { resource: 'tipoDocumento' }));
  }
}
