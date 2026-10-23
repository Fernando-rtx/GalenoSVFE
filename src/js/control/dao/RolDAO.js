import DefaultDAO from '../DefaultDAO.js';

/** Rol: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class RolDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'rol' })); }
}
