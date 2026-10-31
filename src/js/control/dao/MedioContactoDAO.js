import DefaultDAO from '../DefaultDAO.js';

/** MedioContacto: operaciones según el contrato configurado (API0.2 o gestión v2). Ver docs/api-gestion-v2.md. */
export default class MedioContactoDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'medioContacto' })); }
}
