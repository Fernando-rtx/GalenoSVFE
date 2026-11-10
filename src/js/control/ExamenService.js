import DefaultService from './DefaultService.js';

/** Examen: operaciones según el contrato configurado (API0.2 o gestión v2). Ver docs/api-gestion-v2.md. */
export default class ExamenService extends DefaultService {
  constructor(options = {}) {
    super(Object.assign({}, options, { resource: 'examen' }));
  }
}
