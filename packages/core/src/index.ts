// Tipos
export * from './types/analysis.ts';
export * from './types/knowledge.ts';
export * from './types/observation.ts';
export * from './types/contribution.ts';

// Mensajes de producto
export { DESCARGO_RESPONSABILIDAD, MENSAJES } from './messages.ts';

// Seguridad
export {
  TERMINOS_PROHIBIDOS,
  esInseguro,
  filtrarLista,
  filtrarTexto,
  crearResumenSeguridad,
  registrarSupresion,
} from './safety/filter.ts';

// Parser
export { extraerObjetoJson } from './parser/extractJson.ts';
export { parsearRespuestaModelo, normalizarCertidumbre } from './parser/parseAnalysis.ts';
export type { AnalisisParcial } from './parser/parseAnalysis.ts';

// Conocimiento
export { normalizar, tokenizar } from './knowledge/normalize.ts';
export { InMemoryKnowledgeRepository } from './knowledge/KnowledgeRepository.ts';
export type { KnowledgeRepository } from './knowledge/KnowledgeRepository.ts';
export { construirAnalisis } from './knowledge/enrich.ts';
export { convertirSeedLegacy, CONFIANZA_SINTETICA } from './knowledge/legacySeed.ts';
export type { ArchivoLegacy } from './knowledge/legacySeed.ts';

// Prompt
export { PROMPT_SISTEMA, construirContexto, construirMensajeUsuario } from './prompt/systemPrompt.ts';

// Inferencia
export type {
  MotorInferencia,
  CapacidadesMotor,
  EntradaAnalisis,
  ResultadoTranscripcion,
  ResultadoVoz,
  ProgresoMotor,
} from './inference/MotorInferencia.ts';
export { NIVEL, REQUISITOS, nivelMaximoSoportado } from './inference/levels.ts';
export type { Nivel, RequisitosNivel, RecursosDispositivo } from './inference/levels.ts';
export { MotorKB } from './inference/MotorKB.ts';

/**
 * Tubería completa: salida cruda del modelo -> análisis listo para la UI.
 * Es el único punto que deben usar los motores con LLM.
 */
import { parsearRespuestaModelo } from './parser/parseAnalysis.ts';
import { construirAnalisis } from './knowledge/enrich.ts';
import type { RegistroConocimiento } from './types/knowledge.ts';
import type { Analisis } from './types/analysis.ts';

export function analizarSalidaModelo(
  textoCrudo: unknown,
  registro: RegistroConocimiento | null,
): Analisis {
  return construirAnalisis(parsearRespuestaModelo(textoCrudo), registro);
}
