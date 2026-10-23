import DefaultDAO from '../DefaultDAO.js';

/** Persona: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class PersonaDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'persona' })); }
}
