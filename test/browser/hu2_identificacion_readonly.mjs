/** Chromium -> Fetch real -> Liberty -> clinica. Solo SELECT y sesiones efímeras.
 * PLAYWRIGHT_MODULE y CHROMIUM_EXECUTABLE permiten usar herramientas externas al proyecto.
 * No sustituye respuestas REST; únicamente configura la URL del backend de prueba.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const front = process.env.GALENOS_FRONT_URL || 'http://127.0.0.1:3000';
const backend = process.env.GALENOS_BACKEND_URL;
assert(backend, 'Indica GALENOS_BACKEND_URL del runtime de solo lectura');
function readonlyRuntime(action) {
  assert.equal(new URL(backend).port, '19084', 'Solo puede detenerse el runtime de verificación');
  const repo = process.env.GALENOS_BACKEND_REPO;
  assert(repo, 'Indica GALENOS_BACKEND_REPO para la prueba de caída real del backend');
  const state = path.join(repo, '.gt02');
  const server = path.join(state, 'usr/servers/GalenosGT02ReadOnly');
  assert(
    readFileSync(path.join(server, 'server.xml'), 'utf8').includes(
      'default_transaction_read_only=on',
    ),
  );
  assert(
    readFileSync(path.join(server, 'server.env'), 'utf8').includes('POSTGRESQL_DB_NAME=clinica'),
  );
  execFileSync(
    path.join(homedir(), 'openliberty/wlp/bin/server'),
    [action, 'GalenosGT02ReadOnly'],
    {
      env: {
        ...process.env,
        WLP_USER_DIR: path.join(state, 'usr'),
        WLP_OUTPUT_DIR: path.join(state, 'output'),
      },
      stdio: 'pipe',
      timeout: 45000,
    },
  );
}
const out = 'coverage/hu2';
mkdirSync(out, { recursive: true });
const report = {
  status: 'running',
  scope: 'Chromium, REST Java y PostgreSQL clinica; sin escrituras de datos',
  checks: [],
};
writeFileSync(out + '/resultado.json', JSON.stringify(report, null, 2) + '\n');
const mark = (check) => report.checks.push(check);
function sql(statement) {
  return execFileSync(
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
}
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
  sql(`SELECT coalesce(json_agg(x),'[]') FROM (
  SELECT p.id_persona persona,p.nombres,d.id_tipo_documento tipo,d.valor,pr.id_persona_rol asignacion,
    pr.id_rol rol,pr.id_clinica clinica,r.nombre rol_nombre,
    EXISTS (SELECT 1 FROM consulta con WHERE con.id_persona_rol=pr.id_persona_rol) tiene_citas
  FROM documento d JOIN persona p USING(id_persona) JOIN tipo_documento t USING(id_tipo_documento)
  JOIN persona_rol pr USING(id_persona) JOIN rol r USING(id_rol) JOIN clinica c USING(id_clinica)
  WHERE t.activo AND r.activo AND c.activo ORDER BY p.id_persona) x;`),
);
const employee = records.find((r) => r.rol_nombre.toLowerCase() === 'doctor');
const patients = records.filter(
  (r) =>
    r.rol_nombre.toLowerCase() === 'paciente' &&
    !records.some(
      (other) => other.persona === r.persona && other.rol_nombre.toLowerCase() !== 'paciente',
    ),
);
const patient = patients.find((r) => r.tiene_citas) || patients[0];
assert(employee && patient, 'Falta empleado Doctor o persona con solo rol Paciente');
const foreign = records.find((r) => r.persona !== employee.persona);
assert(foreign);
const multiple = records.filter(
  (r) => r.persona === employee.persona && r.rol_nombre.toLowerCase() !== 'paciente',
);
report.multipleAssignmentsAvailable = new Set(multiple.map((r) => r.asignacion)).size > 1;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
});
const context = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1280, height: 1000 },
});
const page = await context.newPage();
const errors = [];
let identificationRequests = 0;
page.on('request', (request) => {
  if (request.method() === 'POST' && request.url().endsWith('/identidad_academica/empleado'))
    identificationRequests++;
});
page.on('pageerror', (error) => errors.push(error.message));
await context.route('**/js/control/environment.local.js', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    body: `export const gestionConfig=${JSON.stringify({ baseUrl: backend })};`,
  }),
);
const view = page.locator('inicio-sesion'),
  app = page.locator('galenos-academic-app');
