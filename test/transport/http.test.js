import { createServer } from 'node:http';
import { expect } from 'chai';
import { fixtureDAO, rejection } from '../helpers/http-fixture.js';

// Servidor HTTP sintético local. Prueba Fetch real, no la API REST de Galenos.
describe('Transporte HTTP real contra servidor sintético local', () => {
  let server;
  let baseUrl;
  let dao;
  let requests;

  before(async () => {
    requests = [];
    server = createServer(async (request, response) => {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      requests.push({ method: request.method, url: request.url, body: Buffer.concat(chunks).toString(), headers: request.headers });
      response.setHeader('Content-Type', 'application/json');
      if (request.url.endsWith('/missing-fixture')) {
        response.writeHead(404); response.end('{"fixtureError":"missing"}');
      } else if (request.url.endsWith('/broken-fixture')) {
        response.end('{invalid');
      } else if (request.url.endsWith('/slow-fixture')) {
        // Se limpia al cerrar las conexiones en after().
      } else if (request.method === 'DELETE' || request.method === 'PUT') {
        response.writeHead(204); response.end();
      } else if (request.method === 'POST') {
        response.setHeader('Location', '/fixture-items/new-fixture');
        response.writeHead(201); response.end('{"id":"new-fixture"}');
      } else if (request.url.includes('?')) {
        response.setHeader('Total-registros', '11'); response.end('[{"id":"fixture"}]');
      } else {
        response.end('{"id":"fixture"}');
      }
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/synthetic-api/`;
    dao = fixtureDAO(globalThis.fetch, { baseUrl });
  });

  after(async () => {
    if (server && server.listening) {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });

  it('ejecuta GET, POST, PUT y DELETE con Fetch nativo y cabeceras reales', async () => {
    const page = await dao.findRange(0, 2);
    expect(page.totalDatos).to.equal(11);
    expect((await dao.findById('fixture')).datos.id).to.equal('fixture');
    const created = await dao.create({ label: 'synthetic' });
    expect(created.status).to.equal(201);
    expect(created.getHeader('Location')).to.equal('/fixture-items/new-fixture');
    expect((await dao.update('fixture', { label: 'updated' })).datos).to.equal(null);
    expect((await dao.deleteById('fixture')).status).to.equal(204);
    expect(requests.map(request => request.method)).to.deep.equal(['GET', 'GET', 'POST', 'PUT', 'DELETE']);
    expect(JSON.parse(requests[2].body)).to.deep.equal({ label: 'synthetic' });
    expect(requests[2].headers['content-type']).to.equal('application/json');
    expect(requests[0].url).to.include('offset-fixture=0');
  });

  it('mantiene el estado 404 de una respuesta HTTP real', async () => {
    expect(await rejection(dao.findById('missing-fixture'))).to.include({ type: 'http', status: 404 });
  });

  it('detecta JSON inválido recibido por red', async () => {
    expect((await rejection(dao.findById('broken-fixture'))).type).to.equal('processing');
  });

  it('aborta por timeout una conexión real', async () => {
    const limited = fixtureDAO(globalThis.fetch, { baseUrl, timeoutMs: 50 });
    expect((await rejection(limited.findById('slow-fixture'))).code).to.equal('TIMEOUT');
  });
});
