import DefaultDAO from '../DefaultDAO.js';

/** ProcedimientoPasoSecuencia: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class ProcedimientoPasoSecuenciaDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'procedimientoPasoSecuencia' })); }
}