const waitFor = (condition) => page.waitForFunction(condition);
const waitQueue = () =>
  page.waitForFunction(() => {
    const app = document.querySelector('galenos-academic-app');
    return (
      app?.q('[data-page-summary]')?.textContent.includes('consultas') ||
      app?.q('[data-queue-status]')?.classList.contains('error')
    );
  });
async function identify(row, duplicate = false) {
  await selectDocumentType(view, row.tipo);
  await view.locator('#valor').fill(row.valor);
  if (duplicate) {
    const count = identificationRequests;
    await view.evaluate((node) => {
      const form = node.shadowRoot.querySelector('[data-login]');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await view.locator('[data-context]').waitFor({ state: 'visible' });
    assert.equal(identificationRequests - count, 1);
  } else await view.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await view.locator('[data-context]').waitFor({ state: 'visible' });
  await view.locator('#asignacion').selectOption(row.asignacion);
}
try {
  await page.goto(front + '/#empleados');
  await waitFor(
    () =>
      document.querySelector('inicio-sesion')?.documentTypes?.length > 0,
  );
  assert(await view.locator('#valor').isDisabled());
  assert.equal(await view.locator('h1').textContent(), 'Acceso de empleados');
  await page.screenshot({ path: out + '/acceso.png', fullPage: true });
  await view.getByRole('button', { name: 'Ingresar', exact: true }).click();
  assert.equal(await view.locator('#tipo').getAttribute('aria-invalid'), 'true');
  mark('Tipo obligatorio, número inicialmente deshabilitado y error accesible');
  await selectDocumentType(view, employee.tipo);
  await view.locator('#valor').fill('!');
  await view.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await waitFor(
    () =>
      document
        .querySelector('inicio-sesion')
        .shadowRoot.querySelector('#valor')
        .getAttribute('aria-invalid') === 'true',
  );
  mark('Documento con formato incorrecto rechazado');
  await selectDocumentType(view, patient.tipo);
  await view.locator('#valor').fill(patient.valor);
  await view.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await waitFor(() =>
    document
      .querySelector('inicio-sesion')
      .shadowRoot.querySelector('[data-status]')
      .textContent.includes('no tiene asignaciones de empleado'),
  );
  assert(await view.locator('[data-context]').isHidden());
  mark('Paciente sin rol empleado rechazado por Java');
  await identify(employee, true);
  mark('Dos envíos simultáneos producen una única identificación REST');
  assert.equal(await view.locator('#valor').inputValue(), '');
  await page.screenshot({ path: out + '/asignacion.png', fullPage: true });
  mark(
    'Doctor identificado por documento real, asignaciones recibidas de JPA y documento borrado del formulario',
  );
  await page.evaluate('window.hu2SameDocument = true');
  const queueResponse = page.waitForResponse((response) => response.url().includes('/v2/empleado/consultas?'));
  await view.getByRole('button', { name: 'Entrar al dashboard', exact: true }).click();
  const queue = await queueResponse;
  assert.equal(queue.status(), 200);
  const queueHeaders = await queue.request().allHeaders();
  assert(queueHeaders.authorization.startsWith('Bearer '));
  assert.equal(queueHeaders['x-persona-rol'], employee.asignacion);
  const query = new URL(queue.url()).searchParams;
  assert.equal(query.get('idPersona'), employee.persona);
  assert.equal(query.get('idRol'), employee.rol);
  assert.equal(query.get('idClinica'), employee.clinica);
  await waitQueue();
  assert.equal(await app.locator('[data-staff-clinic]').inputValue(), employee.clinica);
  assert.equal(await app.locator('[data-staff-role]').inputValue(), employee.asignacion);
  assert.equal(await app.locator('[data-employee-status]').textContent(), '');
  assert.equal(await page.evaluate('window.hu2SameDocument'), true);
  mark('Selección exacta de PersonaRol, clínica y rol en dashboard SPA; sin falso acceso denegado');
  const negative = await page.evaluate(async (foreign) => {
    const app = document.querySelector('galenos-academic-app');
    const assignment = app.q('[data-staff-role]').value;
    const query = new URLSearchParams(app.context());
    query.set('first', '0');
    query.set('max', '20');
    const response = await fetch(
      new URL('v2/empleado/consultas?' + query, app.api.employeeAppointments.config.baseUrl),
      { headers: app.sessionHeaders(app.employeeSession, foreign).headers },
    );
    return { status: response.status, selected: assignment };
  }, foreign.asignacion);
  assert.equal(negative.status, 403);
  assert.equal(negative.selected, employee.asignacion);
  mark('PersonaRol ajeno rechazado con403 por REST real');
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'));
  await page.setViewportSize({ width: 1280, height: 1000 });
  // Revocar en Java equivale a una sesión que ya no puede utilizarse; no altera clinica.
  await page.evaluate(async () => {
    const app = document.querySelector('galenos-academic-app');
    await fetch(
      new URL('v2/identidad_academica/empleado', app.api.employeeAppointments.config.baseUrl),
      { method: 'DELETE', headers: app.sessionHeaders(app.employeeSession).headers },
    );
    await app.loadQueue();
  });
  await waitFor(() => location.hash === '#empleados');
  assert(await view.locator('[data-login]').isVisible());
  assert((await view.getByRole('status').textContent()).includes('sesión'));
  assert.equal(await app.locator('[data-queue]').textContent(), '');
  assert.equal(await app.locator('[data-person-label]').textContent(), '');
  mark('Sesión revocada401 regresa al acceso y borra identidad, selección y resultados');
  await identify(employee);
  await view.getByRole('button', { name: 'Entrar al dashboard', exact: true }).click();
  await waitQueue();
  await app.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await waitFor(() => location.hash === '#empleados');
  assert(await view.locator('[data-login]').isVisible());
  assert.equal(await app.locator('[data-person-label]').textContent(), '');
  mark('Cierre real en backend y limpieza de paneles del empleado');
  // Puede detenerse únicamente el servidor aislado configurado para solo lectura.
  const realOutage = process.env.GALENOS_RESTART_READONLY_RUNTIME === '1';
  if (realOutage) readonlyRuntime('stop');
  else await context.setOffline(true);
  await selectDocumentType(view, employee.tipo);
  await view.locator('#valor').fill(employee.valor);
  await view.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await waitFor(() =>
    document
      .querySelector('inicio-sesion')
      .shadowRoot.querySelector('[data-status]')
      .textContent.includes('Sin conexión'),
  );
  if (realOutage) {
    readonlyRuntime('start');
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        if ((await fetch(new URL('v1/tipo_documento?max=1', backend))).ok) break;
      } catch {
        /* Liberty aún está iniciando; reintento acotado. */
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } else await context.setOffline(false);
  await view.getByRole('button', { name: 'Reintentar conexión', exact: true }).click();
  await waitFor(() =>
    document
      .querySelector('inicio-sesion')
      .shadowRoot.querySelector('[data-status]')
      .textContent.includes('Selecciona tu documento'),
  );
  await identify(employee);
  mark(
    realOutage
      ? 'Backend de solo lectura detenido y restablecido: formulario disponible, error de conexión y reintento real'
      : 'Desconexión de Chromium y nueva identificación real',
  );
  await view.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await waitFor(
    () =>
      document.querySelector('inicio-sesion').shadowRoot.querySelector('[data-login]').hidden ===
      false,
  );
  await page.goto(front + '/#pacientes');
  const publicView = page.locator('busqueda-citas');
  await waitFor(
    () =>
      document.querySelector('busqueda-citas').shadowRoot.querySelector('#tipo').options.length > 1,
  );
  const publicPatient =
    records.find((r) => r.rol_nombre.toLowerCase() === 'paciente' && r.tiene_citas) || patient;
  await publicView.locator('#tipo').selectOption(publicPatient.tipo);
  await publicView.locator('#valor').fill(publicPatient.valor);
  await publicView.getByRole('button', { name: 'Consultar paciente', exact: true }).click();
  await publicView.locator('[data-context]').waitFor({ state: 'visible' });
  await publicView.locator('#clinica').selectOption(publicPatient.clinica);
  await publicView.locator('#desde').fill('2000-01-01');
  await publicView.locator('#hasta').fill('2099-12-31');
  const appointments = page.waitForResponse((response) =>
    response.url().includes('/v2/citas_paciente?'),
  );
  await publicView.getByRole('button', { name: 'Buscar citas', exact: true }).click();
  assert.equal((await appointments).status(), 200);
  await waitFor(
    () =>
      document
        .querySelector('busqueda-citas')
        .shadowRoot.querySelector('form[data-login]')
        .getAttribute('aria-busy') === 'false',
  );
  const cards = publicView.locator('tarjeta-consulta');
  if (await cards.count()) {
    await cards.first().getByRole('button').click();
    const download = page.waitForEvent('download');
    await page.locator('[data-ticket-pdf]').click();
    assert(
      readFileSync(await (await download).path())
        .subarray(0, 5)
        .equals(Buffer.from('%PDF-')),
    );
    mark('HU1 real: identificación pública, citas y descarga de PDF Java');
  } else mark('HU1 real: búsqueda pública200 vacía; PDF no comprobado por falta de citas');
  await publicView.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await waitFor(
    () => !document.querySelector('busqueda-citas').shadowRoot.querySelector('[data-login]').hidden,
  );
  await page.goto(front + '/#empleados');
  await page.evaluate('navigator.serviceWorker.ready');
  await waitFor(() => !!navigator.serviceWorker.controller);
  const cachedUrls = await page.evaluate(async () => {
    const entries = (
      await Promise.all((await caches.keys()).map(async (key) => (await caches.open(key)).keys()))
    ).flat();
    return entries.map((request) => new URL(request.url).pathname);
  });
  assert(
    cachedUrls.every(
      (url) =>
        !url.includes('/resources/v') &&
        !/\/ticket(?:\/|$)/.test(url) &&
        !url.endsWith('environment.local.js'),
    ),
  );
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await view.locator('h1').waitFor({ state: 'visible' });
  assert.equal(await view.locator('h1').textContent(), 'Acceso de empleados');
  await context.setOffline(false);
  mark(
    'PWA conserva el acceso de empleados sin conexión; Cache Storage sin REST, documentos ni sesiones',
  );
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.deepEqual(snapshot(), before);
  report.unchangedTables = 20;
  report.pageErrors = 0;
  report.status = 'passed';
  writeFileSync(out + '/resultado.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  if (report.status !== 'passed') {
    report.status = 'failed';
    writeFileSync(out + '/resultado.json', JSON.stringify(report, null, 2) + '\n');
  }
  await browser.close();
}

// Selección visible del combobox de empleados; no modifica el estado a escondidas.
async function selectDocumentType(view, id) {
  const name = await view.evaluate((node, id) => node.documentTypes.find(type => type.idTipoDocumento === id)?.nombre, id);
  assert(name, 'Tipo de documento disponible');
  await view.locator('#tipo').fill(name);
  await view.getByRole('option', { name, exact: true }).click();
}
