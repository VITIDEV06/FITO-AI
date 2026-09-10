import type { NivelCertidumbre, OrigenAnalisis } from '@fitoai/core';
import { colores } from '../theme/tokens';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export function fechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${fechaCorta(iso)}, ${hh}:${mm}`;
}

/** "hace 2 horas", "ayer". Más útil que una fecha para lo reciente. */
export function haceCuanto(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const minutos = Math.floor((Date.now() - d) / 60000);

  if (minutos < 1) return 'ahora mismo';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return fechaCorta(iso);
}

export const CERTIDUMBRE: Record<NivelCertidumbre, { etiqueta: string; color: string; fraccion: number }> = {
  bajo: { etiqueta: 'Baja', color: colores.aviso, fraccion: 0.33 },
  medio: { etiqueta: 'Media', color: colores.cian, fraccion: 0.66 },
  alto: { etiqueta: 'Alta', color: colores.verde, fraccion: 1 },
};

/**
 * Cómo explicamos el origen del análisis al agricultor.
 * Ser honesto sobre de dónde sale la respuesta es parte del producto.
 */
export const ORIGEN: Record<OrigenAnalisis, { etiqueta: string; detalle: string; color: string }> = {
  modelo: {
    etiqueta: 'IA LOCAL',
    detalle: 'Analizado por el modelo de IA de tu teléfono.',
    color: colores.cian,
  },
  mixto: {
    etiqueta: 'IA + CONOCIMIENTO',
    detalle: 'El modelo de tu teléfono, completado con la base agrícola local.',
    color: colores.verde,
  },
  conocimiento: {
    etiqueta: 'CONOCIMIENTO LOCAL',
    detalle: 'Basado en la base agrícola guardada en tu teléfono, sin modelo de IA.',
    color: colores.verdeClaro,
  },
  fallback: {
    etiqueta: 'ORIENTACIÓN GENERAL',
    detalle: 'No hubo datos suficientes para un análisis específico. Añade más detalles o una foto.',
    color: colores.textoTenue,
  },
};
