import DefaultService from './DefaultService.js';

/** OrdenExamen: operaciones según el contrato configurado (API0.2 o gestión v2). Ver docs/api-gestion-v2.md. */
export default class OrdenExamenService extends DefaultService {
  constructor(options = {}) {
    super(Object.assign({}, options, { resource: 'ordenExamen' }));
  }
}
