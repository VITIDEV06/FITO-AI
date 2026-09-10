/**
 * Textos que ve el agricultor.
 *
 * BUG-5 corregido: el prototipo mostraba "No se pudo procesar la respuesta del
 * modelo" como si fuera un síntoma. Eso es un log, no un mensaje de producto.
 *
 * BUG-4 (descargo duplicado): existía UNA sola fuente de verdad para el
 * descargo de responsabilidad. Antes había tres copias con dos textos.
 */

export const DESCARGO_RESPONSABILIDAD =
  'FitoIA ofrece orientación preliminar generada en tu propio dispositivo. ' +
  'No es un diagnóstico definitivo y no sustituye la evaluación de un ' +
  'técnico agrícola.';

/** Redacción cautelosa obligatoria. Ver .opencode/rules/04-safety.md */
export const MENSAJES = {
  sinCultivo: 'Cultivo no identificado',

  sintomasGenericos: [
    'Revisa el aspecto general de la planta y anota los cambios recientes',
    'Compara las hojas nuevas con las más viejas',
  ],

  causasGenericas: [
    'Posible causa no confirmada: hace falta más información del cultivo y del entorno',
  ],

  pasosGenericos: [
    'Observa la planta de cerca y compárala con las de alrededor',
    'Revisa la humedad del suelo y los riegos recientes',
    'Vuelve a mirar en unos días para ver si avanza',
  ],

  faltanteGenerico: [
    'Tipo de cultivo',
    'Tiempo desde que aparecieron los síntomas',
    'Condiciones de riego y humedad',
  ],

  preguntasGenericas: [
    '¿Qué cultivo es?',
    '¿Cuánto tiempo llevan así?',
    '¿Cambió algo en el riego o el clima?',
  ],

  /** Se muestra cuando el análisis salió solo de la KB, sin LLM. */
  avisoSinModelo:
    'Análisis basado en la base de conocimiento local. Para un análisis más ' +
    'detallado, descarga el modelo de lenguaje desde Estado.',

  /** Se muestra cuando el contenido de la KB es sintético. */
  avisoConocimientoSintetico:
    'Contenido de demostración, no verificado agronómicamente.',
} as const;
