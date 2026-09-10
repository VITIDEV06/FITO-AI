/**
 * Esquema de la base de conocimiento agrícola.
 *
 * REGLA DE PRODUCTO: nada aquí es conocimiento oficial hasta que su `status`
 * sea 'verified' y tenga `source` + `reviewedAt`. El seed actual proveniente de
 * data/conocimiento_agricola.json es 'synthetic' y así debe presentarse.
 */

export type EstadoConocimiento =
  | 'verified' // revisado contra fuente agronómica citable
  | 'unverified' // origen real pero sin revisión
  | 'synthetic' // generado para prototipo, NO es conocimiento real
  | 'demo'; // material de demostración

export type Severidad = 'baja' | 'media' | 'alta' | 'desconocida';

/** Solo 'verified' puede presentarse al usuario como conocimiento agrícola. */
export function esConocimientoOficial(estado: EstadoConocimiento): boolean {
  return estado === 'verified';
}

export interface RegistroConocimiento {
  id: string;
  crop: string;
  /** Alias y variantes regionales del nombre del cultivo. */
  aliases: string[];
  /** Problema o condición observada. Vacío en registros genéricos de cultivo. */
  problem: string;
  symptoms: string[];
  causes: string[];
  /** Condiciones que favorecen el problema (humedad, temperatura, manejo). */
  favorableConditions: string[];
  severity: Severidad;
  /** Manejo general y verificación en campo. Nunca dosis ni producto concreto. */
  management: string[];
  prevention: string[];
  followUpQuestions: string[];
  /** Qué datos faltan típicamente para afinar este caso. */
  missingInfo: string[];

  // --- Procedencia. Obligatoria para que un registro llegue a 'verified'. ---
  source: string | null;
  sourceUrl: string | null;
  publicationDate: string | null;
  region: string | null;
  reviewedAt: string | null;
  /** Confianza del registro en sí, 0..1. */
  confidence: number;
  status: EstadoConocimiento;
}

export interface ColeccionConocimiento {
  version: number;
  /** Estado por defecto de los registros de esta colección. */
  defaultStatus: EstadoConocimiento;
  registros: RegistroConocimiento[];
}
