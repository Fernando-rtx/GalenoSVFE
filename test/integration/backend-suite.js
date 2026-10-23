import { expect } from 'chai';
import { DefaultDAO, DefaultResponse, DefaultError, TipoDocumentoDAO, ConsultaDAO, ClinicaDAO } from '../../src/js/index.js';
import { appendQuery } from '../../src/js/control/query-parameters.js';

function validatePage(testCase, contract, baseUrl) {
  if (!Number.isSafeInteger(testCase.first) || testCase.first < 0 || !Number.isSafeInteger(testCase.max) || testCase.max < 1 ||
      (contract.validateRange && !contract.validateRange(testCase.first, testCase.max))) {
    throw new Error('Configura first y max válidos para una solicitud HTTP.');
  }
  appendQuery(new URL(baseUrl), testCase.query, contract);
}

function validateChecks(testCase, operations, baseUrl) {
  ['listChecks', 'listErrors', 'detailErrors'].forEach(key => {
    if (testCase[key] === undefined) return;
    if (!Array.isArray(testCase[key]) || testCase[key].length === 0) throw new Error(`${key} debe contener casos explícitos.`);
    const operation = key === 'detailErrors' ? operations.findById : operations.findRange;
    if (!operation) throw new Error(`${key} requiere una operación publicada.`);
    testCase[key].forEach(check => {
      if (!check || typeof check.name !== 'string' || !check.name.trim()) throw new Error('Cada comprobación requiere un nombre.');
      if (key === 'detailErrors') {
        if (check.id === undefined || (operation.validateId && !operation.validateId(check.id))) throw new Error('detailErrors requiere un ID válido.');
        appendQuery(new URL(baseUrl), check.query, operation);
      } else validatePage(check, operation, baseUrl);
      if (key === 'listChecks') {
        if (!Number.isSafeInteger(check.expectedTotal) || check.expectedTotal < 0 ||
            !Number.isSafeInteger(check.expectedLength) || check.expectedLength < 0 ||
            check.expectedLength > check.max || check.expectedLength > check.expectedTotal) {
          throw new Error('listChecks requiere total y tamaño esperados válidos del dataset sintético.');
        }
      } else if (!Number.isInteger(check.status) || check.status < 400 || check.status > 599) {
        throw new Error('El caso de error requiere un estado HTTP confirmado.');
      }
    });
  });
}

async function assertHttpError(request, status) {
  let error;
  try { await request; } catch (cause) { error = cause; }
  expect(error).to.be.instanceOf(DefaultError);
  expect(error).to.include({ type: 'http', code: 'HTTP_ERROR', status });
}

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
    if (operations.findById) {
      appendQuery(new URL(config.baseUrl), testCase.detailQuery || testCase.query, operations.findById);
      if (operations.findById.validateId && !operations.findById.validateId(testCase.id)) throw new Error('Falta un UUID válido para el detalle.');
    }
    if (operations.findRange) validatePage(testCase, operations.findRange, config.baseUrl);
    validateChecks(testCase, operations, config.baseUrl);
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
            expect(response).to.be.instanceOf(DefaultResponse);
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
            await assertHttpError(dao.findById(testCase.missingId, detailOptions), testCase.missingStatus);
          });
        }
        (testCase.listChecks || []).forEach(check => {
          it(check.name, async () => {
            const response = await dao.findRange(check.first, check.max, { query: check.query });
            expect(response).to.be.instanceOf(DefaultResponse);
            expect(response.datos).to.have.lengthOf(check.expectedLength);
            expect(response.totalDatos).to.equal(check.expectedTotal);
            const header = operations.findRange.pagination.totalHeader;
            if (header) expect(response.getHeader(header)).to.equal(String(check.expectedTotal));
          });
        });
        (testCase.listErrors || []).forEach(check => {
          it(check.name, async () => {
            await assertHttpError(dao.findRange(check.first, check.max, { query: check.query }), check.status);
          });
        });
        (testCase.detailErrors || []).forEach(check => {
          it(check.name, async () => {
            await assertHttpError(dao.findById(check.id, { query: check.query }), check.status);
          });
        });
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
