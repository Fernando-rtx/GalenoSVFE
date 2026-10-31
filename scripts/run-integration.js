import { access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import Mocha from 'mocha';

if (process.env.GALENO_INTEGRATION_PROFILE === 'development') {
  await import('./run-development-integration.js');
} else {
const configUrl = process.env.GALENO_INTEGRATION_CONFIG
  ? pathToFileURL(path.resolve(process.env.GALENO_INTEGRATION_CONFIG))
  : new URL('../test/integration/environment.local.js', import.meta.url);

try {
  await access(configUrl);
  const environment = await import(configUrl.href);
  const { validateIntegrationEnvironment, registerIntegrationSuite } = await import('../test/integration/backend-suite.js');
  validateIntegrationEnvironment(environment);
  const mocha = new Mocha({ timeout: environment.config.timeoutMs + 2000, forbidOnly: true, failZero: true });
  mocha.suite.emit('pre-require', globalThis, 'backend-suite.js', mocha);
  registerIntegrationSuite(environment);
  mocha.run(failures => { process.exitCode = failures ? 1 : 0; });
} catch (error) {
  console.error(`INTEGRACIÓN NO EJECUTADA: ${error.message}`);
  console.error('Configura un backend activo y casos sintéticos en test/integration/environment.local.js. Consulta docs/acceso-datos.md.');
  process.exitCode = 1;
}

}
