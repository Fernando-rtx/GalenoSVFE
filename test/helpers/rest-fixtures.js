import { readFileSync } from 'node:fs';

// Datos exclusivamente sintéticos, según test/fixtures/README.md y contrato 0.2.
const read = name => JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));
export const TIPOS = read('tipo-documento.json');
export const CLINICAS = read('clinicas-demo.json');
export const CONSULTAS = read('consulta-demo.json');
