import { expect } from 'chai';
import { DefaultDAO, DefaultError, TipoDocumentoDAO, ConsultaDAO, ClinicaDAO } from '../../src/js/index.js';
import { appendQuery } from '../../src/js/control/query-parameters.js';

export function validateIntegrationEnvironment({ config, cases }) {
  if (!config || !config.baseUrl || !Array.isArray(cases) || cases.length === 0) {
    throw new Error('Faltan URL y casos explícitos de integración.');
  }
  cases.forEach(testCase => {
    const resource = Object.prototype.hasOwnProperty.call(config.routes, testCase.resource) ? config.routes[testCase.resource] : null;
    if (!resource || resource.status !== 'verified' || !resource.source || !resource.operations || Object.keys(resource.operations).length === 0) {
      throw new Error(`Contrato no verificado para ${testCase.resource}.`);
    }
    const operations = resource.operations;
    if (operations.findRange) appendQuery(new URL(config.baseUrl), testCase.query, operations.findRange);
    if (operations.findById) {
      appendQuery(new URL(config.baseUrl), testCase.detailQuery || testCase.query, operations.findById);
      if (operations.findById.validateId && !operations.findById.validateId(testCase.id)) throw new Error('Falta un UUID válido para el detalle.');
    }
    if (operations.findRange && (!Number.isSafeInteger(testCase.first) || testCase.first < 0 || !Number.isSafeInteger(testCase.max) || testCase.max < 1)) {
      throw new Error(`Configura first y max válidos para ${testCase.resource}.`);
    }
    if (operations.findById && testCase.id === undefined) throw new Error(`Falta un ID de prueba de ${testCase.resource}.`);
    if (testCase.missingId !== undefined && (!operations.findById || !Number.isInteger(testCase.missingStatus) || testCase.missingStatus < 400 || testCase.missingStatus > 599)) {
      throw new Error('missingId requiere un estado HTTP de error confirmado y findById.');
    }
    if (testCase.write && (!['create', 'findById', 'update', 'deleteById'].every(key => operations[key]) ||
        typeof testCase.write.idFromResponse !== 'function' || typeof testCase.write.assertUpdated !== 'function' ||
        !testCase.write.createData || !testCase.write.updateData)) {
      throw new Error('El ciclo de escritura requiere CRUD confirmado, payloads reales, extracción del ID y assertUpdated.');
    }
    if (!operations.findRange && !operations.findById && !testCase.write) {
      throw new Error(`No hay casos ejecutables para ${testCase.resource}.`);
    }
  });
}

// La misma suite se ejecuta en Node y en BrowserSync. No importa Sinon ni fixtures.
export function registerIntegrationSuite(environment) {
  validateIntegrationEnvironment(environment);
  const { config, cases } = environment;
  describe('Backend REST real (sin mocks)', function () {
    this.timeout(config.timeoutMs + 2000);
    cases.forEach(testCase => {
      describe(testCase.resource, () => {
        const factories = { tipoDocumento: TipoDocumentoDAO, consulta: ConsultaDAO, clinica: ClinicaDAO };
        const DAO = Object.prototype.hasOwnProperty.call(factories, testCase.resource) ? factories[testCase.resource] : DefaultDAO;
        const dao = new DAO({ resource: testCase.resource, config });
        const operations = config.routes[testCase.resource].operations;
        const options = { query: testCase.query };
        const detailOptions = { query: testCase.detailQuery || testCase.query };
        let createdId;
        let cleanupRequired = false;

        after(async () => {
          if (cleanupRequired) await dao.deleteById(createdId);
        });

        if (operations.findRange) {
          it('consulta una página con Fetch real y lee su total cuando está disponible', async () => {
            const response = await dao.findRange(testCase.first, testCase.max, options);
            expect(response.datos).to.be.an('array');
            expect(response.datos.length).to.be.at.most(testCase.max);
            if (response.totalDatos !== null) expect(response.totalDatos).to.be.at.least(response.datos.length);
          });
        }
        if (operations.findById) {
          it('consulta un identificador real del entorno de pruebas', async () => {
            const response = await dao.findById(testCase.id, detailOptions);
            expect(response.datos).not.to.equal(null);
          });
        }
        if (testCase.missingId !== undefined) {
          it('conserva el estado confirmado para un ID inexistente', async () => {
            let error;
            try { await dao.findById(testCase.missingId, detailOptions); } catch (cause) { error = cause; }
            expect(error).to.be.instanceOf(DefaultError);
            expect(error.type).to.equal('http');
            expect(error.status).to.equal(testCase.missingStatus);
          });
        }
        if (testCase.write) {
          it('crea, consulta, actualiza, vuelve a consultar y elimina datos de prueba', async () => {
            const response = await dao.create(testCase.write.createData);
            createdId = testCase.write.idFromResponse(response);
            expect(createdId, 'idFromResponse debe permitir limpiar el registro creado').not.to.equal(undefined);
            expect(createdId).not.to.equal(null);
            cleanupRequired = true;
            await dao.findById(createdId);
            await dao.update(createdId, testCase.write.updateData);
            const updated = await dao.findById(createdId);
            testCase.write.assertUpdated(updated);
            await dao.deleteById(createdId);
            cleanupRequired = false;
          });
        }
      });
    });
  });
}
