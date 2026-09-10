/**
 * Forma canónica del análisis. UNA sola nomenclatura (camelCase).
 * El prototipo de escritorio emitía además una copia en snake_case; esa
 * redundancia se elimina aquí y el mapeo, si hace falta, vive en el borde.
 */

/** Nivel de certidumbre. Nunca se presenta como diagnóstico definitivo. */
export type NivelCertidumbre = 'bajo' | 'medio' | 'alto';

export const NIVELES_CERTIDUMBRE: readonly NivelCertidumbre[] = ['bajo', 'medio', 'alto'];

/** De dónde salió cada parte del resultado. Permite ser honestos en la UI. */
export type OrigenAnalisis =
  | 'modelo' // el LLM local respondió y se pudo interpretar
  | 'conocimiento' // se usó la base de conocimiento local
  | 'mixto' // el modelo respondió y la KB completó huecos
  | 'fallback'; // no hubo respuesta utilizable; texto cauteloso genérico

export interface CausaPosible {
  /** Redacción cautelosa: "compatible con", "posible", "probable". */
  descripcion: string;
  /** 0..1. Opcional: solo cuando hay base para estimarla. */
  confianza?: number;
}

export interface Analisis {
  cultivo: string;
  /** Qué se observa, en lenguaje del agricultor. */
  sintomas: string[];
  posiblesCausas: CausaPosible[];
  nivelCertidumbre: NivelCertidumbre;
  /** Pasos de verificación y manejo general. Nunca prescripción química. */
  proximosPasos: string[];
  /** Qué datos ayudarían a afinar la observación. */
  informacionFaltante: string[];
  /** Preguntas concretas de seguimiento para el agricultor. */
  preguntasSeguimiento: string[];
  descargoResponsabilidad: string;
  origen: OrigenAnalisis;
  /** Trazabilidad del filtro de seguridad. Ver safety/filter.ts */
  seguridad: ResumenSeguridad;
}

export interface ResumenSeguridad {
  /** true si el filtro eliminó al menos un elemento. */
  contenidoSuprimido: boolean;
  /** Cuántos elementos se eliminaron, por campo. */
  suprimidosPorCampo: Record<string, number>;
  /** Mensaje mostrable al usuario cuando hubo supresión. */
  aviso?: string;
}
