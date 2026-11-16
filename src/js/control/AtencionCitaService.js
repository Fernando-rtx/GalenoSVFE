import DefaultService from './DefaultService.js';

/** Alta atómica de cita y procedimiento desde Atención al público. */
export default class AtencionCitaService extends DefaultService {
  constructor(options = {}) {
    super(Object.assign({}, options, { resource: 'atencionCita' }));
  }
}
