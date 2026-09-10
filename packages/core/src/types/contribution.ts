/**
 * Aportes de conocimiento hechos por usuarios.
 *
 * REGLA DE PRODUCTO: un aporte NUNCA se convierte automáticamente en
 * conocimiento oficial. Nace 'pending' y solo una revisión explícita puede
 * moverlo a 'validated'. La UI debe separar visualmente ambos mundos.
 */

export type EstadoAporte = 'pending' | 'validated' | 'rejected' | 'archived';

export const ESTADOS_APORTE: readonly EstadoAporte[] = [
  'pending',
  'validated',
  'rejected',
  'archived',
];

/** Estado inicial obligatorio de todo aporte. */
export const ESTADO_APORTE_INICIAL: EstadoAporte = 'pending';

export interface Aporte {
  id: string;
  creadoEn: string;
  actualizadoEn: string;

  fotoUri: string | null;
  /** ¿Qué estás observando? */
  observacion: string;
  crop: string;
  symptoms: string[];
  descripcion: string;
  /** Contexto libre: clima, manejo, momento del ciclo. */
  informacionAdicional: string | null;

  /** Fuente que el usuario declara, si la tiene. Opcional. */
  source: string | null;
  sourceUrl: string | null;
  region: string | null;

  estado: EstadoAporte;
  /** Motivo de rechazo o nota de revisión. */
  notaRevision: string | null;
  revisadoEn: string | null;
}

export type NuevoAporte = Omit<
  Aporte,
  'id' | 'creadoEn' | 'actualizadoEn' | 'estado' | 'notaRevision' | 'revisadoEn'
>;

/** Transiciones permitidas. Nada puede saltar directo a 'validated' sin revisión. */
const TRANSICIONES: Record<EstadoAporte, EstadoAporte[]> = {
  pending: ['validated', 'rejected', 'archived'],
  validated: ['archived', 'rejected'],
  rejected: ['pending', 'archived'],
  archived: ['pending'],
};

export function puedeTransicionar(desde: EstadoAporte, hasta: EstadoAporte): boolean {
  return TRANSICIONES[desde]?.includes(hasta) ?? false;
}
