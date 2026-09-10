const DIACRITICOS = /[̀-ͯ]/g;
const NO_ALFANUMERICO = /[^a-z0-9ñ\s]/g;

/** Normaliza texto para comparar: minúsculas, sin acentos, sin espacios extra. */
export function normalizar(texto: unknown): string {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Palabras del texto, sin signos, para hacer coincidencias por síntoma. */
export function tokenizar(texto: unknown): string[] {
  return normalizar(texto)
    .replace(NO_ALFANUMERICO, ' ')
    .split(' ')
    .filter((t) => t.length > 3); // descarta artículos y preposiciones
}
