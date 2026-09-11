import {
  InMemoryKnowledgeRepository,
  type Aporte,
  type KnowledgeRepository,
  type ColeccionConocimiento,
  type RegistroConocimiento,
} from '@fitoai/core';
import { abrirBd, aJson, ahora, deJson, idNuevo } from './db';

// Semilla sintética que se embarca con la app. NO es conocimiento verificado.
import seed from '../../assets/seed/seed.synthetic.json';

interface FilaConocimiento {
  id: string;
  crop: string;
  aliases_json: string;
  problem: string;
  symptoms_json: string;
  causes_json: string;
  favorable_json: string;
  severity: string;
  management_json: string;
  prevention_json: string;
  follow_up_json: string;
  missing_info_json: string;
  source: string | null;
  source_url: string | null;
  publication_date: string | null;
  region: string | null;
  reviewed_at: string | null;
  confidence: number;
  status: string;
}

function aModelo(f: FilaConocimiento): RegistroConocimiento {
  return {
    id: f.id,
    crop: f.crop,
    aliases: deJson<string[]>(f.aliases_json, []),
    problem: f.problem,
    symptoms: deJson<string[]>(f.symptoms_json, []),
    causes: deJson<string[]>(f.causes_json, []),
    favorableConditions: deJson<string[]>(f.favorable_json, []),
    severity: f.severity as RegistroConocimiento['severity'],
    management: deJson<string[]>(f.management_json, []),
    prevention: deJson<string[]>(f.prevention_json, []),
    followUpQuestions: deJson<string[]>(f.follow_up_json, []),
    missingInfo: deJson<string[]>(f.missing_info_json, []),
    source: f.source,
    sourceUrl: f.source_url,
    publicationDate: f.publication_date,
    region: f.region,
    reviewedAt: f.reviewed_at,
    confidence: f.confidence,
    status: f.status as RegistroConocimiento['status'],
  };
}

/** Inserta la semilla la primera vez. No pisa lo que ya haya. */
export async function sembrarConocimiento(): Promise<void> {
  const bd = await abrirBd();
  const fila = await bd.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM knowledge');
  if ((fila?.n ?? 0) > 0) return;

  const coleccion = seed as ColeccionConocimiento;

  await bd.withTransactionAsync(async () => {
    for (const r of coleccion.registros) {
      await bd.runAsync(
        `INSERT OR REPLACE INTO knowledge
           (id, crop, aliases_json, problem, symptoms_json, causes_json, favorable_json,
            severity, management_json, prevention_json, follow_up_json, missing_info_json,
            source, source_url, publication_date, region, reviewed_at, confidence, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        r.id, r.crop, aJson(r.aliases), r.problem, aJson(r.symptoms), aJson(r.causes),
        aJson(r.favorableConditions), r.severity, aJson(r.management), aJson(r.prevention),
        aJson(r.followUpQuestions), aJson(r.missingInfo), r.source, r.sourceUrl,
        r.publicationDate, r.region, r.reviewedAt, r.confidence, r.status,
      );
    }
  });
}

let cache: InMemoryKnowledgeRepository | null = null;

/**
 * Carga el conocimiento y lo indexa en memoria una sola vez.
 *
 * Son pocos cientos de registros: cabe de sobra y evita ir a SQLite en cada
 * análisis. El prototipo de escritorio releía y parseaba el JSON hasta 4 veces
 * por análisis; aquí se indexa una vez y se invalida al escribir.
 */
export async function repositorioConocimiento(): Promise<KnowledgeRepository> {
  if (cache) return cache;
  const bd = await abrirBd();
  const filas = await bd.getAllAsync<FilaConocimiento>('SELECT * FROM knowledge');
  cache = new InMemoryKnowledgeRepository(filas.map(aModelo));
  return cache;
}

export function invalidarCacheConocimiento(): void {
  cache = null;
}

/**
 * Convierte un aporte ya VALIDATED en un registro de la base de conocimiento.
 *
 * Solo se llama desde el panel de validación, después de que
 * `cambiarEstadoAporte` haya aceptado la transición pending -> validated. El
 * registro nace con status 'unverified': viene de un agricultor real y pasó
 * revisión local, pero no está contrastado contra una fuente agronómica
 * citable, así que `esConocimientoOficial()` sigue devolviendo false para él
 * y nunca sube la certidumbre de un análisis (ver enrich.ts). Que aparezca
 * aquí es lo que lo saca de la lista personal 'pending' y lo pone a
 * disposición de `mejorCoincidencia` para futuros análisis.
 */
export async function promoverConocimientoDesdeAporte(aporte: Aporte): Promise<void> {
  const bd = await abrirBd();
  await bd.runAsync(
    `INSERT INTO knowledge
       (id, crop, aliases_json, problem, symptoms_json, causes_json, favorable_json,
        severity, management_json, prevention_json, follow_up_json, missing_info_json,
        source, source_url, publication_date, region, reviewed_at, confidence, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    idNuevo(),
    aporte.crop,
    aJson([]),
    aporte.observacion,
    aJson(aporte.symptoms),
    aJson([]),
    aJson([]),
    'desconocida',
    aJson([]),
    aJson([]),
    aJson([]),
    aJson([]),
    aporte.source ?? 'Aporte de agricultor, validado localmente en la app',
    aporte.sourceUrl,
    null,
    aporte.region,
    ahora(),
    0.4,
    'unverified',
  );
  invalidarCacheConocimiento();
}

export async function contarPorEstado(): Promise<Record<string, number>> {
  const bd = await abrirBd();
  const filas = await bd.getAllAsync<{ status: string; n: number }>(
    'SELECT status, COUNT(*) AS n FROM knowledge GROUP BY status',
  );
  return Object.fromEntries(filas.map((f) => [f.status, f.n]));
}
