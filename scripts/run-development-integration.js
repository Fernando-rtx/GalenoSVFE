// Integración HTTP real de lectura: usa los veinte Service de producción y el contrato v2.
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import Mocha from 'mocha';
import * as api from '../src/js/index.js';
import { API_V2_ROUTES, API_V2_DASHBOARD_ROUTES } from '../src/js/control/api-v2-routes.js';

const baseUrl = process.env.GALENOS_API_URL || 'http://localhost:9080/GalenosSV/resources/';
assert(['localhost', '127.0.0.1'].includes(new URL(baseUrl).hostname), 'Usa un backend local.');
const config = api.createApiConfig({ baseUrl, routes: API_V2_ROUTES });
const service = Object.fromEntries(
  Object.entries(api)
    .filter(([name]) => name.endsWith('Service') && name !== 'DefaultService')
    .map(([name, Service]) => [name.slice(0, -'Service'.length), new Service({ config })]),
);
const clinicService = new api.ClinicaService({
  config: api.createApiConfig({ ...config, routes: API_V2_DASHBOARD_ROUTES }),
});
const clinics = await clinicService.findRange(0, 20);
assert(clinics.datos.length, 'Se requiere una clínica ficticia activa.');
const idClinica = clinics.datos[0].idClinica;
const [people, procedures, exams] = await Promise.all([
  service.Persona.findRange(0, 1),
  service.Procedimiento.findRange(0, 20),
  service.Examen.findRange(0, 1),
]);
const idPersona = people.datos[0]?.idPersona;
const idExamen = exams.datos[0]?.idExamen;
let idProcedimiento = procedures.datos[0]?.idProcedimiento;
let idProcedimientoPaso;
for (const proc of procedures.datos) {
  const steps = await service.ProcedimientoPaso.findRange(0, 1, {
    query: { idProcedimiento: proc.idProcedimiento },
  });
  if (steps.datos.length) {
    idProcedimiento = proc.idProcedimiento;
    idProcedimientoPaso = steps.datos[0].idProcedimientoPaso;
    break;
  }
}
async function children(request) {
  try {
    return (await request()).datos;
  } catch (error) {
    if (error.status === 404) return null; // El registro histórico puede tener un rol no vigente.
    throw error;
  }
}

async function findClinicalParents() {
  const parents = {};
  for (const clinic of clinics.datos) {
    const idClinica = clinic.idClinica;
    const { datos } = await service.Consulta.findRange(0, 100, { query: { idClinica } });
    for (const { idConsulta, rolNombre } of datos) {
      if (rolNombre?.toLowerCase() !== 'paciente') continue;
      const query = { idClinica, idConsulta };
      const steps = await children(() =>
        service.ConsultaProcedimientoPaso.findRange(0, 20, { query }),
      );
      if (!steps) continue;
      parents.consulta ??= query;
      for (const paso of steps) {
        const orderQuery = { idClinica, idPaso: paso.idConsultaProcedimientoPaso };
        const orders = await children(() => service.OrdenExamen.findRange(0, 1, { query: orderQuery }));
        if (!orders) continue;
        parents.orden ??= orderQuery;
        if (orders.length) {
          parents.resultado = { idClinica, idOrden: orders[0].idOrdenExamen };
          return parents;
        }
      }
    }
  }
  return parents;
}
const parents = await findClinicalParents();
const queries = {
  Consulta: { idClinica },
  PersonaRol: { idPersona },
  Documento: { idPersona },
  MedioContacto: { idPersona },
  ProcedimientoPaso: { idProcedimiento },
  ExamenTipoExamen: { idExamen },
  ProcedimientoPasoExamen: { idProcedimientoPaso },
  ProcedimientoPasoSecuencia: { idProcedimientoPaso },
  ConsultaProcedimiento: parents.consulta ?? null,
  ConsultaProcedimientoPaso: parents.consulta ?? null,
  OrdenExamen: parents.orden ?? null,
  ExamenResultado: parents.resultado ?? null,
};
const mocha = new Mocha({ timeout: 15000, failZero: true, forbidOnly: true });
mocha.suite.emit('pre-require', globalThis, 'development-integration', mocha);
describe('Integración HTTP académica con PostgreSQL, sin sesión', () => {
  for (const [name, instance] of Object.entries(service))
    it(`${name} lista paginada y DTO publicado`, async function () {
      if (queries[name] === null || Object.values(queries[name] ?? {}).some((value) => !value))
        this.skip();
      const r = await instance.findRange(0, 1, { query: queries[name] || {} });
      assert.equal(r.status, 200);
      assert(Array.isArray(r.datos));
      assert(r.datos.length <= 1);
      assert(Number.isSafeInteger(r.totalDatos));
      assert(r.totalDatos >= r.datos.length);
    });
  it('contexto académico disponible sin credenciales', async () => {
    const r = await new api.DefaultService({ resource: 'contexto', config }).get();
    assert.equal(r.status, 200);
    assert.equal(r.datos.actor, 'academico-local');
    assert.equal(r.datos.puedeEscribir, true);
    assert(r.datos.clinicas.includes(idClinica));
  });

  it('clínica e identificadores siguen validados', async () => {
    await assert.rejects(
      service.Consulta.findById(randomUUID(), { query: { idClinica } }),
      (e) => e.status === 404,
    );
    const response = await fetch(new URL('v2/consulta?idClinica=invalida', baseUrl));
    assert.equal(response.status, 422);
  });

  it('POST, PUT y DELETE llegan al contrato sin sesión ni cambios en la base', async () => {
    const missing = randomUUID();
    for (const [method, path, body, status] of [
      ['POST', 'rol', { nombre: ' ' }, 422],
      ['PUT', 'rol/' + missing, { nombre: 'Prueba', activo: true }, 404],
      ['DELETE', 'rol/' + missing, undefined, 404],
      ['DELETE', 'persona/' + missing, undefined, 405],
    ]) {
      const response = await fetch(new URL('v2/' + path, baseUrl), {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body && JSON.stringify(body),
      });
      assert.equal(response.status, status, `${method} ${path}`);
      assert.equal(response.headers.get('www-authenticate'), null);
    }
  });

  it('CORS autoriza JSON desde el frontend local y bloquea otro origen', async () => {
    const origin = 'http://localhost:3000';
    const endpoint = new URL('v2/rol', baseUrl);
    const local = await fetch(endpoint, {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
    });
    assert.equal(local.status, 204);
    assert.equal(local.headers.get('access-control-allow-origin'), origin);
    const external = await fetch(endpoint, { headers: { Origin: 'https://externo.invalid' } });
    assert.equal(external.status, 403);
    assert.equal(external.headers.get('access-control-allow-origin'), null);
  });
});
mocha.run((failures) => {
  process.exitCode = failures ? 1 : 0;
});
