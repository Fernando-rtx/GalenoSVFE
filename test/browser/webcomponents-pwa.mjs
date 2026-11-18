/** Navegador sintético: servidor propio, nunca conecta a Liberty ni PostgreSQL. */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(process.env.GALENOS_REPO || fileURLToPath(new URL('../../', import.meta.url)));
const output = process.env.GALENOS_BROWSER_OUTPUT || path.join(root, 'coverage/browser');
await mkdir(output, { recursive: true });
const contentTypes = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/js/control/environment.local.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
    return res.end("export const gestionConfig = {baseUrl: location.origin + '/synthetic-api/'};");
  }
  if (pathname.startsWith('/synthetic-api/')) {
    const rows = pathname.endsWith('/v1/tipo_documento') ? [{
      idTipoDocumento: '00000000-0000-4000-8000-000000000001', nombre: 'Documento académico',
      indicaciones: 'Documento sintético del fixture', expresionRegular: '^ACAD[A-Z0-9]+$', activo: true,
    }] : [];
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Total-registros': String(rows.length) });
    return res.end(JSON.stringify(rows));
  }
  const file = path.resolve(root, pathname.startsWith('/test/') ? '.' + pathname : 'src' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const report = { generatedAt: new Date().toISOString(), scope: 'Chromium sintético, sin backend ni PostgreSQL', checks: [], manualInstallation: 'No probada por este runner' };
try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, serviceWorkers: 'allow' });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  await page.coverage.startJSCoverage({ resetOnNavigation: false, reportAnonymousScripts: false });
  for (const fixture of ['componentes', 'page_components', 'hu3_componentes', 'hu4_componentes', 'notificaciones', 'accesibilidad', 'recepcion_fecha', 'instalacion_pwa']) {
    await page.goto(`${origin}/test/browser/${fixture}.html`);
    await page.waitForFunction(() => /^(PASS|FAIL):/.test(document.querySelector('#resultado').textContent));
    const result = await page.locator('#resultado').textContent();
    assert(result.startsWith('PASS:'), result);
    if (fixture === 'hu4_componentes') {
      const search = page.locator('galenos-academic-app').getByRole('searchbox', { name: 'Buscar examen permitido' });
      await search.fill('torax');
      await search.press('Enter');
      assert.equal(await page.locator('galenos-academic-app').evaluate(node => node.saving), false,
        'Enter en búsqueda envía el formulario clínico');
    }
    report.checks.push({ fixture, result });
  }
  await page.goto(origin);
  await page.locator('busqueda-citas').waitFor({ state: 'visible' });
  await page.getByRole('link', { name: 'Iniciar sesión', exact: true }).click();
  await page.locator('inicio-sesion').waitFor({ state: 'visible' });
  await page.goBack();
  await page.locator('busqueda-citas').waitFor({ state: 'visible' });
  report.checks.push('Navegación SPA y Atrás');
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--gs-text').trim().startsWith('#'));
  const contrast = [];
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    const pairs = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const pairs = [['--gs-text', '--gs-surface'], ['--gs-muted', '--gs-surface'], ['--gs-placeholder', '--gs-input'], ['--gs-on-blue', '--gs-blue'], ['--gs-error', '--gs-error-bg'], ['--gs-control-border', '--gs-input']];
      return pairs.map(([text, bg]) => ({ text, bg, foreground: style.getPropertyValue(text).trim(), background: style.getPropertyValue(bg).trim() }));
    });
    const luminance = hex => {
      if (hex.length === 4) hex = '#' + [...hex.slice(1)].map(c => c + c).join('');
      const values = hex.slice(1).match(/../g).map(x => parseInt(x, 16) / 255).map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    };
    for (const pair of pairs) {
      const a = luminance(pair.foreground), b = luminance(pair.background);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const minimum = pair.text === '--gs-control-border' ? 3 : 4.5;
      contrast.push({ theme, ...pair, ratio, minimum });
      assert(ratio >= minimum, `Contraste ${theme} ${pair.text}: ${ratio}`);
    }
    const applied = await page.evaluate(() => {
      const input = document.querySelector('inicio-sesion').shadowRoot.querySelector('#tipo');
      const root = getComputedStyle(document.documentElement);
      const rgb = hex => 'rgb(' + hex.slice(1).match(/../g).map(n => parseInt(n, 16)).join(', ') + ')';
      return {
        placeholder: getComputedStyle(input, '::placeholder').color,
        expectedPlaceholder: rgb(root.getPropertyValue('--gs-placeholder').trim()),
        border: getComputedStyle(input).borderColor,
        expectedBorder: rgb(root.getPropertyValue('--gs-control-border').trim()),
      };
    });
    assert.equal(applied.placeholder, applied.expectedPlaceholder, 'Placeholder del Shadow DOM no usa el color medido');
    assert.equal(applied.border, applied.expectedBorder, 'Borde del Shadow DOM no usa el color medido');
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      for (const hash of ['#pacientes', '#empleados']) {
        await page.goto(origin + '/' + hash);
        await page.locator(hash === '#pacientes' ? 'busqueda-citas' : 'inicio-sesion').waitFor({ state: 'visible' });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Desbordamiento ${width} ${hash}`);
        await page.screenshot({ path: path.join(output, `${theme}-${width}-${hash.slice(1)}.png`), fullPage: true });
      }
    }
  }
  report.contrast = contrast;
  report.checks.push('Responsive 390/768/1440, texto >=4.5:1 y bordes de controles >=3:1');
  // El evento es sintético: comprueba el flujo, no afirma una instalación real.
  await page.evaluate(() => {
    window.syntheticInstallCalls = 0;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = async () => { window.syntheticInstallCalls++; };
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
  });
  await page.getByRole('button', { name: 'Instalar aplicación' }).click();
  assert.equal(await page.evaluate(() => window.syntheticInstallCalls), 1);
  assert(await page.locator('[data-install]').isHidden());
  report.checks.push('beforeinstallprompt sintético: ofrece instalación y consume el prompt una sola vez');
  await page.getByRole('link', { name: 'Saltar al contenido' }).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'workspace');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cdp = await page.context().newCDPSession(page);
  const manifest = await cdp.send('Page.getAppManifest');
  assert.deepEqual(manifest.errors, []);
  report.installability = await cdp.send('Page.getInstallabilityErrors');
  // No se considera instalada por el hecho de disponer de manifest y SW.
  await page.context().setOffline(true);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('inicio-sesion').waitFor({ state: 'visible' });
  const employeeStatus = page.locator('inicio-sesion').locator('[data-status]');
  await employeeStatus.filter({ hasText: /Sin conexión/ }).waitFor({ state: 'visible' });
  const assets = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(r => new URL(r.url).pathname)))).flat());
  assert(assets.every(asset => !/synthetic-api|environment\.local|\/resources\/v[12]|\.pdf/.test(asset)));
  assert.deepEqual(errors, []);
  const coverage = await page.coverage.stopJSCoverage();
  const files = new Map();
  for (const entry of coverage) {
    const pathname = new URL(entry.url).pathname;
    if (!pathname.startsWith('/js/') || pathname.endsWith('.local.js')) continue;
    assert.equal(typeof entry.source, 'string', `Fuente V8 ausente: ${pathname}`);
    const measured = files.get(pathname) || { file: 'src' + pathname, sourceCharacters: entry.source.length,
      sha256: createHash('sha256').update(entry.source).digest('hex'), functions: 0, executedFunctions: 0 };
    measured.functions = Math.max(measured.functions, entry.functions.length);
    measured.executedFunctions = Math.max(measured.executedFunctions, entry.functions.filter(fn => fn.ranges[0]?.count > 0).length);
    files.set(pathname, measured);
  }
  report.browserCoverage = { scope: 'Funciones V8 de módulos del navegador; máximos por navegación, no sumar porcentajes con unitarias', files: [...files.values()].sort((a, b) => a.file.localeCompare(b.file)) };
  report.status = 'PASS';
  console.log(JSON.stringify({ status: report.status, checks: report.checks, measuredBrowserFiles: files.size }));
} catch (error) {
  report.status = 'FAIL'; report.error = error.message; throw error;
} finally {
  await writeFile(path.join(output, 'resultado.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
}
