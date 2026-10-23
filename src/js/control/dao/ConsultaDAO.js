import DefaultDAO from '../DefaultDAO.js';

/** API demo 0.2. Las lecturas requieren options.query.idClinica. */
export default class ConsultaDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'consulta' })); }
}
