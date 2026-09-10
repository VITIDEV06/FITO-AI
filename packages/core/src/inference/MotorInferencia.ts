import type { Analisis } from '../types/analysis.ts';

/** Capacidades que un motor puede ofrecer. La UI se adapta a esto. */
export interface CapacidadesMotor {
  analisisTexto: boolean;
  analisisImagen: boolean;
  transcripcion: boolean;
  sintesisVoz: boolean;
}

export interface EntradaAnalisis {
  /** Lo que escribió o dictó el agricultor. */
  descripcion: string;
  cultivo?: string | null;
  /** Ruta local de la foto. El motor decide si puede usarla. */
  fotoUri?: string | null;
}

export interface ResultadoTranscripcion {
  texto: string;
}

export interface ResultadoVoz {
  /** PCM/WAV. null si el motor no puede sintetizar y hay que caer a texto. */
  audio: Uint8Array | null;
  texto: string;
}

/** Progreso de una operación larga (cargar o descargar modelos). */
export interface ProgresoMotor {
  etapa: string;
  porcentaje: number;
}

/**
 * Contrato único de inferencia.
 *
 * Implementaciones:
 *   - MotorKB          nivel 0, sin modelos, funciona en cualquier teléfono
 *   - MotorQvac        niveles 1-3, QVAC sobre Bare Kit en el dispositivo
 *   - MotorQvacDesktop prototipo de escritorio (packages/qvac-desktop)
 */
export interface MotorInferencia {
  readonly id: string;
  readonly nivel: number;

  capacidades(): CapacidadesMotor;
  /** ¿Puede funcionar aquí y ahora? (modelos presentes, RAM suficiente) */
  estaDisponible(): Promise<boolean>;
  inicializar(onProgreso?: (p: ProgresoMotor) => void): Promise<void>;
  liberar(): Promise<void>;

  analizar(entrada: EntradaAnalisis): Promise<Analisis>;
  transcribir?(audio: Uint8Array | string): Promise<ResultadoTranscripcion>;
  hablar?(texto: string): Promise<ResultadoVoz>;
}
