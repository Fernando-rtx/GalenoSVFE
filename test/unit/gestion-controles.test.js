import { expect } from 'chai';
import sinon from 'sinon';
import PersonaControl from '../../src/js/control/PersonaControl.js';
import ProcedimientoControl from '../../src/js/control/ProcedimientoControl.js';
import RelacionControl from '../../src/js/control/RelacionControl.js';

suite('Controles de gestión: cancelación y relaciones sintéticas', () => {
  let control;
  teardown(() => control?.destroy());

  test('PersonaControl ignora una respuesta anterior que llega después de la búsqueda actual', async () => {
    let finishOld;
    const persona = { findRange: sinon.stub() };
    persona.findRange.onFirstCall().returns(new Promise(resolve => { finishOld = resolve; }));
    persona.findRange.onSecondCall().resolves({ datos: [{ idPersona: 'actual' }], totalDatos: 1 });
    control = new PersonaControl({ services: { persona } });
    const old = control.load({ nombres: 'anterior' });
    await control.load({ nombres: 'actual' });
    finishOld({ datos: [{ idPersona: 'anterior' }], totalDatos: 1 });
    await old;
    expect(control.state.rows).to.deep.equal([{ idPersona: 'actual' }]);
    expect(persona.findRange.firstCall.args[2].signal.aborted).to.equal(true);
  });

  test('PersonaControl conserva el editor y el error si el guardado es rechazado', async () => {
    const error = { status: 403, message: 'Sin permiso sintético' };
    const persona = { create: sinon.stub().rejects(error) };
    control = new PersonaControl({ services: { persona } });
    await control.edit('persona');
    await control.save({ nombres: 'Persona sintética' });
    expect(control.state.editor).to.deep.equal({ kind: 'persona', data: null });
    expect(control.state.error).to.equal(error);
    expect(control.state.message).to.equal('');
    expect(control.state.writing).to.equal(false);
  });

  test('ProcedimientoControl cancela la carga de opciones al cerrar el editor', async () => {
    let finish;
    const pasoService = { findRange: sinon.stub().resolves({ datos: [], totalDatos: 0 }) };
    const rolService = { findRange: sinon.stub().returns(new Promise(resolve => { finish = resolve; })) };
    const examenService = { findRange: sinon.stub().resolves({ datos: [], totalDatos: 0 }) };
    control = new ProcedimientoControl({ pasoService, rolService, examenService });
    await control.open({ idProcedimiento: 'plantilla' });
    const loading = control.edit();
    control.cancel();
    finish({ datos: [{ idRol: 'rol-que-ya-no-corresponde' }], totalDatos: 1 });
    await loading;
    expect(control.state.editor).to.equal(null);
    expect(control.state.roles).to.deep.equal([]);
    expect(rolService.findRange.firstCall.args[2].signal.aborted).to.equal(true);
  });

  test('RelacionControl conserva el padre al guardar y evita envíos duplicados', async () => {
    let finish;
    const link = { findRange: sinon.stub().resolves({ datos: [], totalDatos: 0 }), create: sinon.stub().returns(new Promise(resolve => { finish = resolve; })) };
    const examen = { findRange: sinon.stub().resolves({ datos: [], totalDatos: 0 }) };
    control = new RelacionControl({ services: { procedimientoPasoExamen: link, examen } });
    await control.open('procedimientoPasoExamen', { idProcedimientoPaso: 'paso-autorizado' });
    control.edit();
    const save = control.save({ idProcedimientoPaso: 'otro-paso', idExamen: 'hemograma', activo: true });
    await control.save({ idExamen: 'hemograma', activo: true });
    sinon.assert.calledOnceWithExactly(link.create, { idProcedimientoPaso: 'paso-autorizado', idExamen: 'hemograma', activo: true });
    finish({ datos: {} });
    await save;
    expect(control.state.editor).to.equal(null);
    expect(control.state.writing).to.equal(false);
  });
});
