import DefaultDAO from '../DefaultDAO.js';

/** TipoExamen: operaciones según el contrato configurado (API0.2 o gestión v2). Ver docs/api-gestion-v2.md. */
export default class TipoExamenDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'tipoExamen' })); }
}
