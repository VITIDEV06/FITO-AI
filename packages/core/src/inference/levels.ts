/**
 * Niveles de servicio.
 *
 * Decisión de arquitectura: la app NUNCA muestra un muro por tener el teléfono
 * equivocado. Degrada. El nivel 0 no necesita ningún modelo y funciona en
 * cualquier Android; los superiores se activan si el dispositivo cumple.
 *
 * Requisitos de QVAC en móvil (docs.qvac.tether.io/system-requirements):
 * Android 12+, arm64-v8a, >=4 GB de RAM, >=5 GB de disco. iOS 17+, arm64.
 */

export const NIVEL = {
  /** Base de conocimiento local. Sin IA. Sin descargas. */
  KB: 0,
  /** + dictado por voz (Whisper local). */
  VOZ: 1,
  /** + análisis con LLM local. */
  LLM: 2,
  /** + síntesis de voz y visión. */
  COMPLETO: 3,
} as const;

export type Nivel = (typeof NIVEL)[keyof typeof NIVEL];

export interface RequisitosNivel {
  nivel: Nivel;
  nombre: string;
  descripcion: string;
  /** RAM total mínima en MB. */
  ramMinimaMb: number;
  /** Descarga adicional aproximada en MB sobre el nivel anterior. */
  descargaMb: number;
}

export const REQUISITOS: Record<Nivel, RequisitosNivel> = {
  [NIVEL.KB]: {
    nivel: NIVEL.KB,
    nombre: 'Conocimiento local',
    descripcion: 'Consulta la base agrícola del dispositivo. No requiere descargas.',
    ramMinimaMb: 0,
    descargaMb: 0,
  },
  [NIVEL.VOZ]: {
    nivel: NIVEL.VOZ,
    nombre: 'Dictado por voz',
    descripcion: 'Describe lo que observas hablando, sin escribir.',
    ramMinimaMb: 2048,
    descargaMb: 44,
  },
  [NIVEL.LLM]: {
    nivel: NIVEL.LLM,
    nombre: 'Análisis con IA local',
    descripcion: 'Analiza tu observación con un modelo de lenguaje en el teléfono.',
    ramMinimaMb: 4096,
    descargaMb: 773,
  },
  [NIVEL.COMPLETO]: {
    nivel: NIVEL.COMPLETO,
    nombre: 'Voz y visión',
    descripcion: 'Respuestas habladas y análisis de fotos.',
    ramMinimaMb: 6144,
    descargaMb: 641,
  },
};

export interface RecursosDispositivo {
  ramTotalMb: number;
  discoLibreMb: number;
  arquitecturaSoportada: boolean;
  versionSoSoportada: boolean;
}

/** Nivel máximo que el dispositivo puede alcanzar. Siempre al menos KB. */
export function nivelMaximoSoportado(recursos: RecursosDispositivo): Nivel {
  if (!recursos.arquitecturaSoportada || !recursos.versionSoSoportada) return NIVEL.KB;

  const niveles: Nivel[] = [NIVEL.COMPLETO, NIVEL.LLM, NIVEL.VOZ];
  for (const nivel of niveles) {
    const req = REQUISITOS[nivel];
    if (recursos.ramTotalMb >= req.ramMinimaMb) return nivel;
  }
  return NIVEL.KB;
}
