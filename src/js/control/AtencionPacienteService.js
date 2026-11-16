import DefaultService from './DefaultService.js';

/** Alta limitada de pacientes desde la recepción autorizada. */
export default class AtencionPacienteService extends DefaultService {
  constructor(options = {}) {
    super(Object.assign({}, options, { resource: 'atencionPaciente' }));
  }
}
