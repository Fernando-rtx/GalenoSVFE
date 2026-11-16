import { expect } from 'chai';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = path.resolve('src');

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const name = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(name) : [name];
  }));
  return nested.flat();
}

suite('Límites del frontend sin dependencias de terceros', () => {
  test('usa un único Web Component como raíz visual del documento', async () => {
    const html = await readFile(path.join(sourceRoot, 'index.html'), 'utf8');
    const body = html.match(/<body>([\s\S]*?)<\/body>/i)?.[1].trim();

    expect(body).to.equal('<galenos-application></galenos-application>');
    expect(html).not.to.match(/<link[^>]+stylesheet/i);
    expect(html).to.match(/<script\s+type="module"\s+src="\/js\/main\.js"/i);
  });

  test('carga cascarón y estilos propios desde el componente raíz', async () => {
    const app = await readFile(
      path.join(sourceRoot, 'js/boundary/components/galenos-application.js'),
      'utf8',
    );
    const styles = await readFile(path.join(sourceRoot, 'resources/estilos/galenos.css'), 'utf8');

    expect(app).to.include("customElements.define('galenos-application'");
    expect(app).to.include('dashboard.css');
    expect(app).to.include('gestion.css');
    expect(app).to.include('galenos.css');
    expect(styles).to.include('galenos-application');
  });

  test('no descarga módulos, componentes o estilos de otro origen', async () => {
    const files = (await filesUnder(sourceRoot)).filter((file) => /\.(js|css|html)$/.test(file));
    const externalReferences = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');
      for (const match of source.matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g)) {
        const specifier = match[1];
        if (!specifier.startsWith('.') && !specifier.startsWith('/'))
          externalReferences.push(`${path.relative(sourceRoot, file)}: ${specifier}`);
      }
      if (/\.css$/.test(file) && /@import\s+url?\s*\(?\s*['"]?https?:/i.test(source))
        externalReferences.push(`${path.relative(sourceRoot, file)}: CSS remoto`);
    }

    const manifest = JSON.parse(await readFile(path.resolve('package.json'), 'utf8'));
    expect(externalReferences).to.deep.equal([]);
    expect(manifest.dependencies || {}).to.deep.equal({});
  });
});
