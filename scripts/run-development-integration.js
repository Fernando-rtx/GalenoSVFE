// Integración HTTP real de lectura: usa los veinte Service de producción y el contrato v2.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import Mocha from 'mocha';
import * as api from '../src/js/index.js';
import { API_V2_ROUTES, API_V2_DASHBOARD_ROUTES } from '../src/js/control/api-v2-routes.js';

if (!process.env.GALENOS_LOCAL_CREDENTIALS)
  throw new Error('Define GALENOS_LOCAL_CREDENTIALS con la ruta privada de las cuentas locales.');
const accounts = JSON.parse(await readFile(process.env.GALENOS_LOCAL_CREDENTIALS, 'utf8'));
const baseUrl = process.env.GALENOS_API_URL || 'http://localhost:9080/GalenosSV/resources/';
function configuration(name) {
  const account = accounts[name];
  assert(account, 'Falta una cuenta local requerida');
  return api.createApiConfig({
    baseUrl,
    routes: API_V2_ROUTES,
    http: {
      headers: {
        Authorization: `Basic ${Buffer.from(`${account.username}:${account.password}`).toString('base64')}`,
      },
    },
  });
}
const config = configuration('administrador-local');
const reader = configuration('lector-local');
const service = Object.fromEntries(
  Object.entries(api)
    .filter(([name]) => name.endsWith('Service') && name !== 'DefaultService')
    .map(([name, Service]) => [name.slice(0, -3), new Service({ config })]),
);
const clinicService = new api.ClinicaService({
  config: api.createApiConfig({ ...config, routes: API_V2_DASHBOARD_ROUTES }),
});
const clinics = await clinicService.findRange(0, 20);
assert(clinics.datos.length, 'Se requiere una clínica autorizada');
const idClinica = clinics.datos[0].idClinica;
const people = await service.Persona.findRange(0, 100);
assert(people.datos.length, 'Se requieren registros de desarrollo para verificar relaciones');
const idPersona = people.datos[0].idPersona;
const procedures = await service.Procedimiento.findRange(0, 100);
const proc = procedures.datos.find(
  (p) => p.nombre?.startsWith('DESARROLLO procedimiento flujo') && p.activo,
);
assert(proc, 'Ejecuta primero la prueba de flujo de desarrollo');
const steps = await service.ProcedimientoPaso.findRange(0, 100, {
  query: { idProcedimiento: proc.idProcedimiento },
});
const step = steps.datos.find((p) => p.nombre === 'Inicio Desarrollo');
assert(step);
const exams = await service.Examen.findRange(0, 100);
assert(exams.datos.length);
const consultas = await service.Consulta.findRange(0, 100, { query: { idClinica } });
assert(consultas.datos.length);
const idConsulta = consultas.datos.find((c) =>
  c.referenciaExterna?.startsWith('DESARROLLO-'),
)?.idConsulta;
assert(idConsulta);
const clinicalSteps = await service.ConsultaProcedimientoPaso.findRange(0, 100, {
  query: { idClinica, idConsulta },
});
assert(clinicalSteps.datos.length);
let order;
for (const p of clinicalSteps.datos) {
  const result = await service.OrdenExamen.findRange(0, 100, {
    query: { idClinica, idPaso: p.idConsultaProcedimientoPaso },
  });
  if (result.datos.length) {
    order = result.datos[0];
    break;
  }
}
assert(order, 'Se requiere una orden de desarrollo');
const queries = {
  Consulta: { idClinica },
  PersonaRol: { idPersona },
  Documento: { idPersona },
  MedioContacto: { idPersona },
  ProcedimientoPaso: { idProcedimiento: proc.idProcedimiento },
  ExamenTipoExamen: { idExamen: exams.datos[0].idExamen },
  ProcedimientoPasoExamen: { idProcedimientoPaso: step.idProcedimientoPaso },
  ProcedimientoPasoSecuencia: { idProcedimientoPaso: step.idProcedimientoPaso },
  ConsultaProcedimiento: { idClinica, idConsulta },
  ConsultaProcedimientoPaso: { idClinica, idConsulta },
  OrdenExamen: { idClinica, idPaso: order.idConsultaProcedimientoPaso },
  ExamenResultado: { idClinica, idOrden: order.idOrdenExamen },
};
const mocha = new Mocha({ timeout: 15000, failZero: true, forbidOnly: true });
mocha.suite.emit('pre-require', globalThis, 'development-integration', mocha);
describe('Integración HTTP autenticada contra clinica — lectura real, sin fixtures de respuesta', () => {
  for (const [name, instance] of Object.entries(service))
    it(`${name} lista paginada y DTO publicado`, async () => {
      const r = await instance.findRange(0, 1, { query: queries[name] || {} });
      assert.equal(r.status, 200);
      assert(Array.isArray(r.datos));
      assert(r.datos.length <= 1);
      assert(Number.isSafeInteger(r.totalDatos));
      assert(r.totalDatos >= r.datos.length);
    });
  it('sin identidad devuelve401', async () => {
    const anonymous = new api.DefaultService({
      resource: 'contexto',
      config: api.createApiConfig({ baseUrl, routes: API_V2_ROUTES }),
    });
    await assert.rejects(anonymous.get(), (e) => e.status === 401);
  });
  it('lector no accede al catálogo global de personas', async () => {
    await assert.rejects(
      new api.PersonaService({ config: reader }).findRange(0, 1),
      (e) => e.status === 403,
    );
  });
  it('clínica no asignada devuelve403', async () => {
    await assert.rejects(
      service.Consulta.findRange(0, 1, {
        query: { idClinica: '00000000-0000-4000-8000-000000000001' },
      }),
      (e) => e.status === 403,
    );
  });
  it('contexto lector no concede escritura', async () => {
    const r = await new api.DefaultService({ resource: 'contexto', config: reader }).get();
    assert.equal(r.datos.puedeEscribir, false);
  });
});
mocha.run((failures) => {
  process.exitCode = failures ? 1 : 0;
});
