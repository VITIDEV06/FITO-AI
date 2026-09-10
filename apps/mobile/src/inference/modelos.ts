import { NIVEL, type Nivel } from '@fitoai/core';

/** Estados del gestor de modelos. Coincide con el CHECK de model_registry. */
export type EstadoModelo =
  | 'ausente'
  | 'no_soportado'
  | 'verificando'
  | 'descargando'
  | 'parcial'
  | 'listo'
  | 'error';

export type TipoModelo = 'llm' | 'asr' | 'tts' | 'vlm';

export interface DefinicionModelo {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoModelo;
  nivel: Nivel;
  /** Constante exportada por @qvac/sdk. Se resuelve en tiempo de ejecución. */
  constanteQvac: string;
  /** Constante del proyector multimodal, sólo para VLM. */
  constanteProyector?: string;
  tamanoMb: number;
  ramMinimaMb: number;
  /** true si viaja dentro del APK en vez de descargarse. */
  enPaquete: boolean;
  /** Tamaño confirmado o estimado. Honestidad en la UI. */
  tamanoConfirmado: boolean;
}

/**
 * Catálogo de modelos.
 *
 * Orden de prioridad deliberado: la voz va ANTES que el LLM. Whisper pesa 17
 * veces menos y un agricultor con las manos sucias habla, no escribe. Es la
 * función con mejor relación valor/MB del proyecto.
 *
 * Tamaños confirmados contra HuggingFace; los marcados como no confirmados hay
 * que medirlos con `progress.total` en la primera descarga real.
 */
export const CATALOGO: DefinicionModelo[] = [
  {
    id: 'whisper-es-tiny',
    nombre: 'Voz en español',
    descripcion: 'Convierte lo que dices en texto, sin conexión.',
    tipo: 'asr',
    nivel: NIVEL.VOZ,
    constanteQvac: 'WHISPER_SPANISH_TINY_Q8_0',
    tamanoMb: 44,
    ramMinimaMb: 2048,
    enPaquete: false,
    tamanoConfirmado: false,
  },
  {
    id: 'llama-3.2-1b',
    nombre: 'Análisis con IA',
    descripcion: 'Interpreta tu observación en lenguaje natural. Se ejecuta en tu teléfono.',
    tipo: 'llm',
    nivel: NIVEL.LLM,
    constanteQvac: 'LLAMA_3_2_1B_INST_Q4_0',
    tamanoMb: 773,
    ramMinimaMb: 4096,
    enPaquete: false,
    tamanoConfirmado: true,
  },
  {
    id: 'supertonic-tts',
    nombre: 'Respuestas habladas',
    descripcion: 'FitoIA te lee el resultado en voz alta.',
    tipo: 'tts',
    nivel: NIVEL.COMPLETO,
    constanteQvac: 'TTS_MULTILINGUAL_SUPERTONIC3_Q8_0',
    tamanoMb: 100,
    ramMinimaMb: 4096,
    enPaquete: false,
    tamanoConfirmado: false,
  },
  {
    id: 'smolvlm2-500m',
    nombre: 'Análisis de fotos',
    descripcion: 'Mira la foto del cultivo además de leer tu descripción.',
    tipo: 'vlm',
    nivel: NIVEL.COMPLETO,
    constanteQvac: 'SMOLVLM2_500M_MULTIMODAL_Q8_0',
    constanteProyector: 'MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0',
    tamanoMb: 541,
    ramMinimaMb: 6144,
    enPaquete: false,
    tamanoConfirmado: false,
  },
];

export function modelo(id: string): DefinicionModelo | undefined {
  return CATALOGO.find((m) => m.id === id);
}

export function modelosDeNivel(nivel: Nivel): DefinicionModelo[] {
  return CATALOGO.filter((m) => m.nivel <= nivel);
}

/** Formato humano: "773 MB", "1,5 GB". */
export function formatearTamano(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1).replace('.', ',')} GB` : `${mb} MB`;
}
