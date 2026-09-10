/**
 * Regenera data/knowledge/seed.synthetic.json desde el JSON del prototipo.
 *
 * El contenido de origen es SINTÉTICO: se creó para probar el prototipo y no
 * es conocimiento agronómico verificado. El conversor lo marca como tal.
 *
 *   node scripts/generar-seed.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertirSeedLegacy } from '../packages/core/src/knowledge/legacySeed.ts';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = path.join(RAIZ, 'data', 'conocimiento_agricola.json');
const DESTINO = path.join(RAIZ, 'data', 'knowledge', 'seed.synthetic.json');

const legacy = JSON.parse(fs.readFileSync(ORIGEN, 'utf8'));
const coleccion = convertirSeedLegacy(legacy);

fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(DESTINO, `${JSON.stringify(coleccion, null, 2)}\n`, 'utf8');

console.log(`✓ ${coleccion.registros.length} registros -> ${path.relative(RAIZ, DESTINO)}`);
console.log(`  status: ${coleccion.defaultStatus} (NO es conocimiento verificado)`);
