import { expect } from 'chai';
import sinon from 'sinon';
import CatalogoControl from '../../src/js/control/CatalogoControl.js';
import { DefaultResponse, DefaultError } from '../../src/js/index.js';
const row = { idTipoDocumento: '00000000-0000-4000-8000-000000000001', nombre: 'Sintético', activo: true };
const response = datos => new DefaultResponse({ datos, status: 200, totalDatos: Array.isArray(datos) ? datos.length : null });

describe('Gestión de catálogos — coordinación unitaria sintética', () => {
  let dao, control;
  beforeEach(() => {
    dao = { findRange: sinon.stub().resolves(response([row])), findById: sinon.stub().resolves(response(row)),
      create: sinon.stub().resolves(response(row)), update: sinon.stub().resolves(response(row)) };
    control = new CatalogoControl({ daos: { tipoDocumento: dao }, contexto: { actor: 'Prueba', puedeEscribir: true } });
  });
  afterEach(() => control.destroy());
  it('guardar crea mediante DAO y recarga el listado sin duplicar reglas de negocio', async () => {
    control.create();await control.save({ nombre: 'Sintético' });
    sinon.assert.calledOnceWithExactly(dao.create, { nombre: 'Sintético' });
    sinon.assert.calledOnce(dao.findRange);expect(control.state.editor).to.equal(null);expect(control.state.rows).to.deep.equal([row]);
  });
  it('edición recupera el registro vigente y conserva su UUID al actualizar', async () => {
    await control.edit(row.idTipoDocumento);await control.save({ nombre: 'Cambio' });
    sinon.assert.calledOnceWithExactly(dao.update, row.idTipoDocumento, { nombre: 'Cambio' });sinon.assert.notCalled(dao.create);
  });
  it('error de persistencia conserva el formulario y no simula éxito ni recarga', async () => {
    const error = new Error('Fallo sintético');dao.create.rejects(error);control.create();await control.save({ nombre: 'Prueba' });
    expect(control.state.error).to.equal(error);expect(control.state.editor).to.equal('create');expect(control.state.message).to.equal('');sinon.assert.notCalled(dao.findRange);
  });
  it('impide doble envío y cierre del formulario durante una escritura pendiente', async () => {
    let finish;dao.create.returns(new Promise(resolve => { finish = resolve; }));control.create();
    const pending = control.save({ nombre: 'Prueba' });await control.save({ nombre: 'Duplicado' });control.cancel();
    expect(control.state.editor).to.equal('create');sinon.assert.calledOnce(dao.create);finish(response(row));await pending;
  });
  it('sesión de lectura no persiste aunque se invoque el Control directamente', async () => {
    control.set({ contexto: { puedeEscribir: false } });control.create();expect(control.state.editor).to.equal(null);
    let error;try { await control.save({ nombre: 'Prueba' }); } catch (caught) { error = caught; }
    expect(error).to.be.instanceOf(DefaultError);sinon.assert.notCalled(dao.create);
  });
  it('ignora una lectura tardía anterior aunque el transporte no respete AbortController', async () => {
    let finish;dao.findRange.onFirstCall().returns(new Promise(resolve => { finish = resolve; }));
    const pending = control.load();await control.load({ nombre: 'vigente' });finish(response([]));await pending;
    expect(control.state.rows).to.deep.equal([row]);expect(control.state.nombre).to.equal('vigente');
  });
});
