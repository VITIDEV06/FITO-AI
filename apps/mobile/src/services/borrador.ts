import type { Analisis, OrigenObservacion } from '@fitoai/core';

/**
 * Borrador de la observación en curso, compartido entre las pantallas del
 * flujo (nueva observación -> analizando -> resultado).
 *
 * Es un módulo con estado en vez de un context porque el flujo es lineal y
 * de una sola instancia: no hay dos observaciones a la vez. Así las pantallas
 * no necesitan estar bajo un provider común y la navegación queda libre.
 */

export interface Borrador {
  descripcion: string;
  cultivo: string;
  fotoUri: string | null;
  transcripcion: string | null;
  origen: OrigenObservacion;
  analisis: Analisis | null;
  nivelMotor: number;
  observacionId: string | null;
}

function vacio(): Borrador {
  return {
    descripcion: '',
    cultivo: '',
    fotoUri: null,
    transcripcion: null,
    origen: 'texto',
    analisis: null,
    nivelMotor: 0,
    observacionId: null,
  };
}

let actual: Borrador = vacio();
const suscriptores = new Set<(b: Borrador) => void>();

export function leerBorrador(): Borrador {
  return actual;
}

export function actualizarBorrador(cambios: Partial<Borrador>): Borrador {
  actual = { ...actual, ...cambios };
  for (const fn of suscriptores) fn(actual);
  return actual;
}

export function reiniciarBorrador(): void {
  actual = vacio();
  for (const fn of suscriptores) fn(actual);
}

export function suscribirBorrador(fn: (b: Borrador) => void): () => void {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

/** Deduce el origen a partir de lo que el usuario aportó. */
export function calcularOrigen(b: Borrador): OrigenObservacion {
  if (b.fotoUri && b.descripcion.trim()) return 'foto+texto';
  if (b.fotoUri) return 'foto';
  if (b.transcripcion) return 'voz';
  return 'texto';
}
