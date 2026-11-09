import { expect } from 'chai';
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../../src/', import.meta.url);

describe('PWA: recursos y límite de caché', () => {
  it('referencia iconos PNG existentes y un inicio dentro del scope', async () => {
    const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'));
    expect(manifest.start_url).to.equal('/');
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
    expect(caught(request('/js/app/main.js', true))).to.equal(false);
    expect(caught(request('/js/config/environment.local.js'))).to.equal(false);
    expect(caught(request('/js/app/main.js'))).to.equal(true);
  });
});
