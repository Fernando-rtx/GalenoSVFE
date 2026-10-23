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

  const listCase = {
    resource: 'tipoDocumento', first: 0, max: 1, id: '00000000-0000-4000-8000-000000000001'
  };
  const config = createApiConfig({ baseUrl: 'https://fixture.invalid/' });
  const check = { name: 'Expectativa sintética', first: 0, max: 1, expectedTotal: 2, expectedLength: 1 };

  it('acepta expectativas explícitas de paginación y errores HTTP reales', () => {
    const testCase = { ...listCase, listChecks: [check],
      listErrors: [{ name: 'Límite sintético excedido', first: 0, max: 101, status: 422 }],
      detailErrors: [{ name: 'Ausente', id: listCase.id, status: 404 }] };
    expect(() => validateIntegrationEnvironment({ config, cases: [testCase] })).not.to.throw();
  });

  [
    { expectedTotal: -1 }, { expectedTotal: '2' }, { expectedLength: 2 }, { expectedLength: -1 },
    { expectedTotal: 0 }, { name: '' }, { first: 2147483648 }
  ].forEach(change => {
    it(`rechaza una expectativa de lista que podría falsear la verificación: ${JSON.stringify(change)}`, () => {
      expect(() => validateIntegrationEnvironment({ config,
        cases: [{ ...listCase, listChecks: [{ ...check, ...change }] }] })).to.throw();
    });
  });

  ['listChecks', 'listErrors', 'detailErrors'].forEach(key => {
    it(`rechaza ${key} vacío en lugar de aprobarlo sin solicitudes`, () => {
      expect(() => validateIntegrationEnvironment({ config, cases: [{ ...listCase, [key]: [] }] })).to.throw();
    });
  });

  it('exige un error HTTP y parámetros que el cliente permita enviar al servidor', () => {
    for (const change of [{ status: 200 }, { max: 0 }, { query: { filtroInventado: 'x' } }]) {
      const listErrors = [{ name: 'Error sintético', first: 0, max: 101, status: 422, ...change }];
      expect(() => validateIntegrationEnvironment({ config, cases: [{ ...listCase, listErrors }] })).to.throw();
    }
  });

  it('no permite probar detalle de Clínica ni UUID inválidos como si fueran errores HTTP', () => {
    const detailErrors = [{ name: 'Ausente', id: listCase.id, status: 404 }];
    expect(() => validateIntegrationEnvironment({ config, cases: [{ resource: 'clinica', first: 0, max: 1, detailErrors }] })).to.throw('operación publicada');
    expect(() => validateIntegrationEnvironment({ config,
      cases: [{ ...listCase, detailErrors: [{ ...detailErrors[0], id: 'inválido' }] }] })).to.throw('ID válido');
  });
});
