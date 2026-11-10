import DefaultService from './DefaultService.js';

/** API demo 0.2. Las lecturas requieren options.query.idClinica. */
export default class ConsultaService extends DefaultService {
  constructor(options = {}) {
    super(Object.assign({}, options, { resource: 'consulta' }));
  }
}
