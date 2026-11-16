// Los informes van a un directorio temporal escribible, sin cambiar permisos del repositorio.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = mkdtempSync(join(tmpdir(), 'galenos-coverage-'));
console.log(`Informes de cobertura: ${directory}`);
const result = spawnSync(process.execPath, [
  '--test', '--experimental-test-coverage', '--test-coverage-include=src/**/*.js',
  '--test-reporter=spec', '--test-reporter-destination=stdout',
  '--test-reporter=lcov', `--test-reporter-destination=${join(directory, 'lcov.info')}`,
  'scripts/test-coverage.js',
], { stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
const scope = spawnSync(process.execPath, ['scripts/coverage-scope.js'], {
  stdio: 'inherit', env: { ...process.env, GALENOS_COVERAGE_DIR: directory },
});
if (scope.error) throw scope.error;
process.exitCode = scope.status || 0;
