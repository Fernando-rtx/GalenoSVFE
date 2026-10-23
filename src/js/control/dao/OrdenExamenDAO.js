import DefaultDAO from '../DefaultDAO.js';

/** OrdenExamen: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class OrdenExamenDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'ordenExamen' })); }
}
