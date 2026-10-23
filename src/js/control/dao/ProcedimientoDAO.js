import DefaultDAO from '../DefaultDAO.js';

/** Procedimiento: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class ProcedimientoDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'procedimiento' })); }
}
