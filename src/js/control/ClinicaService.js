import DefaultService from './DefaultService.js';

/** Clínicas activas del entorno demo; el contrato 0.2 publica solo la lista. */
export default class ClinicaService extends DefaultService {
  constructor(options = {}) {
    super(Object.assign({}, options, { resource: 'clinica' }));
  }
}
