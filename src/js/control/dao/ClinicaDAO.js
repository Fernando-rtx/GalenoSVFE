import DefaultDAO from '../DefaultDAO.js';

/** Clínicas activas del entorno demo; el contrato 0.2 publica solo la lista. */
export default class ClinicaDAO extends DefaultDAO {
  constructor(options = {}) { super(Object.assign({}, options, { resource: 'clinica' })); }
}
