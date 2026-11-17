/** Componentes con mocks; opcionalmente GET reales contra clinica con JDBC de solo lectura. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const front = process.env.GALENOS_FRONT_URL || 'http://127.0.0.1:3000';
const backend = process.env.GALENOS_BACKEND_URL;
const report = { status: 'running', synthetic: [], realReadonly: [], database: backend ? 'clinica, solo lectura' : 'sin PostgreSQL' };
const sql = (statement) => execFileSync('docker', ['exec', '-i', 'postgres_db', 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'clinica'],
  { input: `BEGIN READ ONLY;\n${statement}\nCOMMIT;`, encoding: 'utf8' }).trim();
function snapshot() {
  const tables = sql("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;").split('\n');
  assert.equal(tables.length, 20);
  return tables.map((name) => sql(`SELECT md5(coalesce(string_agg(row_to_json(r)::text,'' ORDER BY row_to_json(r)::text),'')) FROM public."${name.replaceAll('"', '""')}" r;`));
}
mkdirSync('coverage/hu4', { recursive: true });
writeFileSync('coverage/hu4/resultado.json', JSON.stringify(report));
const browser = await chromium.launch({ headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(front + '/test/browser/hu4_componentes.html');
  await page.waitForFunction(() => /^(PASS|FAIL):/.test(document.querySelector('#resultado').textContent));
  const result = await page.locator('#resultado').textContent();
  assert(result.startsWith('PASS:'), result);
  report.synthetic.push(result);
  await page.screenshot({ path: 'coverage/hu4/formulario-sintetico.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Formulario móvil con desbordamiento');
  await page.screenshot({ path: 'coverage/hu4/formulario-movil-sintetico.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 1000 });
  if (backend) {
    assert.equal(new URL(backend).port, '19084', 'Solo runtime de verificación de lectura');
    const repo = process.env.GALENOS_BACKEND_REPO;
    assert(repo, 'Indica el backend del runtime de solo lectura');
    const server = path.join(repo, '.gt02/usr/servers/GalenosGT02ReadOnly');
    assert(readFileSync(path.join(server, 'server.xml'), 'utf8').includes('default_transaction_read_only=on'));
    assert(readFileSync(path.join(server, 'server.env'), 'utf8').split('\n').includes('POSTGRESQL_DB_NAME=clinica'));
    const before = snapshot();
    const employees = JSON.parse(sql(`SELECT coalesce(json_agg(x),'[]') FROM (SELECT d.id_tipo_documento tipo,d.valor,pr.id_persona persona,
      pr.id_persona_rol asignacion,pr.id_rol rol,pr.id_clinica clinica FROM documento d JOIN tipo_documento t USING(id_tipo_documento)
      JOIN persona_rol pr USING(id_persona) JOIN rol r USING(id_rol) JOIN clinica c USING(id_clinica)
      WHERE t.activo AND r.activo AND c.activo AND lower(trim(r.nombre))='doctor' ORDER BY pr.id_persona) x;`));
    const cases = JSON.parse(sql(`SELECT coalesce(json_agg(x),'[]') FROM (SELECT cp.id_consulta consulta, paciente.id_clinica clinica,
      p.id_persona_rol responsable,p.id_procedimiento_paso plantilla FROM consulta_procedimiento_paso p
      JOIN consulta_procedimiento cp USING(id_consulta_procedimiento) JOIN consulta c USING(id_consulta)
      JOIN persona_rol paciente ON paciente.id_persona_rol=c.id_persona_rol WHERE p.estado IN ('PENDIENTE','EN_CURSO')) x;`));
    const employee = employees.find((e) => cases.some((c) => c.clinica === e.clinica && c.responsable !== e.asignacion));
    assert(employee, 'Falta un empleado con documento y un caso ajeno en su clínica para comprobar403');
    const careCase = cases.find((c) => c.clinica === employee.clinica && c.responsable !== employee.asignacion);
    await context.route('**/js/control/environment.local.js', (route) => route.fulfill({ status: 200,
      contentType: 'text/javascript', body: `export const gestionConfig=${JSON.stringify({ baseUrl: backend })};` }));
    await page.goto(front + '/#empleados');
    const view = page.locator('inicio-sesion');
    await page.waitForFunction(() => document.querySelector('inicio-sesion')?.documentTypes?.length > 0);
    await selectDocumentType(view, employee.tipo);
    await view.locator('#valor').fill(employee.valor);
    await view.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await view.locator('[data-context]').waitFor({ state: 'visible' });
    await view.locator('#asignacion').selectOption(employee.asignacion);
    const pending = page.waitForResponse((r) => r.url().includes('/v2/empleado/consultas?'));
    await view.getByRole('button', { name: 'Entrar al dashboard', exact: true }).click();
    assert.equal((await pending).status(), 200);
    const rejected = await page.evaluate(async ({ backend, employee, careCase }) => {
      const app = document.querySelector('galenos-academic-app');
      const query = new URLSearchParams({ idPersona: employee.persona, idClinica: employee.clinica, idRol: employee.rol });
      const response = await fetch(new URL(`v2/atencion/consulta/${careCase.consulta}?${query}`, backend),
        { headers: app.sessionHeaders(app.employeeSession, employee.asignacion).headers, cache: 'no-store' });
      return { status: response.status, body: await response.json() };
    }, { backend, employee, careCase });
    assert.equal(rejected.status, 403);
    assert.deepEqual(Object.keys(rejected.body), ['mensaje']);
    report.realReadonly.push('Identificación y bandeja200 reales; consulta de otro responsable rechazada403 antes de exponer plantilla/historial');
    report.missingTemplateExecutions = cases.filter((c) => c.plantilla === null).length;
    await page.locator('galenos-academic-app').getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    assert.deepEqual(snapshot(), before);
    report.unchangedTables = 20;
    report.realReadonly.push('Contenido de las20tablas idéntico antes/después; ninguna petición de registro de atención');
  }
  assert.deepEqual(errors, []);
  report.pageErrors = 0;
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failure = error.message; throw error;
} finally {
  writeFileSync('coverage/hu4/resultado.json', JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report));
}

// Selección visible del combobox de empleados; no modifica el estado a escondidas.
async function selectDocumentType(view, id) {
  const name = await view.evaluate((node, id) => node.documentTypes.find(type => type.idTipoDocumento === id)?.nombre, id);
  assert(name, 'Tipo de documento disponible');
  await view.locator('#tipo').fill(name);
  await view.getByRole('option', { name, exact: true }).click();
}
