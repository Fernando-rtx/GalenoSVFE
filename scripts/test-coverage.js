// Instrumentación nativa Node/V8; Mocha conserva sus suites y aserciones Chai/Sinon.
import { test } from 'node:test';
import { readdirSync } from 'node:fs';
import Mocha from 'mocha';

test('Suite unitaria Mocha bajo cobertura V8', async () => {
  const mocha = new Mocha({ timeout: 3000, forbidOnly: true, failZero: true, reporter: 'dot' });
  for (const name of readdirSync('test/unit').filter((name) => name.endsWith('.test.js')).sort()) {
    mocha.addFile(`test/unit/${name}`);
  }
  await mocha.loadFilesAsync();
  const failures = await new Promise((resolve) => mocha.run(resolve));
  if (failures) throw new Error(`${failures} pruebas Mocha fallaron`);
});
