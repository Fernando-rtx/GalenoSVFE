import DefaultDAO from '../DefaultDAO.js';

/** TipoExamen: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class TipoExamenDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'tipoExamen' })); }
}
