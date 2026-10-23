import DefaultDAO from '../DefaultDAO.js';

/** ConsultaProcedimiento: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class ConsultaProcedimientoDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'consultaProcedimiento' })); }
}
