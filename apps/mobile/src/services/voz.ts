import { File, Paths } from 'expo-file-system';
import { obtenerMotor } from '../inference/registro';

/**
 * Puente de voz: grabación -> transcripción local -> síntesis local.
 *
 * Todo ocurre en el dispositivo. Si el modelo de voz no está descargado, las
 * funciones devuelven null y la pantalla ofrece escribir en su lugar: nunca
 * se cae a un servicio en la nube.
 */

export async function transcribirArchivo(uri: string): Promise<string | null> {
  const { motor } = await obtenerMotor();
  if (!motor.transcribir) return null;

  try {
    const base64 = await new File(uri).base64();
    const { texto } = await motor.transcribir(base64);
    return texto || null;
  } catch {
    return null;
  }
}

export interface RespuestaHablada {
  texto: string;
  audioUri: string | null;
}

/** Sintetiza y deja el audio en un fichero temporal reproducible. */
export async function hablar(texto: string): Promise<RespuestaHablada> {
  const { motor } = await obtenerMotor();
  if (!motor.hablar) return { texto, audioUri: null };

  try {
    const resultado = await motor.hablar(texto);
    if (!resultado.audio) return { texto: resultado.texto, audioUri: null };

    // El WAV se escribe como bytes directamente: nada de rodeos por base64.
    const archivo = new File(Paths.cache, `fito-voz-${Date.now()}.wav`);
    archivo.write(resultado.audio);
    return { texto: resultado.texto, audioUri: archivo.uri };
  } catch {
    return { texto, audioUri: null };
  }
}

/** Resumen hablado del análisis: corto, cauteloso y útil en voz alta. */
export function resumirParaVoz(cultivo: string, causas: string[], pasos: string[]): string {
  const partes: string[] = [];

  partes.push(
    cultivo && cultivo !== 'Cultivo no identificado'
      ? `Parece un cultivo de ${cultivo}.`
      : 'No pude identificar el cultivo con seguridad.',
  );

  if (causas[0]) partes.push(`Lo que observas es compatible con ${causas[0]}.`);
  if (pasos[0]) partes.push(`Te sugiero: ${pasos[0]}.`);
  partes.push('Recuerda que esto es orientativo, no un diagnóstico.');

  return partes.join(' ');
}
