import { expect } from 'chai';
import { DefaultResponse, DefaultError } from '../../src/js/index.js';

describe('Tipos compartidos del cliente', () => {
  it('no confunde tamaño de página con total de registros', () => {
    const response = new DefaultResponse({ datos: [{ id: 'fixture' }], status: 200 });
    expect(response.totalDatos).to.equal(null);
  });

  it('lee cabeceras sin distinguir mayúsculas y preserva metadatos', () => {
    const response = new DefaultResponse({ datos: null, totalDatos: 0, status: 204, headers: { Location: '/fixture/1' }, metadata: { operation: 'create' } });
    expect(response.getHeader('LOCATION')).to.equal('/fixture/1');
    expect(response.getHeader('missing')).to.equal(null);
    expect(response.totalDatos).to.equal(0);
    expect(response.metadata.operation).to.equal('create');
    expect(Object.isFrozen(response.headers)).to.equal(true);
    expect(Object.isFrozen(response)).to.equal(true);
  });

  it('no confunde propiedades heredadas con cabeceras recibidas', () => {
    const response = new DefaultResponse({ status: 200 });
    expect(response.getHeader('constructor')).to.equal(null);
    expect(response.getHeader('__proto__')).to.equal(null);
    const explicit = new DefaultResponse({ status: 200, headers: { constructor: 'valor sintético' } });
    expect(explicit.getHeader('constructor')).to.equal('valor sintético');
  });

  [-1, NaN, 2.2, '2', Number.MAX_SAFE_INTEGER + 1].forEach(total => {
    it(`rechaza total inválido ${total}`, () => {
      expect(() => new DefaultResponse({ totalDatos: total, status: 200 })).to.throw(DefaultError);
    });
  });

  it('expone datos/totalDatos al serializar y conserva alias de lectura locales', () => {
    const response = new DefaultResponse({ datos: [], totalDatos: 7, status: 200 });
    expect(response.data).to.equal(response.datos);
    expect(response.total).to.equal(response.totalDatos);
    expect(JSON.parse(JSON.stringify(response))).to.include({ totalDatos: 7 });
    expect(Object.keys(response)).not.to.include('data');
    expect(Object.keys(response)).not.to.include('total');
    expect(() => { response.data = []; }).to.throw(TypeError);
  });

  it('conserva causa y detalles sin serializar la causa ni el stack', () => {
    const cause = new Error('detalle técnico');
    const error = new DefaultError({ type: 'http', code: 'HTTP_ERROR', message: 'HTTP 422', status: 422, details: { field: 'fixture' }, cause });
    expect(error).to.be.instanceOf(Error);
    expect(error.cause).to.equal(cause);
    expect(error.toJSON()).to.include({ type: 'http', status: 422 });
    expect(error.toJSON()).not.to.have.property('cause');
    expect(error.toJSON()).not.to.have.property('stack');
  });
});
