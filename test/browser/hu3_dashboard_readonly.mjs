/** Lecturas reales de clinica + escenario DOM separado con datos sintéticos. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const front = process.env.GALENOS_FRONT_URL || 'http://127.0.0.1:3000';
const backend = process.env.GALENOS_BACKEND_URL;
assert(backend, 'Indica el backend de solo lectura');
const sql = (statement) =>
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      'postgres_db',
      'psql',
      '-X',
      '-qAt',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'postgres',
      '-d',
      'clinica',
    ],
    { input: `BEGIN READ ONLY;\n${statement}\nCOMMIT;`, encoding: 'utf8' },
  ).trim();
function snapshot() {
  const tables = sql(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;",
  ).split('\n');
  assert.equal(tables.length, 20);
  return tables.map((name) =>
    sql(
      `SELECT md5(coalesce(string_agg(row_to_json(r)::text,'' ORDER BY row_to_json(r)::text),'')) FROM public."${name.replaceAll('"', '""')}" r;`,
    ),
  );
}
const before = snapshot();
const records = JSON.parse(
  sql(`SELECT coalesce(json_agg(x),'[]') FROM (SELECT DISTINCT d.id_tipo_documento tipo,d.valor,pr.id_persona persona,
  pr.id_persona_rol asignacion,pr.id_rol rol,pr.id_clinica clinica,r.nombre FROM documento d JOIN tipo_documento t USING(id_tipo_documento)
  JOIN persona_rol pr USING(id_persona) JOIN rol r USING(id_rol) JOIN clinica c USING(id_clinica)
  WHERE t.activo AND r.activo AND c.activo ORDER BY pr.id_persona) x;`),
);
const employee = records.find((r) => r.nombre.toLowerCase() === 'doctor');
const foreign = records.find((r) => r.persona !== employee?.persona);
assert(employee && foreign);
const count = Number(
  sql(`SELECT count(DISTINCT c.id_consulta) FROM consulta c JOIN persona_rol paciente ON paciente.id_persona_rol=c.id_persona_rol
 JOIN consulta_procedimiento cp ON cp.id_consulta=c.id_consulta JOIN consulta_procedimiento_paso p ON p.id_consulta_procedimiento=cp.id_consulta_procedimiento
 JOIN persona_rol pr ON pr.id_persona_rol=p.id_persona_rol JOIN procedimiento_paso pp ON pp.id_procedimiento_paso=p.id_procedimiento_paso
 WHERE pr.id_persona='${employee.persona}' AND pr.id_rol='${employee.rol}' AND pr.id_clinica='${employee.clinica}'
 AND paciente.id_clinica=pr.id_clinica AND pp.id_rol=pr.id_rol AND p.estado IN ('PENDIENTE','EN_CURSO');`),
);
const completed = Number(
  sql("SELECT count(*) FROM consulta_procedimiento_paso WHERE estado='COMPLETADO';"),
);
const out = 'coverage/hu3';
mkdirSync(out, { recursive: true });
const report = {
  status: 'running',
  real: [],
  synthetic: [],
  sqlAssignedAllDates: count,
  sqlCompletedSteps: completed,
};
writeFileSync(out + '/resultado.json', JSON.stringify(report, null, 2));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
});
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(front + '/test/browser/hu3_componentes.html');
  await page.waitForFunction(
    () =>
      document.querySelector('#resultado').textContent.startsWith('PASS:') ||
      document.querySelector('#resultado').textContent.startsWith('FAIL:'),
  );
  const synthetic = await page.locator('#resultado').textContent();
  assert(synthetic.startsWith('PASS:'), synthetic);
  report.synthetic.push(synthetic);
  assert.equal(errors.length, 0, errors.join('\n'));
  await context.route('**/js/control/environment.local.js', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: `export const gestionConfig=${JSON.stringify({ baseUrl: backend })};`,
    }),
  );
  await page.goto(front + '/#empleados');
  const view = page.locator('inicio-sesion');
  const app = page.locator('galenos-academic-app');
  await page.waitForFunction(
    () =>
      document.querySelector('inicio-sesion')?.shadowRoot.querySelector('#tipo').options.length > 1,
  );
  await view.locator('#tipo').selectOption(employee.tipo);
  await view.locator('#valor').fill(employee.valor);
  await view.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await view.locator('[data-context]').waitFor({ state: 'visible' });
  await view.locator('#asignacion').selectOption(employee.asignacion);
  const first = page.waitForResponse((r) => r.url().includes('/v2/empleado/consultas?'));
  await view.getByRole('button', { name: 'Entrar al dashboard', exact: true }).click();
  const firstResponse = await first;
  assert.equal(firstResponse.status(), 200);
  const date = await page.evaluate(() => {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'America/El_Salvador',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    return ['year', 'month', 'day'].map((t) => parts.find((p) => p.type === t).value).join('-');
  });
  const params = new URL(firstResponse.url()).searchParams;
  assert.equal(params.get('fechaDesde'), date);
  assert.equal(params.get('fechaHasta'), date);
  const headers = await firstResponse.request().allHeaders();
  assert(headers.authorization.startsWith('Bearer '));
  assert.equal(headers['x-persona-rol'], employee.asignacion);
  assert.equal(await app.locator('[data-staff-clinic]').inputValue(), employee.clinica);
  assert.equal(await app.locator('[data-staff-role]').inputValue(), employee.asignacion);
  report.real.push(
    'Identificación, selección propia y consultas de hoy con fecha clínica dinámica y encabezados correctos:200',
  );
  for (const label of ['Fechas pasadas', 'Fechas futuras', 'Restablecer filtros']) {
    const pending = page.waitForResponse((r) => r.url().includes('/v2/empleado/consultas?'));
    await app.getByRole('button', { name: label, exact: true }).click();
    const response = await pending;
    assert.equal(response.status(), 200);
    const query = new URL(response.url()).searchParams;
    if (label === 'Fechas pasadas') {
      assert(!query.has('fechaDesde'));
      assert(query.get('fechaHasta') < date);
    }
    if (label === 'Fechas futuras') {
      assert(!query.has('fechaHasta'));
      assert(query.get('fechaDesde') > date);
    }
    if (label === 'Restablecer filtros') assert.equal(query.get('fechaDesde'), date);
  }
  report.real.push('Filtros pasado/futuro y restablecer envían REST y reciben200');
  const full = page.waitForResponse(
    (r) => r.url().includes('/v2/empleado/consultas?') && r.url().includes('fechaDesde=2000-01-01'),
  );
  await page.evaluate(() => {
    const app = document.querySelector('galenos-academic-app');
    const form = app.q('[data-staff-dates]');
    form.elements.fechaDesde.value = '2000-01-01';
    form.elements.fechaHasta.value = '2099-12-31';
    form.elements.fechaDesde.dispatchEvent(new Event('change'));
  });
  const fullResponse = await full;
  assert.equal(fullResponse.status(), 200);
  const rows = await fullResponse.json();
  assert.equal(rows.length, count);
  await page.waitForFunction(
    () =>
      document.querySelector('galenos-academic-app').q('[data-queue]').getAttribute('aria-busy') ===
      'false',
  );
  if (!count) {
    assert(
      (await app.locator('[data-queue]').textContent()).includes(
        'No hay consultas asignadas para este rango de fechas',
      ),
    );
    report.real.push(
      'Lista vacía200 confirmada por SELECT de asignaciones, sin tarjetas inventadas',
    );
  }
  await page.screenshot({ path: out + '/dashboard.png', fullPage: true });
  const rejected = await page.evaluate(async (foreign) => {
    const app = document.querySelector('galenos-academic-app');
    const query = new URLSearchParams(app.context());
    const response = await fetch(
      new URL('v2/empleado/consultas?' + query, app.api.employeeAppointments.config.baseUrl),
      { headers: app.sessionHeaders(app.employeeSession, foreign).headers },
    );
    return response.status;
  }, foreign.asignacion);
  assert.equal(rejected, 403);
  report.real.push('PersonaRol ajeno rechazado403');
  const patient = records.find((row) => row.nombre.toLowerCase() === 'paciente');
  if (patient) {
    const projection = await page.evaluate(async (row) => {
      const app = document.querySelector('galenos-academic-app');
      const base = app.api.patientAppointments.config.baseUrl;
      const identity = await fetch(new URL('v2/identidad_academica/paciente', base), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idTipoDocumento: row.tipo, valor: row.valor }),
      });
      if (!identity.ok) return { status: identity.status };
      const session = await identity.json();
      try {
        const response = await app.api.findPatientAppointments(0, 20, { idClinica: row.clinica },
          { headers: { Authorization: `Bearer ${session.token}` } });
        return { status: response.status, groups: response.datos.reduce((sum, item) => sum + item.procedimientos.length, 0) };
      } finally {
        await fetch(new URL('v2/identidad_academica/paciente', base), { method: 'DELETE', headers: { Authorization: `Bearer ${session.token}` } });
      }
    }, patient);
    assert.equal(projection.status, 200);
    report.projectionGroupsRead = projection.groups;
    report.real.push('Proyección JPA y DTO ampliado compatible con el cliente mediante sesión propia de paciente:200');
  }
  await context.setOffline(true);
  await app.getByRole('button', { name: 'Buscar consultas', exact: true }).click();
  await app
    .getByRole('button', { name: 'Reintentar conexión', exact: true })
    .waitFor({ state: 'visible' });
  assert(!(await app.locator('[data-queue]').textContent()).includes('No hay consultas'));
  await context.setOffline(false);
  const retry = page.waitForResponse((r) => r.url().includes('/v2/empleado/consultas?'));
  await app.getByRole('button', { name: 'Reintentar conexión', exact: true }).click();
  assert.equal((await retry).status(), 200);
  report.real.push('Desconexión de Chromium conserva la interfaz y reintento real recupera200');
  await page.evaluate(async () => {
    const app = document.querySelector('galenos-academic-app');
    await fetch(
      new URL('v2/identidad_academica/empleado', app.api.employeeAppointments.config.baseUrl),
      { method: 'DELETE', headers: app.sessionHeaders(app.employeeSession).headers },
    );
    await app.loadQueue();
  });
  await page.waitForFunction(() => location.hash === '#empleados');
  report.real.push('Sesión revocada401 elimina el dashboard y regresa al acceso');
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.deepEqual(snapshot(), before);
  report.unchangedTables = 20;
  report.pageErrors = 0;
  report.status = 'passed';
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
  if (report.status !== 'passed') report.status = 'failed';
  writeFileSync(out + '/resultado.json', JSON.stringify(report, null, 2) + '\n');
}
