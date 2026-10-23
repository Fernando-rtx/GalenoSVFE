import { expect } from 'chai';
import sinon from 'sinon';
import { DefaultDAO, DefaultError } from '../../src/js/index.js';
import { fixtureDAO, fixtureRoutes, jsonResponse, rejection } from '../helpers/http-fixture.js';

describe('DefaultDAO con Fetch simulado', () => {
  let sandbox;
  let fetchStub;
  let dao;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fetchStub = sandbox.stub().callsFake(() => Promise.resolve(jsonResponse({ id: 'fixture-id' })));
    dao = fixtureDAO(fetchStub);
  });
  afterEach(() => sandbox.restore());

  it('GET por ID preserva contexto y codifica el segmento', async () => {
    const response = await dao.findById('a/b ?#');
    const [url, init] = fetchStub.firstCall.args;
    expect(url).to.equal('https://fixture.invalid/application/api/fixture-items/a%2Fb%20%3F%23');
    expect(init.method).to.equal('GET');
    expect(init).not.to.have.property('body');
    expect(init.headers.has('Content-Type')).to.equal(false);
    expect(response.datos).to.deep.equal({ id: 'fixture-id' });
    expect(response.status).to.equal(200);
    expect(response.metadata.operation).to.equal('findById');
  });

  it('findRange envía los nombres configurados y lee Total-registros sin inferir el total', async () => {
    fetchStub.resolves(jsonResponse([{ id: 'fixture' }], 200, { 'Total-registros': '37' }));
    const response = await dao.findRange(10, 5);
    const url = new URL(fetchStub.firstCall.args[0]);
    expect(url.searchParams.get('offset-fixture')).to.equal('10');
    expect(url.searchParams.get('limit-fixture')).to.equal('5');
    expect(response.totalDatos).to.equal(37);
    expect(response.metadata.pagination).to.deep.equal({ first: 10, max: 5 });
  });

  it('representa el total desconocido como null y admite primera posición cero', async () => {
    fetchStub.resolves(jsonResponse([]));
    expect((await dao.findRange(0, 3)).totalDatos).to.equal(null);
  });

  it('preserva total cero de un catálogo vacío', async () => {
    fetchStub.resolves(jsonResponse([], 200, { 'Total-registros': '0' }));
    expect((await dao.findRange(0, 3)).totalDatos).to.equal(0);
  });

  it('permite mapear un sobre JSON solo desde un contrato explícito', async () => {
    const routes = fixtureRoutes();
    Object.assign(routes.fixture.operations.findRange, {
      mapData: body => body.fixtureRows,
      mapTotal: body => body.fixtureCount
    });
    fetchStub.resolves(jsonResponse({ fixtureRows: [{ id: 1 }], fixtureCount: 9 }));
    const result = await fixtureDAO(fetchStub, { routes }).findRange(0, 1);
    expect(result.datos).to.deep.equal([{ id: 1 }]);
    expect(result.totalDatos).to.equal(9);
  });

  it('POST serializa JSON y conserva estado 201 y Location', async () => {
    fetchStub.resolves(jsonResponse({ id: 'new-fixture' }, 201, { Location: '/fixture/new-fixture' }));
    const response = await dao.create({ label: 'fixture' });
    const init = fetchStub.firstCall.args[1];
    expect(init.method).to.equal('POST');
    expect(init.body).to.equal('{"label":"fixture"}');
    expect(init.headers.get('Content-Type')).to.equal('application/json');
    expect(response.status).to.equal(201);
    expect(response.getHeader('Location')).to.equal('/fixture/new-fixture');
  });

  it('PUT actualiza por ID y devuelve los datos que realmente responde el servidor', async () => {
    fetchStub.resolves(jsonResponse({ label: 'normalized-fixture' }));
    const response = await dao.update('fixture-id', { label: 'fixture' });
    expect(fetchStub.firstCall.args[1].method).to.equal('PUT');
    expect(response.datos.label).to.equal('normalized-fixture');
  });

  it('PUT 204 no intenta procesar JSON', async () => {
    fetchStub.resolves(new Response(null, { status: 204 }));
    expect((await dao.update('fixture-id', {})).datos).to.equal(null);
  });

  it('DELETE 204 no inventa un booleano ni un cuerpo JSON', async () => {
    fetchStub.resolves(new Response(null, { status: 204 }));
    const response = await dao.deleteById('fixture-id');
    expect(fetchStub.firstCall.args[1].method).to.equal('DELETE');
    expect(response.datos).to.equal(null);
    expect(response.status).to.equal(204);
  });

  const calls = {
    findRange: dao => dao.findRange(0, 4), findById: dao => dao.findById('fixture'),
    create: dao => dao.create({}), update: dao => dao.update('fixture', {}), deleteById: dao => dao.deleteById('fixture')
  };
  Object.keys(calls).forEach(operation => {
    [403, 404, 405, 422, 500].forEach(status => {
      it(`${operation} normaliza HTTP ${status} con detalles y cabeceras`, async () => {
        fetchStub.resolves(jsonResponse({ fixtureError: 'detalle' }, status, { 'X-Fixture': 'trace' }));
        const error = await rejection(calls[operation](dao));
        expect(error).to.be.instanceOf(DefaultError);
        expect(error).to.include({ type: 'http', code: 'HTTP_ERROR', status });
        expect(error.details).to.deep.equal({ fixtureError: 'detalle' });
        expect(error.headers['x-fixture']).to.equal('trace');
        expect(fetchStub.callCount).to.equal(1);
      });
    });
  });

  it('conserva HTTP 500 aunque el cuerpo sea HTML', async () => {
    fetchStub.resolves(new Response('<h1>Error fixture</h1>', { status: 500, headers: { 'Content-Type': 'text/html' } }));
    const error = await rejection(dao.findById('fixture'));
    expect(error.type).to.equal('http');
    expect(error.details).to.equal('<h1>Error fixture</h1>');
  });

  it('normaliza un error de red sin atribuirle un estado HTTP', async () => {
    const cause = new TypeError('Failed to fetch');
    fetchStub.rejects(cause);
    const error = await rejection(dao.findById('fixture'));
    expect(error).to.include({ type: 'connection', code: 'NETWORK_ERROR', status: null });
    expect(error.cause).to.equal(cause);
    expect(fetchStub.callCount).to.equal(1);
  });

  [200, 500].forEach(status => {
    it(`conserva el estado ${status} si se interrumpe la lectura del cuerpo`, async () => {
      const stream = new ReadableStream({ start(controller) { controller.error(new Error('interrupción sintética')); } });
      fetchStub.resolves(new Response(stream, { status }));
      const error = await rejection(dao.findById('fixture'));
      expect(error.status).to.equal(status);
      expect(error.type).to.equal(status === 500 ? 'http' : 'connection');
      expect(error.code).to.equal(status === 500 ? 'HTTP_ERROR' : 'BODY_READ_ERROR');
    });
  });

  ['{invalid', ''].forEach(body => {
    it(`rechaza JSON inválido o vacío en un 200: ${JSON.stringify(body)}`, async () => {
      fetchStub.resolves(new Response(body, { headers: { 'Content-Type': 'application/json' } }));
      expect(await rejection(dao.findById('fixture'))).to.include({ type: 'processing', status: 200 });
    });
  });

  it('rechaza HTML en un éxito que debía responder JSON', async () => {
    fetchStub.resolves(new Response('<html>login</html>', { headers: { 'Content-Type': 'text/html' } }));
    expect((await rejection(dao.findById('fixture'))).type).to.equal('processing');
  });

  it('acepta media types JSON con sufijo y charset', async () => {
    fetchStub.resolves(new Response('{}', { headers: { 'Content-Type': 'application/vnd.fixture+json; charset=utf-8' } }));
    expect((await dao.findById('fixture')).datos).to.deep.equal({});
  });

  it('rechaza un estado de éxito no confirmado para la operación', async () => {
    fetchStub.resolves(jsonResponse({}, 202));
    expect(await rejection(dao.create({}))).to.include({ type: 'processing', status: 202 });
  });

  it('rechaza un cuerpo no vacío cuando el contrato declara respuesta none', async () => {
    const routes = fixtureRoutes();
    Object.assign(routes.fixture.operations.create, { response: 'none' });
    fetchStub.resolves(jsonResponse({}, 201));
    expect((await rejection(fixtureDAO(fetchStub, { routes }).create({}))).type).to.equal('processing');
  });

  it('permite respuestas de texto solo cuando el contrato lo declara', async () => {
    const routes = fixtureRoutes();
    routes.fixture.operations.findById.response = 'text';
    fetchStub.resolves(new Response('fixture-text', { headers: { 'Content-Type': 'text/plain' } }));
    expect((await fixtureDAO(fetchStub, { routes }).findById('fixture')).datos).to.equal('fixture-text');
  });

  it('rechaza un resultado paginado que no produce un arreglo', async () => {
    expect((await rejection(dao.findRange(0, 3))).type).to.equal('processing');
  });

  ['-1', '1.5', 'abc', '', '9007199254740992'].forEach(value => {
    it(`rechaza total inválido del backend: ${JSON.stringify(value)}`, async () => {
      fetchStub.resolves(jsonResponse([], 200, { 'Total-registros': value }));
      expect((await rejection(dao.findRange(0, 2))).type).to.equal('processing');
    });
  });

  it('detecta una cabecera obligatoria ausente o no expuesta por CORS', async () => {
    const routes = fixtureRoutes();
    routes.fixture.operations.findRange.pagination.requireTotal = true;
    fetchStub.resolves(jsonResponse([]));
    expect((await rejection(fixtureDAO(fetchStub, { routes }).findRange(0, 2))).type).to.equal('processing');
  });

  it('usa exactamente el nombre de cabecera configurado, sin alias inventados', async () => {
    const routes = fixtureRoutes();
    routes.fixture.operations.findRange.pagination.totalHeader = 'X-Fixture-Count';
    fetchStub.resolves(jsonResponse([], 200, { 'Total-registros': '90', 'X-Fixture-Count': '6' }));
    expect((await fixtureDAO(fetchStub, { routes }).findRange(0, 2)).totalDatos).to.equal(6);
  });

  [[-1, 2], [0, 0], [0, -1], ['0', 2], [1.5, 2], [0, Infinity], [0, Number.MAX_SAFE_INTEGER + 1]].forEach(([first, max]) => {
    it(`rechaza paginación inválida ${first}, ${max} sin enviar solicitudes`, async () => {
      expect((await rejection(dao.findRange(first, max))).type).to.equal('validation');
      sinon.assert.notCalled(fetchStub);
    });
  });

  [null, undefined, '', ' ', {}, [], -1, 1.5, '.', '..'].forEach(id => {
    it(`rechaza ID inválido ${JSON.stringify(id)} como Promise`, async () => {
      const promise = dao.findById(id);
      expect(promise).to.be.instanceOf(Promise);
      expect((await rejection(promise)).type).to.equal('validation');
      sinon.assert.notCalled(fetchStub);
    });
  });

  it('admite identificador numérico cero sin confundirlo con ausencia', async () => {
    await dao.findById(0);
    expect(fetchStub.firstCall.args[0]).to.match(/\/0$/);
  });

  it('aplica validadores del contrato antes de enviar datos', async () => {
    const routes = fixtureRoutes();
    routes.fixture.operations.create.validateData = data => typeof data.fixtureName === 'string';
    routes.fixture.operations.findById.validateId = () => false;
    const validated = fixtureDAO(fetchStub, { routes });
    expect((await rejection(validated.create({}))).code).to.equal('INVALID_DATA');
    expect((await rejection(validated.findById('fixture'))).type).to.equal('validation');
    sinon.assert.notCalled(fetchStub);
  });

  it('rechaza datos no JSON, circulares o con pérdida de valores', async () => {
    const circular = {}; circular.self = circular;
    for (const value of [null, undefined, 'text', circular, { count: NaN }, { missing: undefined }, { count: BigInt(1) }, new Map(), { nested: new Set() }]) {
      expect((await rejection(dao.create(value))).type).to.equal('validation');
    }
    sinon.assert.notCalled(fetchStub);
  });

  it('combina cabeceras y opciones de entorno sin compartir mutaciones', async () => {
    const configured = fixtureDAO(fetchStub, { http: { credentials: 'include', headers: { Accept: 'application/json', 'X-Fixture': 'environment' } } });
    await configured.findById('first', { headers: { 'X-Fixture': 'request' } });
    await configured.findById('second');
    expect(fetchStub.firstCall.args[1].headers.get('X-Fixture')).to.equal('request');
    expect(fetchStub.secondCall.args[1].headers.get('X-Fixture')).to.equal('environment');
    expect(fetchStub.firstCall.args[1].credentials).to.equal('include');
    expect(fetchStub.firstCall.args[1].headers.get('Accept')).to.equal('application/json');
  });

  it('rechaza Content-Type incompatible con JSON sin enviar solicitudes', async () => {
    expect((await rejection(dao.create({}, { headers: { 'Content-Type': 'text/plain' } }))).code).to.equal('INVALID_DATA');
    sinon.assert.notCalled(fetchStub);
  });

  it('limita toda la operación, incluida la lectura del cuerpo', async () => {
    const clock = sandbox.useFakeTimers();
    fetchStub.resolves(new Response(new ReadableStream({ start() {} }), { headers: { 'Content-Type': 'application/json' } }));
    const promise = rejection(fixtureDAO(fetchStub, { timeoutMs: 25 }).findById('fixture'));
    await clock.tickAsync(25);
    expect(await promise).to.include({ type: 'connection', code: 'TIMEOUT' });
    expect(fetchStub.firstCall.args[1].signal.aborted).to.equal(true);
    expect(clock.countTimers()).to.equal(0);
  });

  it('normaliza timeout aunque Fetch no responda', async () => {
    const clock = sandbox.useFakeTimers();
    fetchStub.returns(new Promise(() => {}));
    const promise = rejection(fixtureDAO(fetchStub, { timeoutMs: 10 }).findById('fixture'));
    await clock.tickAsync(10);
    expect((await promise).code).to.equal('TIMEOUT');
    expect(clock.countTimers()).to.equal(0);
  });

  it('no envía una solicitud previamente cancelada', async () => {
    const controller = new AbortController(); controller.abort();
    expect((await rejection(dao.findById('fixture', { signal: controller.signal }))).code).to.equal('CANCELLED');
    sinon.assert.notCalled(fetchStub);
  });

  it('rechaza valores falsy que no sean AbortSignal antes de enviar HTTP', async () => {
    for (const signal of [false, 0, '']) {
      expect((await rejection(dao.findById('fixture', { signal }))).type).to.equal('validation');
    }
    sinon.assert.notCalled(fetchStub);
  });

  it('propaga la cancelación y retira su listener', async () => {
    const controller = new AbortController();
    const remove = sandbox.spy(controller.signal, 'removeEventListener');
    fetchStub.returns(new Promise(() => {}));
    const promise = rejection(dao.findById('fixture', { signal: controller.signal }));
    await Promise.resolve(); await Promise.resolve();
    controller.abort();
    expect((await promise).code).to.equal('CANCELLED');
    expect(fetchStub.firstCall.args[1].signal.aborted).to.equal(true);
    sinon.assert.calledOnce(remove);
  });

  it('limpia el timer al completar una solicitud', async () => {
    const clock = sandbox.useFakeTimers();
    const pending = dao.findById('fixture');
    await clock.tickAsync(0);
    await pending;
    expect(clock.countTimers()).to.equal(0);
  });

  it('rechaza operaciones no confirmadas antes de llamar a Fetch', async () => {
    const routes = fixtureRoutes(); delete routes.fixture.operations.create;
    expect((await rejection(fixtureDAO(fetchStub, { routes }).create({}))).code).to.equal('OPERATION_UNSUPPORTED');
    sinon.assert.notCalled(fetchStub);
  });

  it('exige URL base solo al ejecutar un contrato confirmado', async () => {
    expect((await rejection(fixtureDAO(fetchStub, { baseUrl: null }).findById('fixture'))).code).to.equal('BASE_URL_REQUIRED');
    sinon.assert.notCalled(fetchStub);
  });

  it('rechaza rutas que salen del contexto configurado', async () => {
    const routes = fixtureRoutes(); routes.fixture.operations.findById.path = '../../outside/{id}';
    expect((await rejection(fixtureDAO(fetchStub, { routes }).findById('fixture'))).code).to.equal('INVALID_CONTRACT');
    sinon.assert.notCalled(fetchStub);
  });

  it('rechaza una ruta absoluta en lugar de cambiar de backend', async () => {
    const routes = fixtureRoutes(); routes.fixture.operations.findById.path = 'https://other.invalid/{id}';
    expect((await rejection(fixtureDAO(fetchStub, { routes }).findById('fixture'))).code).to.equal('INVALID_CONTRACT');
    sinon.assert.notCalled(fetchStub);
  });

  [
    { method: 'POST' }, { successStatuses: [404] }, { response: 'auto' },
    { path: 'fixture-items' }, { mapData: true }
  ].forEach(change => {
    it(`rechaza un contrato inconsistente: ${JSON.stringify(change)}`, async () => {
      const routes = fixtureRoutes();
      Object.assign(routes.fixture.operations.findById, change);
      expect((await rejection(fixtureDAO(fetchStub, { routes }).findById('fixture'))).code).to.equal('INVALID_CONTRACT');
      sinon.assert.notCalled(fetchStub);
    });
  });

  it('exige una fuente para un contrato declarado verificado', async () => {
    const routes = fixtureRoutes(); routes.fixture.source = '';
    expect((await rejection(fixtureDAO(fetchStub, { routes }).findById('fixture'))).code).to.equal('INVALID_CONTRACT');
    sinon.assert.notCalled(fetchStub);
  });

  it('no interpreta propiedades heredadas como recursos', async () => {
    const inherited = new DefaultDAO({ resource: 'toString', fetchImpl: fetchStub });
    expect((await rejection(inherited.findById('fixture'))).code).to.equal('CONTRACT_PENDING');
    sinon.assert.notCalled(fetchStub);
  });

  it('serializa parámetros configurados sin permitir inyección de otro parámetro', async () => {
    const routes = fixtureRoutes();
    routes.fixture.operations.findById.query = { search: { validate: value => typeof value === 'string' } };
    await fixtureDAO(fetchStub, { routes }).findById('fixture', { query: { search: 'x&first=999#part' } });
    const url = new URL(fetchStub.firstCall.args[0]);
    expect(url.searchParams.get('search')).to.equal('x&first=999#part');
    expect(url.searchParams.has('first')).to.equal(false);
    expect(url.hash).to.equal('');
  });

  it('conserva el estado ya recibido cuando ocurre timeout leyendo un error HTTP', async () => {
    const clock = sandbox.useFakeTimers();
    fetchStub.resolves(new Response(new ReadableStream({ start() {} }), { status: 500, headers: { 'X-Fixture': 'trace' } }));
    const pending = rejection(fixtureDAO(fetchStub, { timeoutMs: 25 }).findById('fixture'));
    await clock.tickAsync(25);
    expect(await pending).to.include({ code: 'TIMEOUT', type: 'connection', status: 500 });
    expect((await pending).headers['x-fixture']).to.equal('trace');
  });
});
