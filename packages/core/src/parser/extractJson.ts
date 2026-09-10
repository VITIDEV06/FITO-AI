/**
 * Extracción defensiva de JSON de la salida de un LLM.
 *
 * BUG-4 corregido: el prototipo usaba /\{[\s\S]*\}/, que captura desde la
 * PRIMERA llave hasta la ÚLTIMA. Con dos objetos, o con prosa que contenga
 * llaves, el match resultaba inválido y se perdía una respuesta recuperable.
 *
 * Aquí se escanean candidatos con balanceo de llaves, respetando cadenas y
 * escapes, y se devuelve el primer objeto que parsee correctamente.
 */

export function extraerObjetoJson(texto: unknown): Record<string, unknown> | null {
  if (typeof texto !== 'string' || !texto) return null;

  for (const candidato of candidatosJson(texto)) {
    try {
      const valor: unknown = JSON.parse(candidato);
      if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
        return valor as Record<string, unknown>;
      }
    } catch {
      // candidato inválido; seguimos con el siguiente
    }
  }

  return null;
}

/** Genera cada bloque {...} balanceado del texto, en orden de aparición. */
function* candidatosJson(texto: string): Generator<string> {
  for (let i = 0; i < texto.length; i += 1) {
    if (texto[i] !== '{') continue;
    const fin = buscarCierre(texto, i);
    if (fin === -1) return; // no hay cierre posible a partir de aquí
    yield texto.slice(i, fin + 1);
    // No saltamos a `fin`: un objeto exterior malformado puede contener uno
    // interior válido, y queremos poder recuperarlo.
  }
}

/** Índice de la llave que cierra la abierta en `inicio`, o -1. */
function buscarCierre(texto: string, inicio: number): number {
  let profundidad = 0;
  let enCadena = false;
  let escapado = false;

  for (let i = inicio; i < texto.length; i += 1) {
    const c = texto[i];

    if (enCadena) {
      if (escapado) escapado = false;
      else if (c === '\\') escapado = true;
      else if (c === '"') enCadena = false;
      continue;
    }

    if (c === '"') enCadena = true;
    else if (c === '{') profundidad += 1;
    else if (c === '}') {
      profundidad -= 1;
      if (profundidad === 0) return i;
    }
  }

  return -1;
}
