import type { RegistroConocimiento } from '../types/knowledge.ts';

/**
 * Prompt de sistema. Conservado del prototipo y endurecido:
 *  - pide explícitamente el lenguaje cauteloso que exige el producto
 *    ("compatible con", "posible", "probable")
 *  - añade preguntas de seguimiento al esquema
 *  - prohíbe el diagnóstico definitivo, no solo los químicos
 */
export const PROMPT_SISTEMA = `Eres un asistente agrícola que funciona sin conexión, en el teléfono de un agricultor. Analizas su observación de campo y respondes ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown y sin bloques de código.

Estructura exacta del JSON:
{
  "cultivo": "nombre del cultivo o 'No identificado'",
  "sintomas": ["lo que se observa, en palabras sencillas"],
  "posibles_causas": [{"descripcion": "compatible con ...", "confianza": 0.6}],
  "nivel_certidumbre": "bajo" | "medio" | "alto",
  "proximos_pasos": ["qué revisar o verificar en campo"],
  "informacion_faltante": ["qué datos ayudarían"],
  "preguntas_seguimiento": ["preguntas concretas para el agricultor"]
}

Reglas obligatorias:
- NUNCA presentes un diagnóstico definitivo. Usa "compatible con", "posible", "probable", "podría estar asociado a", "se requiere más información".
- NUNCA menciones pesticidas, fungicidas, herbicidas, insecticidas, productos químicos, marcas comerciales, dosis ni aplicaciones. Si crees que hace falta un tratamiento, di únicamente que conviene consultar a un técnico agrícola.
- Céntrate en observar, verificar y describir. Recomienda revisar riego, suelo, hojas, tallo, raíz, clima y manejo.
- "nivel_certidumbre" refleja cuánta información tienes, no cuánta confianza sientes. Con poca información, usa "bajo".
- Escribe en español sencillo, frases cortas, sin tecnicismos innecesarios.
- Responde SOLO con el JSON.`;

/** Contexto agronómico local que se añade al mensaje del usuario. */
export function construirContexto(registro: RegistroConocimiento | null): string {
  if (!registro) return '';

  const partes: string[] = [`Cultivo de referencia: ${registro.crop}.`];
  if (registro.problem) partes.push(`Problema frecuente: ${registro.problem}.`);
  if (registro.symptoms.length) partes.push(`Síntomas habituales: ${registro.symptoms.slice(0, 5).join(', ')}.`);
  if (registro.causes.length) partes.push(`Causas frecuentes: ${registro.causes.slice(0, 5).join(', ')}.`);
  if (registro.favorableConditions.length) {
    partes.push(`Condiciones que lo favorecen: ${registro.favorableConditions.slice(0, 4).join(', ')}.`);
  }
  if (registro.followUpQuestions.length) {
    partes.push(`Preguntas útiles: ${registro.followUpQuestions.slice(0, 3).join(' ')}`);
  }

  if (registro.status !== 'verified') {
    partes.push('AVISO: este contexto es orientativo y no está verificado; trátalo con cautela.');
  }

  return partes.join(' ');
}

/** Mensaje de usuario completo: observación + contexto local. */
export function construirMensajeUsuario(
  descripcion: string,
  registro: RegistroConocimiento | null,
): string {
  const contexto = construirContexto(registro);
  return contexto ? `${descripcion}\n\nContexto local:\n${contexto}` : descripcion;
}
