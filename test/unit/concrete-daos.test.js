import { expect } from 'chai';
import sinon from 'sinon';
import { TipoDocumentoDAO, ConsultaDAO, createApiConfig } from '../../src/js/index.js';
import { rejection } from '../helpers/http-fixture.js';

describe('Contratos deshabilitados explícitamente en configuración', () => {
  [TipoDocumentoDAO, ConsultaDAO].forEach(DAO => {
    const operations = {
      findRange: dao => dao.findRange(0, 5), findById: dao => dao.findById('fixture'),
      create: dao => dao.create({}), update: dao => dao.update('fixture', {}), deleteById: dao => dao.deleteById('fixture')
    };
    Object.keys(operations).forEach(operation => {
      it(`${DAO.name}.${operation} informa la dependencia sin enviar solicitudes`, async () => {
        const fetchStub = sinon.stub();
        const config = createApiConfig({ routes: { tipoDocumento: { status: 'pending' }, consulta: { status: 'pending' } } });
        const dao = new DAO({ config, fetchImpl: fetchStub, resource: 'ignorado' });
        expect((await rejection(operations[operation](dao))).code).to.equal('CONTRACT_PENDING');
        sinon.assert.notCalled(fetchStub);
      });
    });
  });
});
