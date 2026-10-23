import DefaultDAO from '../DefaultDAO.js';

/** Examen: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class ExamenDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'examen' })); }
}
