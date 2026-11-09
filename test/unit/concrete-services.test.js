import { expect } from 'chai';
import sinon from 'sinon';
import { TipoDocumentoService, ConsultaService, createApiConfig } from '../../src/js/index.js';
import { rejection } from '../helpers/http-fixture.js';

describe('Contratos deshabilitados explícitamente en configuración', () => {
  [TipoDocumentoService, ConsultaService].forEach((Service) => {
    const operations = {
      findRange: (service) => service.findRange(0, 5),
      findById: (service) => service.findById('fixture'),
      create: (service) => service.create({}),
      update: (service) => service.update('fixture', {}),
      deleteById: (service) => service.deleteById('fixture'),
    };
    Object.keys(operations).forEach((operation) => {
      it(`${Service.name}.${operation} informa la dependencia sin enviar solicitudes`, async () => {
        const fetchStub = sinon.stub();
        const config = createApiConfig({
          routes: { tipoDocumento: { status: 'pending' }, consulta: { status: 'pending' } },
        });
        const service = new Service({ config, fetchImpl: fetchStub, resource: 'ignorado' });
        expect((await rejection(operations[operation](service))).code).to.equal('CONTRACT_PENDING');
        sinon.assert.notCalled(fetchStub);
      });
    });
  });
});
