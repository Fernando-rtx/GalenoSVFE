import { expect } from 'chai';
import sinon from 'sinon';
import AtencionPacienteService from '../../src/js/control/AtencionPacienteService.js';
import ConsultaService from '../../src/js/control/ConsultaService.js';
import AtencionCitaService from '../../src/js/control/AtencionCitaService.js';
import { createApiConfig } from '../../src/js/control/api-config.js';
import { API_V2_ROUTES } from '../../src/js/control/api-v2-routes.js';
const id = '00000000-0000-4000-8000-000000000001';
suite('Servicios de recepción: transporte sintético con asignación', () => {
  let config, fetchImpl;
  setup(() => {
    config = createApiConfig({ baseUrl: 'https://fixture.invalid/', routes: API_V2_ROUTES });
    fetchImpl = sinon.stub();
  });
  test('AtencionPacienteService crea mediante REST con clínica, sesión y asignación', async () => {
    const data = { nombres: 'Persona', apellidos: 'Sintética', fechaNacimiento: '2000-01-01T18:00:00Z', idTipoDocumento: id, documento: 'ACADTEST001' };
    fetchImpl.resolves(new Response(JSON.stringify({ idPersonaRol: id, idPersona: id, idClinica: id, nombres: 'Persona', apellidos: 'Sintética', rolNombre: 'Paciente' }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    const service = new AtencionPacienteService({ config, fetchImpl });
    const result = await service.create(data, { query: { idClinica: id }, headers: { Authorization: 'Bearer sesion-sintetica', 'X-Persona-Rol': id } });
    const [url, options] = fetchImpl.firstCall.args;
    expect(new URL(url).pathname).to.equal('/v2/empleado/paciente');
    expect(new URL(url).searchParams.get('idClinica')).to.equal(id);
    expect(new Headers(options.headers).get('X-Persona-Rol')).to.equal(id);
    expect(new Headers(options.headers).get('Authorization')).to.equal('Bearer sesion-sintetica');
    expect(options.cache).to.equal('no-store');
    expect(JSON.parse(options.body)).to.deep.equal(data);
    expect(result.datos.idPersonaRol).to.equal(id);
  });
  test('ConsultaService envía estado y fechas juntos, conservando el total del backend', async () => {
    fetchImpl.resolves(new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json', 'Total-registros': '3' } }));
    const service = new ConsultaService({ config, fetchImpl });
    const query = { idClinica: id, estadoAtencion: 'FINALIZADAS', fechaDesde: '2026-11-01', fechaHasta: '2026-11-30' };
    const result = await service.findRange(10, 10, { query });
    const params = new URL(fetchImpl.firstCall.args[0]).searchParams;
    expect(params.get('estadoAtencion')).to.equal('FINALIZADAS');
    expect(params.get('fechaDesde')).to.equal('2026-11-01');
    expect(params.get('first')).to.equal('10');
    expect(result.totalDatos).to.equal(3);
  });
  test('ConsultaService rechaza estados de atención desconocidos antes de Fetch', async () => {
    const service = new ConsultaService({ config, fetchImpl });
    try {
      await service.findRange(0, 10, { query: { idClinica: id, estadoAtencion: 'CANCELADA' } });
      expect.fail('Debía rechazar el estado');
    } catch (error) { expect(error.type).to.equal('validation'); }
    sinon.assert.notCalled(fetchImpl);
  });
  test('AtencionCitaService propaga un conflicto sin devolver una cita exitosa', async () => {
    fetchImpl.resolves(new Response(JSON.stringify({ mensaje: 'Conflicto sintético' }), { status: 409, headers: { 'Content-Type': 'application/json' } }));
    const service = new AtencionCitaService({ config, fetchImpl });
    const data = { idPersonaRol: id, idProcedimiento: id, fechaInicio: '2026-11-17T16:00:00Z', fechaFin: null, referenciaExterna: null, observaciones: null };
    try {
      await service.create(data, { query: { idClinica: id } });
      expect.fail('Debía rechazar el conflicto');
    } catch (error) { expect(error.status).to.equal(409); }
    expect(new URL(fetchImpl.firstCall.args[0]).pathname).to.equal('/v2/empleado/cita');
    sinon.assert.calledOnce(fetchImpl);
  });
});
