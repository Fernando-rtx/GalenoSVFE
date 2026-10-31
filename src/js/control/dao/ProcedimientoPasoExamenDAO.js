import DefaultDAO from '../DefaultDAO.js';

/** ProcedimientoPasoExamen: operaciones según el contrato configurado (API0.2 o gestión v2). Ver docs/api-gestion-v2.md. */
export default class ProcedimientoPasoExamenDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'procedimientoPasoExamen' })); }
}
