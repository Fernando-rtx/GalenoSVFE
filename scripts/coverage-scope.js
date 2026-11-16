// El informe V8 incluye solo scripts cargados: publicar también los ausentes evita
// interpretar el porcentaje de los módulos importados como cobertura de toda la SPA.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const lcov = readFileSync(path.join(process.env.GALENOS_COVERAGE_DIR || 'coverage', 'lcov.info'), 'utf8');
const measured = new Set([...lcov.matchAll(/^SF:(.+)$/gm)].map((match) => match[1]));
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(dir, entry.name);
    return entry.isDirectory() ? files(name) : name.endsWith('.js') && !name.endsWith('.local.js') ? [name] : [];
  });
}
const missing = files('src').filter((file) => !measured.has(file)).sort();
const sum = (key) => [...lcov.matchAll(new RegExp(`^${key}:(\\d+)$`, 'gm'))]
  .reduce((total, match) => total + Number(match[1]), 0);
const report = {
  scope: 'Unitarias Mocha; V8 nativo. Porcentajes solo de scripts cargados, no toda la SPA.',
  measuredFiles: measured.size,
  lines: { covered: sum('LH'), total: sum('LF') },
  branches: { covered: sum('BRH'), total: sum('BRF') },
  functions: { covered: sum('FNH'), total: sum('FNF') },
  unmeasuredFiles: missing,
};
writeFileSync(path.join(process.env.GALENOS_COVERAGE_DIR || 'coverage', 'scope.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`V8: ${measured.size} archivos medidos; ${missing.length} archivos sin medición (${path.join(process.env.GALENOS_COVERAGE_DIR || 'coverage', 'scope.json')}).`);
