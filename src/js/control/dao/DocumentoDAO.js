import DefaultDAO from '../DefaultDAO.js';

/** Documento: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class DocumentoDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'documento' })); }
}
