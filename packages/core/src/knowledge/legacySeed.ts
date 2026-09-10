import type { ColeccionConocimiento, RegistroConocimiento } from '../types/knowledge.ts';

/**
 * Conversión del formato del prototipo (data/conocimiento_agricola.json) al
 * esquema con procedencia.
 *
 * IMPORTANTE: ese contenido se creó como datos sintéticos para probar el
 * prototipo. NO es conocimiento agronómico verificado. Todo registro que salga
 * de aquí queda marcado `status: 'synthetic'` con `confidence` baja y sin
 * fuente, y la UI debe mostrarlo como material de demostración.
 */

interface CultivoLegacy {
  nombre?: string;
  aliases?: string[];
  sintomasComunes?: string[];
  posiblesCausas?: string[];
  recomendaciones?: string[];
  preguntas?: string[];
  informacionFaltante?: string[];
}

export interface ArchivoLegacy {
  cultivos?: CultivoLegacy[];
}

export const CONFIANZA_SINTETICA = 0.25;

export function convertirSeedLegacy(archivo: ArchivoLegacy): ColeccionConocimiento {
  const registros: RegistroConocimiento[] = (archivo.cultivos ?? [])
    .filter((c): c is CultivoLegacy & { nombre: string } => Boolean(c?.nombre))
    .map((cultivo) => ({
      id: `synthetic:${slug(cultivo.nombre)}`,
      crop: cultivo.nombre,
      aliases: cultivo.aliases ?? [],
      problem: '', // el formato legacy no distinguía problemas
      symptoms: cultivo.sintomasComunes ?? [],
      causes: cultivo.posiblesCausas ?? [],
      favorableConditions: [],
      severity: 'desconocida',
      management: cultivo.recomendaciones ?? [],
      prevention: [],
      followUpQuestions: cultivo.preguntas ?? [],
      missingInfo: cultivo.informacionFaltante ?? [],
      source: null,
      sourceUrl: null,
      publicationDate: null,
      region: null,
      reviewedAt: null,
      confidence: CONFIANZA_SINTETICA,
      status: 'synthetic',
    }));

  return { version: 1, defaultStatus: 'synthetic', registros };
}

function slug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
