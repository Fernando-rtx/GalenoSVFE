import { expect } from 'chai';
import sinon from 'sinon';
import * as api from '../../src/js/index.js';
import { rejection } from '../helpers/http-fixture.js';

// Inventario independiente de las exportaciones para detectar omisiones o claves cruzadas.
const inventory = [
  ['ClinicaDAO', 'clinica'], ['ConsultaDAO', 'consulta'],
  ['ConsultaProcedimientoDAO', 'consultaProcedimiento'],
  ['ConsultaProcedimientoPasoDAO', 'consultaProcedimientoPaso'],
  ['DocumentoDAO', 'documento'], ['ExamenDAO', 'examen'],
  ['ExamenResultadoDAO', 'examenResultado'], ['ExamenTipoExamenDAO', 'examenTipoExamen'],
  ['MedioContactoDAO', 'medioContacto'], ['OrdenExamenDAO', 'ordenExamen'],
  ['PersonaDAO', 'persona'], ['PersonaRolDAO', 'personaRol'],
  ['ProcedimientoDAO', 'procedimiento'], ['ProcedimientoPasoDAO', 'procedimientoPaso'],
  ['ProcedimientoPasoExamenDAO', 'procedimientoPasoExamen'],
  ['ProcedimientoPasoSecuenciaDAO', 'procedimientoPasoSecuencia'],
  ['RolDAO', 'rol'], ['TipoDocumentoDAO', 'tipoDocumento'],
  ['TipoExamenDAO', 'tipoExamen'], ['TipoMedioContactoDAO', 'tipoMedioContacto']
];
const confirmed = ['clinica', 'consulta', 'tipoDocumento'];
const blockedCalls = {
  findRange: dao => [dao.findRange(0, 2), dao.findRange(-1, 0)],
  findById: dao => [dao.findById('00000000-0000-4000-8000-000000000001'), dao.findById(null)],
  create: dao => [dao.create({}), dao.create(null)],
  update: dao => [dao.update('00000000-0000-4000-8000-000000000001', {}), dao.update(null, null)],
  deleteById: dao => [dao.deleteById('00000000-0000-4000-8000-000000000001'), dao.deleteById(null)]
};

describe('Inventario completo de 20 DAO', () => {
  it('exporta exactamente un DAO por entidad y registra las mismas 20 claves', () => {
    const exported = Object.keys(api).filter(name => name.endsWith('DAO') && name !== 'DefaultDAO');
    expect(exported.sort()).to.deep.equal(inventory.map(([name]) => name).sort());
    expect(Object.keys(api.API_ROUTES).sort()).to.deep.equal(inventory.map(([, key]) => key).sort());
  });

  it('solo declara las cinco operaciones REST publicadas en API 0.2', () => {
    const operations = Object.keys(api.API_ROUTES).reduce((all, key) => all.concat(
      Object.keys(api.API_ROUTES[key].operations).map(operation => `${key}.${operation}`)
    ), []);
    expect(operations.sort()).to.deep.equal([
      'clinica.findRange', 'consulta.findById', 'consulta.findRange',
      'tipoDocumento.findById', 'tipoDocumento.findRange'
    ]);
  });

  inventory.forEach(([name, resource]) => {
    describe(name, () => {
      it('selecciona su recurso y hereda el transporte sin aceptar una clave cruzada', () => {
        const fetchImpl = sinon.stub();
        const config = api.createApiConfig({ baseUrl: 'https://fixture.invalid/api/', timeoutMs: 4321 });
        const dao = new api[name]({ config, fetchImpl, resource: 'otra-entidad' });
        expect(dao).to.be.instanceOf(api.DefaultDAO);
        expect(dao.resource).to.equal(resource);
        expect(dao.config.baseUrl).to.equal(config.baseUrl);
        expect(dao.config.timeoutMs).to.equal(4321);
        expect(dao.fetchImpl).to.equal(fetchImpl);
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

        Object.keys(blockedCalls).forEach(operation => {
          it(`${operation} rechaza parámetros válidos e inválidos con CONTRACT_PENDING, sin HTTP`, async () => {
            const fetchImpl = sinon.stub();
            const dao = new api[name]({ config: api.createApiConfig({ baseUrl: 'https://fixture.invalid/api/' }), fetchImpl });
            const promises = blockedCalls[operation](dao);
            const errors = await Promise.all(promises.map(rejection));
            errors.forEach(error => {
              expect(error).to.be.instanceOf(api.DefaultError);
              expect(error).to.include({ type: 'validation', code: 'CONTRACT_PENDING', status: null });
            });
            sinon.assert.notCalled(fetchImpl);
          });
        });
      }
    });
  });
});
