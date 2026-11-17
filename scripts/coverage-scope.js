// El informe V8 incluye solo scripts cargados: publicar también los ausentes evita
// interpretar el porcentaje de los módulos importados como cobertura de toda la SPA.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
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
// La cobertura DOM se obtiene en Chromium, no importando módulos con DOM falso para inflar V8.
let browser = null;
try { browser = JSON.parse(readFileSync('coverage/browser/resultado.json', 'utf8')); } catch { /* No ejecutada. */ }
const browserFiles = new Map((browser?.status === 'PASS' ? browser.browserCoverage.files : []).map(item => [item.file, item]));
const coverageFor = (file) => {
  const item = browserFiles.get(file);
  if (!item) return false;
  const currentHash = createHash('sha256').update(readFileSync(file)).digest('hex');
  return item.sha256 === currentHash;
};
const report = {
  scope: 'Unitarias Mocha/V8. La cobertura de navegador se informa aparte, sin sumar porcentajes.',
  measuredFiles: measured.size,
  lines: { covered: sum('LH'), total: sum('LF') },
  branches: { covered: sum('BRH'), total: sum('BRF') },
  functions: { covered: sum('FNH'), total: sum('FNF') },
  unmeasuredFiles: missing,
  browser: { status: browser?.status || 'NO EJECUTADA', generatedAt: browser?.generatedAt || null,
    currentMeasuredFiles: [...browserFiles.keys()].filter(coverageFor) },
  outsideUnitScope: missing.map(file => ({ file,
    reason: /(?:main|environment\.example)\.js$/.test(file) ? 'Punto de entrada o configuración pública'
      : file.includes('/boundary/') ? 'Presentación y ciclo de vida del navegador'
      : 'Lógica pendiente de prueba unitaria',
    browserMeasuredCurrentSource: coverageFor(file),
  })),
};
writeFileSync(path.join(process.env.GALENOS_COVERAGE_DIR || 'coverage', 'scope.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`V8: ${measured.size} archivos medidos; ${missing.length} fuera de medición unitaria. Chromium: ${report.browser.currentMeasuredFiles.length} fuentes vigentes medidas por separado.`);
