import type { ResumenSeguridad } from '../types/analysis.ts';

/**
 * Filtro de seguridad agrícola.
 *
 * Regla (.opencode/rules/04-safety.md): FITOAI no recomienda productos
 * químicos, dosis ni aplicaciones. Apoya la observación, no la prescribe.
 *
 * Correcciones respecto al prototipo de escritorio:
 *  - BUG-2: ahora también se filtra el campo `cultivo`, no solo los arrays.
 *  - BUG-3: se aplica TAMBIÉN al contenido inyectado desde la base de
 *    conocimiento, no solo a lo que devuelve el modelo. La KB no es de fiar
 *    por definición: puede crecer con aportes de usuarios.
 *  - BUG-6: la supresión deja rastro (`ResumenSeguridad`) en vez de ser
 *    silenciosa.
 */

export const TERMINOS_PROHIBIDOS =
  /pesticida|insecticida|fungicida|herbicida|acaricida|plaguicida|nematicida|rodenticida|repelente|agroquimic|agroquímic|quimic|químic|dosis|dosific|fumig|rociar|rociad|asperj|aspersion|aspersión|toxic|tóxic|veneno|glifosato|clorotalonil|mancozeb|imidacloprid/i;

/** true si el texto contiene contenido que no debemos mostrar. */
export function esInseguro(texto: unknown): boolean {
  return typeof texto === 'string' && TERMINOS_PROHIBIDOS.test(texto);
}

export interface ResultadoFiltrado<T> {
  valores: T[];
  suprimidos: number;
}

/** Deja solo strings no vacíos y seguros. Cuenta lo eliminado. */
export function filtrarLista(lista: unknown): ResultadoFiltrado<string> {
  if (!Array.isArray(lista)) return { valores: [], suprimidos: 0 };

  const valores: string[] = [];
  let suprimidos = 0;

  for (const item of lista) {
    if (typeof item !== 'string') continue; // no es supresión por seguridad: es basura
    const limpio = item.trim();
    if (!limpio) continue;
    if (esInseguro(limpio)) {
      suprimidos += 1;
      continue;
    }
    valores.push(limpio);
  }

  return { valores, suprimidos };
}

/** Un texto suelto (p. ej. el nombre del cultivo). Devuelve null si es inseguro. */
export function filtrarTexto(texto: unknown): ResultadoFiltrado<string> {
  if (typeof texto !== 'string') return { valores: [], suprimidos: 0 };
  const limpio = texto.trim();
  if (!limpio) return { valores: [], suprimidos: 0 };
  if (esInseguro(limpio)) return { valores: [], suprimidos: 1 };
  return { valores: [limpio], suprimidos: 0 };
}

const AVISO =
  'Se omitió parte del contenido generado porque mencionaba productos o dosis. ' +
  'FitoIA no recomienda tratamientos químicos: consulta a un técnico agrícola.';

export function crearResumenSeguridad(): ResumenSeguridad {
  return { contenidoSuprimido: false, suprimidosPorCampo: {} };
}

/** Acumula supresiones sobre un resumen mutable. */
export function registrarSupresion(
  resumen: ResumenSeguridad,
  campo: string,
  cantidad: number,
): void {
  if (cantidad <= 0) return;
  resumen.suprimidosPorCampo[campo] = (resumen.suprimidosPorCampo[campo] ?? 0) + cantidad;
  resumen.contenidoSuprimido = true;
  resumen.aviso = AVISO;
}
