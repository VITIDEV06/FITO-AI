import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { InMemoryKnowledgeRepository } from '../knowledge/KnowledgeRepository.ts';
import { convertirSeedLegacy } from '../knowledge/legacySeed.ts';
import type { ColeccionConocimiento, RegistroConocimiento } from '../types/knowledge.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..', '..', '..');

/** Carga el seed sintético real del repositorio. */
export function cargarSeed(): ColeccionConocimiento {
  const ruta = join(RAIZ, 'data', 'knowledge', 'seed.synthetic.json');
  return JSON.parse(readFileSync(ruta, 'utf8')) as ColeccionConocimiento;
}

export function repositorioSeed(): InMemoryKnowledgeRepository {
  return new InMemoryKnowledgeRepository(cargarSeed().registros);
}

/** Convierte desde el JSON legacy, para probar la migración. */
export function repositorioLegacy(): InMemoryKnowledgeRepository {
  const ruta = join(RAIZ, 'data', 'conocimiento_agricola.json');
  const legacy = JSON.parse(readFileSync(ruta, 'utf8')) as Parameters<
    typeof convertirSeedLegacy
  >[0];
  return new InMemoryKnowledgeRepository(convertirSeedLegacy(legacy).registros);
}

/** Registro de prueba con los campos que necesite cada test. */
export function registro(parcial: Partial<RegistroConocimiento> = {}): RegistroConocimiento {
  return {
    id: 'test:x',
    crop: 'cultivo-de-prueba',
    aliases: [],
    problem: '',
    symptoms: [],
    causes: [],
    favorableConditions: [],
    severity: 'desconocida',
    management: [],
    prevention: [],
    followUpQuestions: [],
    missingInfo: [],
    source: null,
    sourceUrl: null,
    publicationDate: null,
    region: null,
    reviewedAt: null,
    confidence: 0.5,
    status: 'unverified',
    ...parcial,
  };
}
