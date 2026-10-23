import { expect } from 'chai';
import { validateIntegrationEnvironment } from '../integration/backend-suite.js';
import { createApiConfig } from '../../src/js/index.js';
import { fixtureConfig } from '../helpers/http-fixture.js';

describe('Precondiciones de la suite de integración', () => {
  it('no acepta una suite vacía como integración aprobada', () => {
    expect(() => validateIntegrationEnvironment({ config: fixtureConfig(), cases: [] })).to.throw('Faltan URL y casos');
  });

  it('no acepta contratos de Galenos pendientes aunque se configure una URL', () => {
    const config = createApiConfig({ baseUrl: 'https://fixture.invalid/', routes: { futuro: { status: 'pending' } } });
    expect(() => validateIntegrationEnvironment({ config, cases: [{ resource: 'futuro', first: 0, max: 1, id: 'fixture' }] })).to.throw('Contrato no verificado');
  });

  it('exige una comprobación observable del cambio para habilitar escrituras', () => {
    const testCase = { resource: 'fixture', first: 0, max: 1, id: 'fixture', write: { createData: {}, updateData: {}, idFromResponse: () => 'fixture' } };
    expect(() => validateIntegrationEnvironment({ config: fixtureConfig(), cases: [testCase] })).to.throw('assertUpdated');
  });
});
