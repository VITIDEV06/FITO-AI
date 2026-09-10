import type { AnalisisParcial } from '../parser/parseAnalysis.ts';
import type { Analisis, CausaPosible, OrigenAnalisis } from '../types/analysis.ts';
import type { RegistroConocimiento } from '../types/knowledge.ts';
import { filtrarLista, registrarSupresion } from '../safety/filter.ts';
import { DESCARGO_RESPONSABILIDAD, MENSAJES } from '../messages.ts';

/**
 * Combina lo que aportó el modelo con la base de conocimiento local y, solo
 * al final, con textos genéricos.
 *
 * BUG-1 corregido. En el prototipo el parser rellenaba los huecos ANTES de
 * llegar aquí, así que las guardas `length === 0` nunca disparaban y todo el
 * enriquecimiento por KB era código muerto: de la KB solo sobrevivían el
 * nombre del cultivo y la subida de certidumbre. Ahora el orden es
 *
 *     modelo  ->  knowledge base  ->  genérico
 *
 * y cada campo toma el primer nivel que tenga contenido real.
 *
 * BUG-3 corregido. Lo que viene de la KB pasa TAMBIÉN por el filtro de
 * seguridad. La KB no es de fiar por construcción: crecerá con aportes de
 * usuarios, y un aporte validado por error no debe saltarse la barrera.
 */
export function construirAnalisis(
  parcial: AnalisisParcial,
  registro: RegistroConocimiento | null,
): Analisis {
  const seguridad = parcial.seguridad;

  /** Toma del modelo; si no hay, de la KB (filtrada); si no, genérico. */
  const resolver = (
    delModelo: string[],
    deKb: string[] | undefined,
    campo: string,
    generico: readonly string[],
  ): { valores: string[]; usoKb: boolean } => {
    if (delModelo.length) return { valores: delModelo, usoKb: false };

    if (registro && deKb?.length) {
      const filtrado = filtrarLista(deKb);
      registrarSupresion(seguridad, `kb.${campo}`, filtrado.suprimidos);
      if (filtrado.valores.length) return { valores: filtrado.valores, usoKb: true };
    }

    return { valores: [...generico], usoKb: false };
  };

  const sintomas = resolver(parcial.sintomas, registro?.symptoms, 'sintomas', MENSAJES.sintomasGenericos);
  const pasos = resolver(
    parcial.proximosPasos,
    [...(registro?.management ?? []), ...(registro?.prevention ?? [])],
    'proximosPasos',
    MENSAJES.pasosGenericos,
  );
  const faltante = resolver(
    parcial.informacionFaltante,
    registro?.missingInfo,
    'informacionFaltante',
    MENSAJES.faltanteGenerico,
  );
  const preguntas = resolver(
    parcial.preguntasSeguimiento,
    registro?.followUpQuestions,
    'preguntasSeguimiento',
    MENSAJES.preguntasGenericas,
  );
  const causas = resolverCausas(parcial.posiblesCausas, registro, seguridad);

  const usoKb =
    sintomas.usoKb || pasos.usoKb || faltante.usoKb || preguntas.usoKb || causas.usoKb;

  return {
    cultivo: parcial.cultivo ?? registro?.crop ?? MENSAJES.sinCultivo,
    sintomas: sintomas.valores,
    posiblesCausas: causas.valores,
    nivelCertidumbre: resolverCertidumbre(parcial, registro),
    proximosPasos: pasos.valores,
    informacionFaltante: faltante.valores,
    preguntasSeguimiento: preguntas.valores,
    descargoResponsabilidad: DESCARGO_RESPONSABILIDAD,
    origen: resolverOrigen(parcial, usoKb),
    seguridad,
  };
}

function resolverCausas(
  delModelo: CausaPosible[],
  registro: RegistroConocimiento | null,
  seguridad: Analisis['seguridad'],
): { valores: CausaPosible[]; usoKb: boolean } {
  if (delModelo.length) return { valores: delModelo, usoKb: false };

  if (registro?.causes?.length) {
    const filtrado = filtrarLista(registro.causes);
    registrarSupresion(seguridad, 'kb.posiblesCausas', filtrado.suprimidos);
    if (filtrado.valores.length) {
      return {
        valores: filtrado.valores.map((descripcion) => ({
          descripcion,
          confianza: registro.confidence,
        })),
        usoKb: true,
      };
    }
  }

  return { valores: MENSAJES.causasGenericas.map((descripcion) => ({ descripcion })), usoKb: false };
}

/**
 * La certidumbre nunca sube por encima de lo que el modelo declaró salvo que
 * la KB aporte contexto verificado. Un registro sintético no da confianza.
 */
function resolverCertidumbre(
  parcial: AnalisisParcial,
  registro: RegistroConocimiento | null,
): Analisis['nivelCertidumbre'] {
  const base = parcial.nivelCertidumbre ?? 'bajo';
  if (!registro || base !== 'bajo') return base;
  return registro.status === 'verified' ? 'medio' : 'bajo';
}

function resolverOrigen(parcial: AnalisisParcial, usoKb: boolean): OrigenAnalisis {
  const aportoModelo =
    parcial.interpretado &&
    (parcial.sintomas.length > 0 ||
      parcial.posiblesCausas.length > 0 ||
      parcial.proximosPasos.length > 0);

  if (aportoModelo && usoKb) return 'mixto';
  if (aportoModelo) return 'modelo';
  if (usoKb) return 'conocimiento';
  return 'fallback';
}
