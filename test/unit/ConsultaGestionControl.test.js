import { expect } from 'chai';
import sinon from 'sinon';
import ConsultaGestionControl from '../../src/js/control/ConsultaGestionControl.js';
import { DefaultResponse } from '../../src/js/index.js';
const id = '00000000-0000-4000-8000-000000001001';
const response = (datos) =>
  new DefaultResponse({
    datos,
    status: 200,
    totalDatos: Array.isArray(datos) ? datos.length : null,
  });
describe('Consulta de gestión — coordinación unitaria sintética', () => {
  let dashboard, service, control;
  beforeEach(() => {
    dashboard = {
      state: { consultas: [] },
      subscribe: (listener) => {
        listener({ idClinica: 'clinica-sintetica', detalle: null });
        return () => {};
      },
      loadConsultas: sinon.stub().resolves(),
      openConsulta: sinon.stub().resolves(),
    };
    service = {
      create: sinon.stub().resolves(response({ idConsulta: id })),
      update: sinon.stub().resolves(response({ idConsulta: id })),
      get: sinon.stub().resolves(response([])),
      findRange: sinon.stub().resolves(response([])),
    };
    control = new ConsultaGestionControl({
      dashboard,
      consultaService: service,
      asociacionService: service,
      pasoService: service,
      pacienteService: service,
      procedimientoService: service,
    });
  });
  afterEach(() => control.destroy());
  it('crea y recupera por UUID la consulta guardada sin eliminar los filtros del dashboard', async () => {
    await control.editConsulta(true);
    await control.save({ idPersonaRol: 'paciente' });
    sinon.assert.calledOnceWithExactly(
      service.create,
      { idPersonaRol: 'paciente' },
      { query: { idClinica: 'clinica-sintetica' } },
    );
    sinon.assert.calledOnce(dashboard.loadConsultas);
    sinon.assert.calledOnceWithExactly(dashboard.openConsulta, id);
    expect(control.state.editor).to.equal(null);
  });
  it('un fallo HTTP conserva el formulario y no comunica éxito', async () => {
    const error = new Error('Fallo sintético');
    service.create.rejects(error);
    await control.editConsulta(true);
    await control.save({});
    expect(control.state.error).to.equal(error);
    expect(control.state.editor).to.equal('consulta');
    sinon.assert.notCalled(dashboard.loadConsultas);
  });
  it('actualiza un paso con su responsable y asociación existentes, sin crear otro paso', async () => {
    const step = { idConsultaProcedimientoPaso: id };
    control.editStep(step);
    await control.save({ estado: 'EN_CURSO' });
    sinon.assert.calledOnceWithExactly(
      service.update,
      id,
      { estado: 'EN_CURSO' },
      { query: { idClinica: 'clinica-sintetica' } },
    );
    sinon.assert.notCalled(service.create);
  });
  it('busca pacientes mediante PersonaRolService y el contexto de clínica', async () => {
    await control.searchPatients('Persona');
    sinon.assert.calledOnce(service.get);
    expect(service.get.firstCall.args[0].query).to.deep.equal({
      idClinica: 'clinica-sintetica',
      buscar: 'Persona',
    });
  });
});
