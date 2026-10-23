import DefaultDAO from '../DefaultDAO.js';

/** ExamenTipoExamen: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class ExamenTipoExamenDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'examenTipoExamen' })); }
}
