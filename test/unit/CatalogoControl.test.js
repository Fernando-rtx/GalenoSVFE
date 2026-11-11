import { expect } from 'chai';
import sinon from 'sinon';
import CatalogoControl from '../../src/js/control/CatalogoControl.js';
import { DefaultResponse, DefaultError } from '../../src/js/index.js';
const row = {
  idTipoDocumento: '00000000-0000-4000-8000-000000000001',
  nombre: 'Sintético',
  activo: true,
};
const response = (datos) =>
  new DefaultResponse({
    datos,
    status: 200,
    totalDatos: Array.isArray(datos) ? datos.length : null,
  });

describe('Gestión de catálogos — coordinación unitaria sintética', () => {
  let service, control;
  beforeEach(() => {
    service = {
      findRange: sinon.stub().resolves(response([row])),
      findById: sinon.stub().resolves(response(row)),
      create: sinon.stub().resolves(response(row)),
      update: sinon.stub().resolves(response(row)),
    };
    control = new CatalogoControl({
      services: { tipoDocumento: service },
    });
  });
  afterEach(() => control.destroy());
  it('guardar crea mediante Service y recarga el listado sin duplicar reglas de negocio', async () => {
    control.create();
    await control.save({ nombre: 'Sintético' });
    sinon.assert.calledOnceWithExactly(service.create, { nombre: 'Sintético' });
    sinon.assert.calledOnce(service.findRange);
    expect(control.state.editor).to.equal(null);
    expect(control.state.rows).to.deep.equal([row]);
  });
  it('edición recupera el registro vigente y conserva su UUID al actualizar', async () => {
    await control.edit(row.idTipoDocumento);
    await control.save({ nombre: 'Cambio' });
    sinon.assert.calledOnceWithExactly(service.update, row.idTipoDocumento, { nombre: 'Cambio' });
    sinon.assert.notCalled(service.create);
  });
  it('error de persistencia conserva el formulario y no simula éxito ni recarga', async () => {
    const error = new Error('Fallo sintético');
    service.create.rejects(error);
    control.create();
    await control.save({ nombre: 'Prueba' });
    expect(control.state.error).to.equal(error);
    expect(control.state.editor).to.equal('create');
    expect(control.state.message).to.equal('');
    sinon.assert.notCalled(service.findRange);
  });
  it('impide doble envío y cierre del formulario durante una escritura pendiente', async () => {
    let finish;
    service.create.returns(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    control.create();
    const pending = control.save({ nombre: 'Prueba' });
    await control.save({ nombre: 'Duplicado' });
    control.cancel();
    expect(control.state.editor).to.equal('create');
    sinon.assert.calledOnce(service.create);
    finish(response(row));
    await pending;
  });
  it('ignora una lectura tardía anterior aunque el transporte no respete AbortController', async () => {
    let finish;
    service.findRange.onFirstCall().returns(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const pending = control.load();
    await control.load({ nombre: 'vigente' });
    finish(response([]));
    await pending;
    expect(control.state.rows).to.deep.equal([row]);
    expect(control.state.nombre).to.equal('vigente');
  });
});
