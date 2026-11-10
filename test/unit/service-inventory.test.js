import { expect } from 'chai';
import sinon from 'sinon';
import * as api from '../../src/js/index.js';
import { rejection } from '../helpers/http-fixture.js';

// Inventario independiente de las exportaciones para detectar omisiones o claves cruzadas.
const inventory = [
  ['ClinicaService', 'clinica'],
  ['ConsultaService', 'consulta'],
  ['ConsultaProcedimientoService', 'consultaProcedimiento'],
  ['ConsultaProcedimientoPasoService', 'consultaProcedimientoPaso'],
  ['DocumentoService', 'documento'],
  ['ExamenService', 'examen'],
  ['ExamenResultadoService', 'examenResultado'],
  ['ExamenTipoExamenService', 'examenTipoExamen'],
  ['MedioContactoService', 'medioContacto'],
  ['OrdenExamenService', 'ordenExamen'],
  ['PersonaService', 'persona'],
  ['PersonaRolService', 'personaRol'],
  ['ProcedimientoService', 'procedimiento'],
  ['ProcedimientoPasoService', 'procedimientoPaso'],
  ['ProcedimientoPasoExamenService', 'procedimientoPasoExamen'],
  ['ProcedimientoPasoSecuenciaService', 'procedimientoPasoSecuencia'],
  ['RolService', 'rol'],
  ['TipoDocumentoService', 'tipoDocumento'],
  ['TipoExamenService', 'tipoExamen'],
  ['TipoMedioContactoService', 'tipoMedioContacto'],
];
const confirmed = ['clinica', 'consulta', 'tipoDocumento'];
const blockedCalls = {
  findRange: (service) => [service.findRange(0, 2), service.findRange(-1, 0)],
  findById: (service) => [
    service.findById('00000000-0000-4000-8000-000000000001'),
    service.findById(null),
  ],
  create: (service) => [service.create({}), service.create(null)],
  update: (service) => [
    service.update('00000000-0000-4000-8000-000000000001', {}),
    service.update(null, null),
  ],
  deleteById: (service) => [
    service.deleteById('00000000-0000-4000-8000-000000000001'),
    service.deleteById(null),
  ],
};

describe('Inventario completo de 20 Service', () => {
  it('exporta exactamente un Service por entidad y registra las mismas 20 claves', () => {
    const exported = Object.keys(api).filter(
      (name) => name.endsWith('Service') && name !== 'DefaultService',
    );
    expect(exported.sort()).to.deep.equal(inventory.map(([name]) => name).sort());
    expect(Object.keys(api.API_ROUTES).sort()).to.deep.equal(
      inventory.map(([, key]) => key).sort(),
    );
  });

  it('solo declara las cinco operaciones REST publicadas en API 0.2', () => {
    const operations = Object.keys(api.API_ROUTES).reduce(
      (all, key) =>
        all.concat(
          Object.keys(api.API_ROUTES[key].operations).map((operation) => `${key}.${operation}`),
        ),
      [],
    );
    expect(operations.sort()).to.deep.equal([
      'clinica.findRange',
      'consulta.findById',
      'consulta.findRange',
      'tipoDocumento.findById',
      'tipoDocumento.findRange',
    ]);
  });

  inventory.forEach(([name, resource]) => {
    describe(name, () => {
      it('selecciona su recurso y hereda el transporte sin aceptar una clave cruzada', () => {
        const fetchImpl = sinon.stub();
        const config = api.createApiConfig({
          baseUrl: 'https://fixture.invalid/api/',
          timeoutMs: 4321,
        });
        const service = new api[name]({ config, fetchImpl, resource: 'otra-entidad' });
        expect(service).to.be.instanceOf(api.DefaultService);
        expect(service.resource).to.equal(resource);
        expect(service.config.baseUrl).to.equal(config.baseUrl);
        expect(service.config.timeoutMs).to.equal(4321);
        expect(service.fetchImpl).to.equal(fetchImpl);
        sinon.assert.notCalled(fetchImpl);
      });

      it('rechaza configuración y Fetch inválidos sin enviar solicitudes', () => {
        expect(() => new api[name]({ fetchImpl: null })).to.throw(api.DefaultError);
        expect(() => new api[name]({ config: { timeoutMs: 0 } })).to.throw(api.DefaultError);
      });

      if (!confirmed.includes(resource)) {
        it('declara contrato pendiente sin URL, métodos HTTP ni DTO inferido de JPA', () => {
          const contract = api.API_ROUTES[resource];
          expect(contract.status).to.equal('pending');
          expect(contract.operations).to.deep.equal({});
          expect(contract).not.to.have.property('path');
          expect(contract.reason).to.be.a('string').and.not.to.equal('');
          expect(Object.isFrozen(contract.operations)).to.equal(true);
        });

        Object.keys(blockedCalls).forEach((operation) => {
          it(`${operation} rechaza parámetros válidos e inválidos con CONTRACT_PENDING, sin HTTP`, async () => {
            const fetchImpl = sinon.stub();
            const service = new api[name]({
              config: api.createApiConfig({ baseUrl: 'https://fixture.invalid/api/' }),
              fetchImpl,
            });
            const promises = blockedCalls[operation](service);
            const errors = await Promise.all(promises.map(rejection));
            errors.forEach((error) => {
              expect(error).to.be.instanceOf(api.DefaultError);
              expect(error).to.include({
                type: 'validation',
                code: 'CONTRACT_PENDING',
                status: null,
              });
            });
            sinon.assert.notCalled(fetchImpl);
          });
        });
      }
    });
  });
});
