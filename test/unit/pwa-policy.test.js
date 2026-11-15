import { expect } from 'chai';
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../../src/', import.meta.url);

describe('PWA: recursos y límite de caché', () => {
  it('referencia iconos PNG existentes y un inicio dentro del scope', async () => {
    const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'));
    expect(manifest.start_url).to.equal('/#academico');
    expect(manifest.scope).to.equal('/');
    for (const size of ['192x192', '512x512']) {
      const icon = manifest.icons.find((item) => item.sizes === size);
      expect(icon?.type).to.equal('image/png');
      await access(new URL(icon.src.slice(1), root));
    }
  });

  it('solo intercepta recursos públicos y deja pasar respuestas clínicas y Authorization', async () => {
    const handlers = {};
    const self = {
      location: { origin: 'https://galenos.example' },
      addEventListener(type, listener) {
        handlers[type] = listener;
      },
      skipWaiting() {},
      clients: { claim() {} },
    };
    vm.runInNewContext(await readFile(new URL('service-worker.js', root), 'utf8'), {
      self,
      URL,
      fetch() {
        return Promise.resolve({ ok: false, type: 'error' });
      },
      caches: {},
    });
    const request = (path, authorization = false) => ({
      method: 'GET',
      url: `https://galenos.example${path}`,
      mode: 'cors',
      headers: {
        has(name) {
          return authorization && name === 'Authorization';
        },
      },
    });
    const caught = (req) => {
      let intercepted = false;
      handlers.fetch({
        request: req,
        respondWith() {
          intercepted = true;
        },
      });
      return intercepted;
    };
    expect(caught(request('/api/consultas'))).to.equal(false);
    expect(caught(request('/js/main.js', true))).to.equal(false);
    expect(caught(request('/js/control/environment.local.js'))).to.equal(false);
    expect(caught(request('/js/main.js'))).to.equal(true);
  });
});

describe('PWA: almacenamiento y recuperación del shell público', () => {
  let handlers, stored, removed, pending, network, cached, assets;
  beforeEach(async () => {
    handlers = {}; stored = []; removed = []; pending = []; assets = [];
    network = async () => ({ ok: true, type: 'basic', headers: new Headers(), clone: () => 'shell' });
    cached = undefined;
    vm.runInNewContext(await readFile(new URL('service-worker.js', root), 'utf8'), {
      URL,
      self: {
        location: { origin: 'https://galenos.example' },
        addEventListener: (name, listener) => { handlers[name] = listener; },
        skipWaiting() {}, clients: { claim: async () => {} },
      },
      fetch: (...args) => network(...args),
      caches: {
        open: async () => ({
          put: async (...args) => { stored.push(args); },
          addAll: async (paths) => { assets = Array.from(paths); },
        }),
        keys: async () => ['galenossv-shell-old', 'otra-aplicacion'],
        delete: async (key) => { removed.push(key); },
        match: async () => cached,
      },
    }, { filename: new URL('service-worker.js', root).pathname });
  });
  async function fetchShell() {
    let response;
    handlers.fetch({
      request: { url: 'https://galenos.example/js/main.js', method: 'GET',
        mode: 'cors', headers: new Headers() },
      respondWith: (promise) => { response = promise; },
      waitUntil: (promise) => pending.push(promise),
    });
    const result = await response;
    await Promise.all(pending);
    return result;
  }
  it('precarga únicamente rutas públicas existentes y nunca configuración local ni REST', async () => {
    handlers.install({ waitUntil: (promise) => pending.push(promise) });
    await Promise.all(pending);
    expect(assets).to.include('/js/main.js');
    for (const path of assets) {
      expect(path).not.to.match(/environment\.local|\/v[12]\/|\.pdf|\?/);
      await access(new URL(path === '/' ? 'index.html' : path.slice(1), root));
    }
  });
  it('elimina versiones antiguas sin borrar cachés de otras aplicaciones', async () => {
    handlers.activate({ waitUntil: (promise) => pending.push(promise) });
    await Promise.all(pending);
    expect(removed).to.deep.equal(['galenossv-shell-old']);
  });
  it('almacena una respuesta pública exitosa', async () => {
    await fetchShell();
    expect(stored).to.deep.equal([['/js/main.js', 'shell']]);
  });
  for (const headers of [{ 'Cache-Control': 'no-store' }, { 'Cache-Control': 'private' },
    { 'Set-Cookie': 'synthetic=1' }]) {
    it(`no almacena una respuesta sensible: ${Object.keys(headers)} ${Object.values(headers)}`, async () => {
      network = async () => ({ ok: true, type: 'basic', headers: new Headers(headers) });
      await fetchShell();
      expect(stored).to.deep.equal([]);
    });
  }
  it('recupera el shell público al perder conexión y falla si no existe copia', async () => {
    network = async () => { throw new TypeError('sin red'); };
    cached = { contenido: 'shell sintético' };
    expect(await fetchShell()).to.equal(cached);
    cached = undefined;
    const { rejection } = await import('../helpers/http-fixture.js');
    expect((await rejection(fetchShell())).message).to.equal('Sin conexión para este recurso');
    expect(stored).to.deep.equal([]);
  });
});
