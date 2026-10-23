import DefaultDAO from '../DefaultDAO.js';

/** ProcedimientoPasoExamen: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class ProcedimientoPasoExamenDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'procedimientoPasoExamen' })); }
}
