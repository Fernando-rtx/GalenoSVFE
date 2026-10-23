import DefaultDAO from '../DefaultDAO.js';

/** Catálogo REST 0.2: lista y detalle de DTO, sin relaciones JPA ni escrituras. */
export default class TipoDocumentoDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'tipoDocumento' })); }
}
