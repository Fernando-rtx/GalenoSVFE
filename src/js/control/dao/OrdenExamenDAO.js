import DefaultDAO from '../DefaultDAO.js';

/** OrdenExamen: operaciones según el contrato configurado (API0.2 o gestión v2). Ver docs/api-gestion-v2.md. */
export default class OrdenExamenDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'ordenExamen' })); }
}
