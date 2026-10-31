import DefaultDAO from '../DefaultDAO.js';

/** ProcedimientoPaso: operaciones según el contrato configurado (API0.2 o gestión v2). Ver docs/api-gestion-v2.md. */
export default class ProcedimientoPasoDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'procedimientoPaso' })); }
}
