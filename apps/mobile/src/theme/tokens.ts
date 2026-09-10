/**
 * Tokens de diseño derivados de design/branding/.
 *
 * La identidad de FitoIA es hoja + circuito: verdes vegetales que degradan a
 * cian tecnológico sobre un fondo casi negro con tinte verde. Nada de esto se
 * inventó: sale de los logos oficiales.
 */

export const colores = {
  // Fondo: el negro verdoso de fitoai-logo-dark
  fondo: '#05100B',
  fondoElevado: '#0C1C14',
  superficie: '#12261B',
  superficieAlta: '#1A3325',
  borde: '#204632',
  bordeSuave: '#17301F',

  // Verdes de la hoja
  verde: '#3FBF4F',
  verdeClaro: '#6FDC5A',
  verdeOscuro: '#1E7A32',

  // Cian del circuito
  cian: '#22B6F0',
  cianClaro: '#5FD8FF',

  // Texto
  texto: '#EAF6EE',
  textoSuave: '#9DBCA9',
  textoTenue: '#6B8A78',

  // Estados
  exito: '#3FBF4F',
  aviso: '#E8B23A',
  peligro: '#E5484D',
  info: '#22B6F0',

  // Grises de apoyo
  overlay: 'rgba(5, 16, 11, 0.82)',
  transparente: 'transparent',
} as const;

/** Degradado de marca: hoja -> circuito. */
export const gradienteMarca = [colores.verde, colores.cian] as const;
export const gradienteSuperficie = ['#12261B', '#0C1C14'] as const;

export const espacio = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radio = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/**
 * Escala tipográfica. Pensada para leerse a pleno sol y con guantes:
 * cuerpo de 16 como mínimo, nada por debajo de 12.
 */
export const tipografia = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800' },
  titulo: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  subtitulo: { fontSize: 19, lineHeight: 25, fontWeight: '700' },
  cuerpoFuerte: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  cuerpo: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  pequeno: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  etiqueta: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.6 },
} as const;

/**
 * Altura mínima de cualquier elemento pulsable.
 * 44 es el mínimo de accesibilidad; en campo usamos 56 para las acciones
 * principales porque se usa de pie, en movimiento y con las manos sucias.
 */
export const tactil = {
  minimo: 48,
  comodo: 56,
  principal: 72,
} as const;

export const sombra = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

export const LOGOS = {
  icono: require('../../assets/branding/fitoai-app-icon.jpeg'),
  completo: require('../../assets/branding/fitoai-logo-general.jpeg'),
  oscuro: require('../../assets/branding/fitoai-logo-dark.jpeg'),
  claro: require('../../assets/branding/fitoai-logo-light.jpeg'),
} as const;
