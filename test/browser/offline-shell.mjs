// Integración con Chromium y servidor estático real; nunca usa el backend.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.env.GALENOS_SRC || fileURLToPath(new URL('../../src/', import.meta.url));
const types = { js: 'text/javascript', css: 'text/css', html: 'text/html', webmanifest: 'application/manifest+json' };
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/synthetic-api/consultas') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end('[{"nota":"dato clínico sintético"}]');
    }
    const body = await readFile(root + (path === '/' ? '/index.html' : path));
    res.writeHead(200, { 'Content-Type': types[path === '/' ? 'html' : path.split('.').pop()] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}`;
  await page.goto(url);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  assert.equal(await page.evaluate(async () => (await fetch('/synthetic-api/consultas')).ok), true);
  // Sin una segunda carga online: descubre dependencias ausentes del precache.
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('busqueda-citas').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('.header-login').click();
  await page.locator('inicio-sesion').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => location.hash), '#empleados');
  await context.setOffline(true);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('inicio-sesion').waitFor({ state: 'visible' });
  await page.getByText(/Sin conexión/).first().waitFor();
  assert.equal(await page.evaluate(async () => { try { await fetch('/synthetic-api/consultas'); return true; } catch { return false; } }), false);
  const paths = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(r => new URL(r.url).pathname)))).flat());
  assert(paths.every(path => !/synthetic-api|environment\.local|\/resources\/v[12]|\.pdf/.test(path)));
  assert.deepEqual(errors, []);
  console.log('PASS: instalación nueva, servidor detenido, recarga, navegación SPA, desconexión y caché sin datos clínicos.');
} finally {
  await browser.close();
  if (server.listening) await new Promise(resolve => server.close(resolve));
}
