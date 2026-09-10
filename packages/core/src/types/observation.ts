import type { Analisis } from './analysis.ts';

/** Cómo entró la observación. Determina qué motor hizo falta. */
export type OrigenObservacion = 'texto' | 'voz' | 'foto' | 'foto+texto';

export interface Observacion {
  id: string;
  /** ISO 8601. */
  creadoEn: string;
  actualizadoEn: string;

  /** Lo que dijo o escribió el agricultor, sin transformar. */
  descripcion: string;
  cultivo: string;
  /** URI local de la foto (expo-file-system). Nunca se sube a ningún sitio. */
  fotoUri: string | null;
  /** Transcripción cruda cuando el origen fue voz. */
  transcripcion: string | null;
  origen: OrigenObservacion;

  analisis: Analisis | null;
  /** Nivel de motor que produjo el análisis. Ver inference/levels.ts */
  nivelMotor: number;
  notas: string | null;
}

export type NuevaObservacion = Omit<Observacion, 'id' | 'creadoEn' | 'actualizadoEn'>;
