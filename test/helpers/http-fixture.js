import { createApiConfig, DefaultDAO } from '../../src/js/index.js';

// CONTRATO SINTÉTICO: exclusivo de pruebas; no describe endpoints de Galenos.
export function fixtureRoutes() {
  const item = { path: 'fixture-items/{id}', response: 'json', successStatuses: [200] };
  return {
    fixture: {
      status: 'verified', source: 'test/helpers/http-fixture.js (contrato sintético)',
      operations: {
        findRange: {
          method: 'GET', path: 'fixture-items', response: 'json', successStatuses: [200],
          pagination: { firstParam: 'offset-fixture', maxParam: 'limit-fixture', totalHeader: 'Total-registros' }
        },
        findById: Object.assign({}, item, { method: 'GET' }),
        create: { method: 'POST', path: 'fixture-items', body: 'json', response: 'json', successStatuses: [201] },
        update: Object.assign({}, item, { method: 'PUT', body: 'json', successStatuses: [200, 204] }),
        deleteById: { method: 'DELETE', path: 'fixture-items/{id}', response: 'none', successStatuses: [204] }
      }
    }
  };
}

export function fixtureConfig(overrides = {}) {
  return createApiConfig(Object.assign({ baseUrl: 'https://fixture.invalid/application/api/', routes: fixtureRoutes() }, overrides));
}

export function fixtureDAO(fetchImpl, overrides = {}) {
  return new DefaultDAO({ resource: 'fixture', config: fixtureConfig(overrides), fetchImpl });
}

export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: Object.assign({ 'Content-Type': 'application/json' }, headers) });
}

export async function rejection(promise) {
  try { await promise; } catch (error) { return error; }
  throw new Error('Se esperaba una Promise rechazada.');
}
