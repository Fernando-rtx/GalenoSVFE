import DefaultDAO from '../DefaultDAO.js';

/** PersonaRol: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class PersonaRolDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'personaRol' })); }
}
