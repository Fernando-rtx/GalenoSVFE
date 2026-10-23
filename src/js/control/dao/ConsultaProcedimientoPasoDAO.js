import DefaultDAO from '../DefaultDAO.js';

/** ConsultaProcedimientoPaso: acceso bloqueado hasta publicar su contrato REST. Ver docs/inventario-dao.md. */
export default class ConsultaProcedimientoPasoDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'consultaProcedimientoPaso' })); }
}
