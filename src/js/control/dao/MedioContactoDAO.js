import DefaultDAO from '../DefaultDAO.js';

/** MedioContacto: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class MedioContactoDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'medioContacto' })); }
}
