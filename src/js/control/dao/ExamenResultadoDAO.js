import DefaultDAO from '../DefaultDAO.js';

/** ExamenResultado: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class ExamenResultadoDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'examenResultado' })); }
}
