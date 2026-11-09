import DefaultService from './DefaultService.js';

/** ExamenTipoExamen: operaciones según el contrato configurado (API0.2 o gestión v2). Ver docs/api-gestion-v2.md. */
export default class ExamenTipoExamenService extends DefaultService {
  constructor(options = {}) {
    super(Object.assign({}, options, { resource: 'examenTipoExamen' }));
  }
}
