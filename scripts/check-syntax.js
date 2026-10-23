import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? collect(file) : Promise.resolve(/\.(?:js|cjs)$/.test(file) ? [file] : []);
  }));
  return groups.flat();
}

const files = (await Promise.all(['src', 'test', 'scripts'].map(collect))).flat().concat('bs-config.cjs');
let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}
if (failed) process.exitCode = 1;
else console.log(`Sintaxis válida: ${files.length} archivos.`);
