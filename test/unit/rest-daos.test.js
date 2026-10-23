import { expect } from 'chai';
import sinon from 'sinon';
import { createApiConfig, TipoDocumentoDAO, ClinicaDAO, ConsultaDAO } from '../../src/js/index.js';
import { TIPOS, CLINICAS, CONSULTAS } from '../helpers/rest-fixtures.js';
import { jsonResponse, rejection } from '../helpers/http-fixture.js';

describe('DAOs REST oficiales, contrato 0.2 (Fetch simulado)', () => {
  const baseUrl = 'https://fixture.invalid/GalenosSV/resources/';
  const idClinica = CLINICAS[0].idClinica;
  const query = { idClinica };
  let fetchStub;
  let tipos;
  let clinicas;
  let consultas;
  beforeEach(() => {
    fetchStub = sinon.stub();
    const options = { config: createApiConfig({ baseUrl }), fetchImpl: fetchStub };
    tipos = new TipoDocumentoDAO(options);
    clinicas = new ClinicaDAO(options);
    consultas = new ConsultaDAO(options);
  });

  it('TipoDocumento adapta arreglo y Total-registros a la interfaz acordada', async () => {
    fetchStub.resolves(jsonResponse(TIPOS, 200, { 'Total-registros': '8' }));
    const response = await tipos.findRange(0, 2);
    expect(fetchStub.firstCall.args[0]).to.equal(`${baseUrl}v1/tipo_documento?first=0&max=2`);
    expect(response.datos).to.deep.equal(TIPOS);
    expect(response.totalDatos).to.equal(8);
    expect(response.datos[0]).not.to.have.property('documentoCollection');
    expect(fetchStub.firstCall.args[1].credentials).to.equal('omit');
  });

  it('TipoDocumento consulta detalle por UUID sin inventar un total', async () => {
    fetchStub.resolves(jsonResponse(TIPOS[0]));
    const response = await tipos.findById(TIPOS[0].idTipoDocumento);
    expect(fetchStub.firstCall.args[0]).to.equal(`${baseUrl}v1/tipo_documento/${TIPOS[0].idTipoDocumento}`);
    expect(response.datos).to.deep.equal(TIPOS[0]);
    expect(response.totalDatos).to.equal(null);
  });

  it('acepta UUID canónico con mayúsculas sin aplicar restricciones de versión no publicadas', async () => {
    fetchStub.resolves(jsonResponse(TIPOS[0]));
    const id = 'ABCDEF01-ABCD-0000-0000-ABCDEF012345';
    await tipos.findById(id);
    expect(fetchStub.firstCall.args[0]).to.equal(`${baseUrl}v1/tipo_documento/${id}`);
  });

  it('Clínica obtiene las opciones por HTTP sin fijar IDs en el DAO', async () => {
    fetchStub.resolves(jsonResponse(CLINICAS, 200, { 'Total-registros': String(CLINICAS.length) }));
    const response = await clinicas.findRange(0, 5);
    expect(new URL(fetchStub.firstCall.args[0]).pathname).to.equal('/GalenosSV/resources/v1/clinica');
    expect(response.datos).to.deep.equal(CLINICAS);
    expect(response.totalDatos).to.equal(CLINICAS.length);
  });

  it('Consulta envía clínica y únicamente los filtros publicados', async () => {
    fetchStub.resolves(jsonResponse(CONSULTAS, 200, { 'Total-registros': String(CONSULTAS.length) }));
    const filters = { idClinica, fechaDesde: '2026-10-22', fechaHasta: '2026-10-23', idPersonaRol: CONSULTAS[0].idPersonaRol };
    const response = await consultas.findRange(0, 10, { query: filters });
    const url = new URL(fetchStub.firstCall.args[0]);
    expect(url.pathname).to.equal('/GalenosSV/resources/v1/consulta');
    Object.keys(filters).forEach(name => expect(url.searchParams.get(name)).to.equal(filters[name]));
    expect(response.datos).to.deep.equal(CONSULTAS);
    expect(response.datos.find(item => item.personaNombre === null).personaNombre).to.equal(null);
    expect(response.datos[0].fechaInicio).to.equal(CONSULTAS[0].fechaInicio);
  });

  it('Consulta conserva el ámbito de clínica en el detalle', async () => {
    fetchStub.resolves(jsonResponse(CONSULTAS[0]));
    const response = await consultas.findById(CONSULTAS[0].idConsulta, { query });
    const url = new URL(fetchStub.firstCall.args[0]);
    expect(url.pathname).to.equal(`/GalenosSV/resources/v1/consulta/${CONSULTAS[0].idConsulta}`);
    expect(url.searchParams.get('idClinica')).to.equal(idClinica);
    expect(response.totalDatos).to.equal(null);
  });

  it('omite un filtro opcional undefined en lugar de serializarlo', async () => {
    fetchStub.resolves(jsonResponse([], 200, { 'Total-registros': '0' }));
    await consultas.findRange(0, 1, { query: { idClinica, fechaDesde: undefined } });
    expect(new URL(fetchStub.firstCall.args[0]).searchParams.has('fechaDesde')).to.equal(false);
  });

  it('valida año bisiesto y años bajos sin rollover de Date ni zona del navegador', async () => {
    fetchStub.callsFake(() => Promise.resolve(jsonResponse([], 200, { 'Total-registros': '0' })));
    for (const fechaDesde of ['0001-01-01', '2000-02-29', '2024-02-29', '9999-12-31']) {
      await consultas.findRange(0, 1, { query: { idClinica, fechaDesde } });
    }
    expect(fetchStub.callCount).to.equal(4);
  });

  it('no envía credenciales aunque un entorno genérico las haya habilitado', async () => {
    fetchStub.resolves(jsonResponse(TIPOS[0]));
    const dao = new TipoDocumentoDAO({ config: createApiConfig({ baseUrl, http: { credentials: 'include' } }), fetchImpl: fetchStub });
    await dao.findById(TIPOS[0].idTipoDocumento);
    expect(fetchStub.firstCall.args[1].credentials).to.equal('omit');
  });

  const resources = [
    { name: 'TipoDocumento', get: () => tipos, options: {} },
    { name: 'Clínica', get: () => clinicas, options: {} },
    { name: 'Consulta', get: () => consultas, options: { query } }
  ];
  resources.forEach(resource => {
    it(`${resource.name} conserva un total no cero en una página sin resultados`, async () => {
      fetchStub.resolves(jsonResponse([], 200, { 'Total-registros': '17' }));
      const response = await resource.get().findRange(50, 2, resource.options);
      expect(response.datos).to.deep.equal([]);
      expect(response.totalDatos).to.equal(17);
    });

    it(`${resource.name} representa conjunto vacío como [] y total cero`, async () => {
      fetchStub.resolves(jsonResponse([], 200, { 'Total-registros': '0' }));
      const response = await resource.get().findRange(0, 2, resource.options);
      expect(response.datos).to.deep.equal([]);
      expect(response.totalDatos).to.equal(0);
    });

    it(`${resource.name} detecta total ausente o no expuesto por CORS`, async () => {
      fetchStub.resolves(jsonResponse([]));
      expect(await rejection(resource.get().findRange(0, 2, resource.options))).to.include({ type: 'processing', status: 200 });
    });

    [403, 404, 422, 500].forEach(status => {
      it(`${resource.name} conserva HTTP ${status} y mensaje JSON del backend`, async () => {
        const details = { mensaje: 'Error sintético del contrato' };
        fetchStub.resolves(jsonResponse(details, status));
        const error = await rejection(resource.get().findRange(0, 2, resource.options));
        expect(error).to.include({ type: 'http', status });
        expect(error.details).to.deep.equal(details);
      });
    });

    ['create', 'update', 'deleteById'].forEach(operation => {
      it(`${resource.name}.${operation} no está disponible ni envía HTTP`, async () => {
        const dao = resource.get();
        const promise = operation === 'create' ? dao.create({}) : operation === 'update' ? dao.update('fixture', {}) : dao.deleteById('fixture');
        expect((await rejection(promise)).code).to.equal('OPERATION_UNSUPPORTED');
        sinon.assert.notCalled(fetchStub);
      });
    });

    it(`${resource.name} respeta el rango entero de paginación del contrato Java`, async () => {
      for (const [first, max] of [[2147483648, 1], [0, 2147483648]]) {
        expect((await rejection(resource.get().findRange(first, max, resource.options))).type).to.equal('validation');
      }
      sinon.assert.notCalled(fetchStub);
    });
  });

  it('Clínica no inventa una ruta de detalle', async () => {
    expect((await rejection(clinicas.findById(idClinica))).code).to.equal('OPERATION_UNSUPPORTED');
    sinon.assert.notCalled(fetchStub);
  });

  [null, '', ' ', '1-1-1-1-1', '00000000000040008000000000000001', '00000000-0000-4000-8000-00000000000g', `${TIPOS[0].idTipoDocumento} `].forEach(id => {
    it(`rechaza UUID no canónico ${JSON.stringify(id)} antes de Fetch`, async () => {
      expect((await rejection(tipos.findById(id))).type).to.equal('validation');
      expect((await rejection(consultas.findById(id, { query }))).type).to.equal('validation');
      sinon.assert.notCalled(fetchStub);
    });
  });

  [undefined, {}, { idClinica: null }, { idClinica: '' }, { idClinica: 'no-uuid' }].forEach(filters => {
    it(`exige clínica válida en lista y detalle: ${JSON.stringify(filters)}`, async () => {
      expect((await rejection(consultas.findRange(0, 1, { query: filters }))).code).to.equal('INVALID_QUERY');
      expect((await rejection(consultas.findById(CONSULTAS[0].idConsulta, { query: filters }))).code).to.equal('INVALID_QUERY');
      sinon.assert.notCalled(fetchStub);
    });
  });

  ['0000-01-01', '2026-02-29', '1900-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00', '2026-1-01', '2026-10-22T00:00:00Z', '', null, 20261022].forEach(value => {
    it(`rechaza fecha inválida ${JSON.stringify(value)}`, async () => {
      expect((await rejection(consultas.findRange(0, 1, { query: { idClinica, fechaDesde: value } }))).code).to.equal('INVALID_QUERY');
      expect((await rejection(consultas.findRange(0, 1, { query: { idClinica, fechaHasta: value } }))).code).to.equal('INVALID_QUERY');
      sinon.assert.notCalled(fetchStub);
    });
  });

  it('rechaza fechaDesde posterior a fechaHasta sin corregirla silenciosamente', async () => {
    expect((await rejection(consultas.findRange(0, 1, { query: { idClinica, fechaDesde: '2026-10-23', fechaHasta: '2026-10-22' } }))).code).to.equal('INVALID_QUERY');
    sinon.assert.notCalled(fetchStub);
  });

  it('rechaza PersonaRol inválido, filtros desconocidos y cambios de paginación por query', async () => {
    for (const extra of [{ idPersonaRol: 'invalid' }, { doctorNombre: 'no-publicado' }, { first: 2 }, { max: 3 }]) {
      expect((await rejection(consultas.findRange(0, 1, { query: Object.assign({}, query, extra) }))).code).to.equal('INVALID_QUERY');
    }
    sinon.assert.notCalled(fetchStub);
  });

  it('no admite filtros de lista en el detalle ni en TipoDocumento/Clínica', async () => {
    expect((await rejection(consultas.findById(CONSULTAS[0].idConsulta, { query: { idClinica, fechaDesde: '2026-10-22' } }))).code).to.equal('INVALID_QUERY');
    expect((await rejection(tipos.findRange(0, 1, { query }))).code).to.equal('INVALID_QUERY');
    expect((await rejection(clinicas.findRange(0, 1, { query }))).code).to.equal('INVALID_QUERY');
    sinon.assert.notCalled(fetchStub);
  });

  it('no acepta un sobre JSON o una entidad JPA como sustituto del DTO publicado', async () => {
    fetchStub.resolves(jsonResponse({ datos: TIPOS }, 200, { 'Total-registros': '1' }));
    expect((await rejection(tipos.findRange(0, 1))).type).to.equal('processing');
    fetchStub.resolves(jsonResponse({ idConsulta: CONSULTAS[0].idConsulta, observaciones: 'sintético' }));
    expect((await rejection(consultas.findById(CONSULTAS[0].idConsulta, { query }))).type).to.equal('processing');
  });

  it('no elimina campos null ni convierte timestamps UTC del DTO', async () => {
    const nullable = Object.assign({}, CONSULTAS[0], {
      fechaInicio: null, fechaFin: null, idPersonaRol: null, personaNombre: null,
      rolNombre: null, idClinica: null, clinicaNombre: null
    });
    fetchStub.resolves(jsonResponse(nullable));
    expect((await consultas.findById(nullable.idConsulta, { query })).datos).to.deep.equal(nullable);
  });
});
