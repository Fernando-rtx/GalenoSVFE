import { expect } from 'chai';
import sinon from 'sinon';
import AcademicCareService from '../../src/js/control/AcademicCareService.js';
import { API_V2_ROUTES } from '../../src/js/control/api-v2-routes.js';
import { createApiConfig } from '../../src/js/control/api-config.js';
import { jsonResponse, rejection } from '../helpers/http-fixture.js';

const id = '00000000-0000-4000-8000-000000000011';
const baseUrl = 'https://demo.invalid/GalenosSV/resources/';

describe('HU1–HU4: contratos académicos', () => {
  let fetchStub;
  let api;
  beforeEach(() => {
    fetchStub = sinon.stub();
    const config = createApiConfig({ baseUrl, routes: API_V2_ROUTES });
    api = new AcademicCareService(config);
    api.identity.fetchImpl = fetchStub;
    api.patientClinics.fetchImpl = fetchStub;
    api.patientAppointments.fetchImpl = fetchStub;
    api.employeeAppointments.fetchImpl = fetchStub;
    api.care.fetchImpl = fetchStub;
    api.ticket.fetchImpl = fetchStub;
  });
  it('envía solo identidad y clínica para buscar citas, sin almacenar el documento', async () => {
    fetchStub.resolves(jsonResponse([], 200, { 'Total-registros': '0' }));
    await api.findPatientAppointments(0, 20, { idTipoDocumento: id, numero: 'ABC', idClinica: id });
    const url = new URL(fetchStub.firstCall.args[0]);
    expect(url.pathname).to.equal('/GalenosSV/resources/v2/paciente/citas');
    expect(url.searchParams.get('numero')).to.equal('ABC');
    expect(fetchStub.firstCall.args[1].cache).to.equal('no-store');
  });
  it('rechaza rangos invertidos antes de llamar al backend', async () => {
    const error = await rejection(api.findPatientAppointments(0, 20, { idTipoDocumento: id, numero: 'ABC', idClinica: id, fechaDesde: '2026-12-02', fechaHasta: '2026-12-01' }));
    expect(error.type).to.equal('validation');
    expect(fetchStub.called).to.equal(false);
  });
  it('publica descarga ticket PDF como Blob bajo contrato explícito', async () => {
    fetchStub.resolves(new Response(new Blob(['%PDF-demo']), { headers: { 'Content-Type': 'application/pdf' } }));
    const response = await api.getTicket(id, { idTipoDocumento: id, numero: 'ABC', idClinica: id });
    expect(response.datos).to.be.instanceOf(Blob);
    expect(new URL(fetchStub.firstCall.args[0]).pathname).to.include('/ticket');
  });
  it('envía una atención transaccional con paso, acción y exámenes explícitos', async () => {
    fetchStub.resolves(jsonResponse({ idConsulta: id, accion: 'GUARDAR_PARCIAL', estado: 'EN_CURSO', idConsultaProcedimientoPaso: id, idPasoActual: id, finalizada: false }));
    const result = await api.register({ idConsulta: id, idPersona: id, idClinica: id, idRol: id, idConsultaProcedimientoPaso: id, accion: 'GUARDAR_PARCIAL', valor: 'Registro sintético', examenes: [] });
    expect(fetchStub.firstCall.args[1].method).to.equal('POST');
    expect(JSON.parse(fetchStub.firstCall.args[1].body).accion).to.equal('GUARDAR_PARCIAL');
    expect(result.datos.estado).to.equal('EN_CURSO');
  });
});
