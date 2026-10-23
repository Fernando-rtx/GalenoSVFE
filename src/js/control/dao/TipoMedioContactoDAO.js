import DefaultDAO from '../DefaultDAO.js';

/** TipoMedioContacto: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class TipoMedioContactoDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'tipoMedioContacto' })); }
}
