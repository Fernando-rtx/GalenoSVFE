import DefaultDAO from '../DefaultDAO.js';

/** ProcedimientoPaso: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class ProcedimientoPasoDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'procedimientoPaso' })); }
}
