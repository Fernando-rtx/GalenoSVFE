import { createServer } from 'node:http';
import { expect } from 'chai';
import { createApiConfig, TipoDocumentoDAO, ClinicaDAO, ConsultaDAO } from '../../src/js/index.js';
import { TIPOS, CLINICAS, CONSULTAS } from '../helpers/rest-fixtures.js';
import { rejection } from '../helpers/http-fixture.js';

// Respuestas sintéticas del contrato 0.2 por HTTP real. No es GalenosSV/JPA.
describe('DAOs oficiales contra servidor HTTP sintético, sin mock de Fetch', () => {
  let server;
  let tipos;
  let clinicas;
  let consultas;
  let lastRequest;
  const idClinica = CLINICAS[0].idClinica;
  const query = { idClinica };

  before(async () => {
    server = createServer((request, response) => {
      const url = new URL(request.url, 'http://fixture.invalid');
      lastRequest = { method: request.method, url };
      response.setHeader('Content-Type', 'application/json');
      const reply = (status, data, total) => {
        if (total !== undefined) response.setHeader('Total-registros', String(total));
        response.writeHead(status);
        response.end(JSON.stringify(data));
      };
      if (request.method !== 'GET') return reply(405, { mensaje: 'Solo lectura sintética' });
      // Un límite deliberadamente distinto al valor por defecto del backend:
      // comprueba que el cliente conserva 422 y no supone un máximo fijo.
      if (Number(url.searchParams.get('max')) > 3) return reply(422, { mensaje: 'Máximo sintético excedido' });
      const path = url.pathname;
      if (path === '/GalenosSV/resources/v1/tipo_documento') return reply(200, TIPOS, TIPOS.length);
      if (path === `/GalenosSV/resources/v1/tipo_documento/${TIPOS[0].idTipoDocumento}`) return reply(200, TIPOS[0]);
      if (path === '/GalenosSV/resources/v1/clinica') return reply(200, CLINICAS, CLINICAS.length);
      if (path === '/GalenosSV/resources/v1/consulta') {
        if (url.searchParams.get('idClinica') !== idClinica) return reply(200, [], 0);
        return reply(200, CONSULTAS.slice(0, 2), CONSULTAS.length);
      }
      if (path === `/GalenosSV/resources/v1/consulta/${CONSULTAS[0].idConsulta}` && url.searchParams.get('idClinica') === idClinica) {
        return reply(200, CONSULTAS[0]);
      }
      return reply(404, { mensaje: 'Registro sintético no encontrado' });
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const config = createApiConfig({ baseUrl: `http://127.0.0.1:${server.address().port}/GalenosSV/resources/` });
    tipos = new TipoDocumentoDAO({ config });
    clinicas = new ClinicaDAO({ config });
    consultas = new ConsultaDAO({ config });
  });

  after(async () => {
    if (server && server.listening) {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });

  it('obtiene catálogo, detalle y opciones de clínica por HTTP', async () => {
    expect((await tipos.findRange(0, 2)).datos).to.deep.equal(TIPOS);
    expect((await tipos.findById(TIPOS[0].idTipoDocumento)).datos).to.deep.equal(TIPOS[0]);
    const response = await clinicas.findRange(0, 2);
    expect(response.datos).to.deep.equal(CLINICAS);
    expect(response.totalDatos).to.equal(CLINICAS.length);
  });

  it('transmite todos los filtros y conserva el conteo del conjunto completo', async () => {
    const filters = Object.assign({}, query, { fechaDesde: '2026-10-22', fechaHasta: '2026-10-23', idPersonaRol: CONSULTAS[0].idPersonaRol });
    const response = await consultas.findRange(0, 2, { query: filters });
    expect(response.datos.length).to.equal(2);
    expect(response.totalDatos).to.equal(CONSULTAS.length);
    expect(lastRequest.method).to.equal('GET');
    Object.keys(filters).forEach(key => expect(lastRequest.url.searchParams.get(key)).to.equal(filters[key]));
  });

  it('mantiene clínica en el detalle y conserva 404 al cambiar de ámbito', async () => {
    expect((await consultas.findById(CONSULTAS[0].idConsulta, { query })).datos).to.deep.equal(CONSULTAS[0]);
    const error = await rejection(consultas.findById(CONSULTAS[0].idConsulta, { query: { idClinica: CLINICAS[1].idClinica } }));
    expect(error).to.include({ type: 'http', status: 404 });
  });

  it('conserva 422 del máximo de página propio de un despliegue', async () => {
    expect(await rejection(tipos.findRange(0, 4))).to.include({ type: 'http', status: 422 });
  });

  it('recibe [] y total cero cuando la clínica no tiene coincidencias', async () => {
    const response = await consultas.findRange(0, 2, { query: { idClinica: CLINICAS[1].idClinica } });
    expect(response.datos).to.deep.equal([]);
    expect(response.totalDatos).to.equal(0);
  });
});
