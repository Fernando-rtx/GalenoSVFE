import { expect } from 'chai';
import { createApiConfig, DefaultError } from '../../src/js/index.js';
import { fixtureRoutes } from '../helpers/http-fixture.js';

suite('Configuración por entorno', () => {
  test('permite importar el módulo sin inventar una URL de backend', () => {
    expect(createApiConfig().baseUrl).to.equal(null);
    expect(createApiConfig().routes.tipoDocumento.status).to.equal('verified');
    expect(createApiConfig().http.credentials).to.equal('omit');
  });

  test('normaliza la URL preservando el contexto del WAR y el prefijo API', () => {
    expect(createApiConfig({ baseUrl: 'https://fixture.invalid/war/api' }).baseUrl).to.equal(
      'https://fixture.invalid/war/api/',
    );
  });

  [undefined, 0, -1, 1.5, Infinity, '100', 2147483648]
    .filter((v) => v !== undefined)
    .forEach((timeoutMs) => {
      test(`rechaza timeout inválido: ${timeoutMs}`, () => {
        expect(() => createApiConfig({ timeoutMs }))
          .to.throw(DefaultError)
          .with.property('code', 'INVALID_CONFIG');
      });
    });

  [
    '',
    '/api',
    'ftp://fixture.invalid/',
    'https://user:secret@fixture.invalid/',
    'https://fixture.invalid/?x=1',
    'https://fixture.invalid/#api',
  ].forEach((baseUrl) => {
    test(`rechaza URL inválida: ${baseUrl}`, () => {
      expect(() => createApiConfig({ baseUrl }))
        .to.throw(DefaultError)
        .with.property('type', 'validation');
    });
  });

  test('copia e inmoviliza rutas y cabeceras sin afectar el objeto del llamador', () => {
    const routes = fixtureRoutes();
    const http = { headers: { Accept: 'application/json' } };
    const config = createApiConfig({ routes, http });
    routes.fixture.operations.findById.path = 'changed';
    http.headers.Accept = 'text/plain';
    expect(config.routes.fixture.operations.findById.path).to.equal('fixture-items/{id}');
    expect(config.http.headers.accept).to.equal('application/json');
    expect(() => {
      config.routes.fixture.status = 'pending';
    }).to.throw(TypeError);
  });

  [
    { mode: 'no-cors' },
    { credentials: 'other' },
    { method: 'POST' },
    { body: '{}' },
    { cache: 'only-if-cached' },
    { headers: { 'invalid header': 'x' } },
  ].forEach((http) => {
    test(`rechaza opciones HTTP incompatibles: ${JSON.stringify(http)}`, () => {
      expect(() => createApiConfig({ http })).to.throw(DefaultError);
    });
  });
});
