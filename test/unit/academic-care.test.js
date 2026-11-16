import { expect } from 'chai';
import sinon from 'sinon';
import AcademicCareService from '../../src/js/control/AcademicCareService.js';
import { API_V2_ROUTES } from '../../src/js/control/api-v2-routes.js';
import { createApiConfig } from '../../src/js/control/api-config.js';
import { jsonResponse, rejection } from '../helpers/http-fixture.js';

const id = '00000000-0000-4000-8000-000000000011';
const baseUrl = 'https://demo.invalid/GalenosSV/resources/';

suite('HU1–HU4: contratos académicos', () => {
  let fetchStub;
  let api;
  setup(() => {
    fetchStub = sinon.stub();
    const config = createApiConfig({ baseUrl, routes: API_V2_ROUTES });
    api = new AcademicCareService(config);
    api.identity.fetchImpl = fetchStub;
    api.patientClinics.fetchImpl = fetchStub;
    api.patientAppointments.fetchImpl = fetchStub;
    api.employeeAppointments.fetchImpl = fetchStub;
    api.care.fetchImpl = fetchStub;
    api.ticket.fetchImpl = fetchStub;
    api.documentTypes.fetchImpl = fetchStub;
  });
  test('carga el catálogo público v1 aunque la configuración principal sea de gestión v2', async () => {
    fetchStub.resolves(jsonResponse([], 200, { 'Total-registros': '0' }));
    await api.findDocumentTypes(0, 100);
    const [url, options] = fetchStub.firstCall.args;
    expect(new URL(url).pathname).to.equal('/GalenosSV/resources/v1/tipo_documento');
    expect(options.headers.has('Authorization')).to.equal(false);
    expect(options.cache).to.equal('no-store');
    expect(API_V2_ROUTES.tipoDocumento.operations.findRange.path).to.equal('v2/tipo_documento');
  });
  test('envía la asignación elegida en bandeja y detalle junto a la misma sesión', async () => {
    const assignment = '00000000-0000-4000-8000-000000000099';
    const query = { idPersona: id, idClinica: id, idRol: id };
    const options = { headers: { Authorization: 'Bearer synthetic', 'X-Persona-Rol': assignment } };
    fetchStub.resolves(jsonResponse([], 200, { 'Total-registros': '0' }));
    await api.findEmployeeAppointments(0, 20, query, options);
    const [url, init] = fetchStub.firstCall.args;
    expect(new URL(url).searchParams.get('idPersona')).to.equal(id);
    expect(init.headers.get('X-Persona-Rol')).to.equal(assignment);
    expect(init.headers.get('Authorization')).to.equal('Bearer synthetic');
    // Basta observar la solicitud de detalle: un 403 no debe convertirse en datos vacíos.
    fetchStub.resolves(jsonResponse({ mensaje: 'Asignación no disponible' }, 403));
    const error = await rejection(api.getCare(id, query, options));
    expect(error.status).to.equal(403);
    expect(fetchStub.lastCall.args[1].headers.get('X-Persona-Rol')).to.equal(assignment);
  });
  test('envía clínica y sesión de paciente, sin repetir el documento en la URL', async () => {
    fetchStub.resolves(jsonResponse([], 200, { 'Total-registros': '0' }));
    await api.findPatientAppointments(0, 20, { idClinica: id }, { headers: { Authorization: 'Bearer session-token' } });
    const url = new URL(fetchStub.firstCall.args[0]);
    expect(url.pathname).to.equal('/GalenosSV/resources/v2/paciente/citas');
    expect(url.searchParams.has('numero')).to.equal(false);
    expect(fetchStub.firstCall.args[1].headers.get('Authorization')).to.equal('Bearer session-token');
    expect(fetchStub.firstCall.args[1].cache).to.equal('no-store');
  });
  test('rechaza rangos invertidos antes de llamar al backend', async () => {
    const error = await rejection(api.findPatientAppointments(0, 20, { idClinica: id, fechaDesde: '2026-12-02', fechaHasta: '2026-12-01' }));
    expect(error.type).to.equal('validation');
    expect(fetchStub.called).to.equal(false);
  });
  test('publica descarga ticket PDF como Blob bajo contrato explícito', async () => {
    fetchStub.resolves(new Response(new Blob(['%PDF-demo']), { headers: { 'Content-Type': 'application/pdf' } }));
    const response = await api.getTicket(id, { idClinica: id }, { headers: { Authorization: 'Bearer session-token' } });
    expect(response.datos).to.be.instanceOf(Blob);
    expect(new URL(fetchStub.firstCall.args[0]).pathname).to.include('/ticket');
    expect(fetchStub.firstCall.args[1].headers.get('Authorization')).to.equal('Bearer session-token');
  });
  const careInput = (accion) => ({
    idConsulta: id, idPersona: id, idClinica: id, idRol: id,
    idConsultaProcedimientoPaso: id, accion, valor: 'Registro sintético', examenes: [id],
  });
  test('acepta el detalle HU4 ampliado con órdenes y predecesores reales del DTO', async () => {
    const detail = { idConsulta: id, idConsultaProcedimientoPaso: id, paciente: 'Paciente sintético',
      clinica: 'Clínica sintética', rol: 'Rol sintético', procedimiento: 'Procedimiento sintético',
      idPasoActual: id, pasoActual: 'Paso sintético', valorActual: null, pasoFinal: false,
      historial: [], examenes: [], siguientes: [], puedeRetroceder: true,
      fechaConsulta: null, empleado: 'Empleado sintético', idPersonaRol: id,
      idConsultaProcedimiento: id, estadoPasoActual: 'EN_CURSO',
      anteriores: [{ idConsultaProcedimientoPaso: id, idPaso: id, nombre: null }],
      ordenesActuales: [{ idOrdenExamen: id, examen: null, fechaCreacion: null, indicaciones: null,
        resultados: [{ idExamenResultado: id, fechaCreacion: null, resultado: null, interpretacion: null }] }] };
    fetchStub.resolves(jsonResponse(detail));
    const result = await api.getCare(id, { idPersona: id, idClinica: id, idRol: id });
    expect(result.datos).to.deep.equal(detail);
  });
  for (const accion of ['GUARDAR_PARCIAL', 'AVANZAR', 'RETROCEDER', 'FINALIZAR']) {
    test(`envía ${accion} con contexto, exámenes y sesión sin alterar el formulario`, async () => {
      const expected = { idConsulta: id, accion, estado: 'EN_CURSO',
        idConsultaProcedimientoPaso: id, idPasoActual: id, finalizada: false };
      fetchStub.resolves(jsonResponse(expected));
      const input = Object.freeze(careInput(accion));
      const result = await api.register(input, { headers: { Authorization: 'Bearer synthetic' } });
      sinon.assert.calledOnce(fetchStub);
      const [url, options] = fetchStub.firstCall.args;
      expect(new URL(url).pathname).to.equal('/GalenosSV/resources/v2/atencion/registrar');
      expect(options.method).to.equal('POST');
      expect(JSON.parse(options.body)).to.deep.equal(input);
      expect(options.headers.get('Authorization')).to.equal('Bearer synthetic');
      expect(options.cache).to.equal('no-store');
      expect(result.datos).to.deep.equal(expected);
    });
  }
  for (const [label, change] of [
    ['acción desconocida', { accion: 'BORRAR' }],
    ['examen inválido', { examenes: ['incorrecto'] }],
    ['paso ausente', { idConsultaProcedimientoPaso: null }],
    ['clínica ausente', { idClinica: null }],
    ['ejecución anterior inválida', { idConsultaProcedimientoPasoAnterior: 'ajena' }],
  ]) {
    test(`rechaza ${label} antes de enviar la atención`, async () => {
      const error = await rejection(api.register({ ...careInput('GUARDAR_PARCIAL'), ...change }));
      expect(error.type).to.equal('validation');
      sinon.assert.notCalled(fetchStub);
    });
  }
  for (const status of [403, 409, 500]) {
    test(`conserva HTTP ${status} sin simular una atención guardada`, async () => {
      fetchStub.resolves(jsonResponse({ message: 'SQL privado' }, status));
      const error = await rejection(api.register(careInput('AVANZAR')));
      expect(error.status).to.equal(status);
      expect(error.type).to.equal('http');
      expect(error.message).not.to.include('SQL');
      sinon.assert.calledOnce(fetchStub);
    });
  }
});
