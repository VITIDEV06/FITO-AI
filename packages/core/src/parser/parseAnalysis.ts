import { extraerObjetoJson } from './extractJson.ts';
import {
  filtrarLista,
  filtrarTexto,
  crearResumenSeguridad,
  registrarSupresion,
} from '../safety/filter.ts';
import type { CausaPosible, NivelCertidumbre, ResumenSeguridad } from '../types/analysis.ts';
import { NIVELES_CERTIDUMBRE } from '../types/analysis.ts';

/**
 * Resultado de interpretar la salida cruda del modelo.
 *
 * CLAVE (BUG-1): esto NO rellena huecos. Devuelve exactamente lo que el modelo
 * aportó, ya filtrado. Rellenar aquí era lo que dejaba muerto el enriquecimiento
 * por knowledge base en el prototipo: los arrays nunca llegaban vacíos a la
 * fase de enriquecimiento, así que las guardas `length === 0` jamás disparaban.
 *
 * El orden correcto de la tubería es:
 *   parsear -> filtrar -> enriquecer con KB -> fallback genérico (último)
 */
export interface AnalisisParcial {
  cultivo: string | null;
  sintomas: string[];
  posiblesCausas: CausaPosible[];
  nivelCertidumbre: NivelCertidumbre | null;
  proximosPasos: string[];
  informacionFaltante: string[];
  preguntasSeguimiento: string[];
  /** true si se pudo interpretar un objeto JSON de la respuesta. */
  interpretado: boolean;
  seguridad: ResumenSeguridad;
}

export function parsearRespuestaModelo(textoCrudo: unknown): AnalisisParcial {
  const seguridad = crearResumenSeguridad();
  const datos = extraerObjetoJson(textoCrudo);

  if (!datos) {
    return {
      cultivo: null,
      sintomas: [],
      posiblesCausas: [],
      nivelCertidumbre: null,
      proximosPasos: [],
      informacionFaltante: [],
      preguntasSeguimiento: [],
      interpretado: false,
      seguridad,
    };
  }

  // BUG-2: el cultivo también pasa por el filtro.
  const cultivoFiltrado = filtrarTexto(leer(datos, 'cultivo', 'crop'));
  registrarSupresion(seguridad, 'cultivo', cultivoFiltrado.suprimidos);

  const sintomas = filtrarLista(leer(datos, 'sintomas', 'symptoms'));
  registrarSupresion(seguridad, 'sintomas', sintomas.suprimidos);

  const pasos = filtrarLista(leer(datos, 'proximos_pasos', 'proximosPasos', 'next_steps'));
  registrarSupresion(seguridad, 'proximosPasos', pasos.suprimidos);

  const faltante = filtrarLista(
    leer(datos, 'informacion_faltante', 'informacionFaltante', 'missing_info'),
  );
  registrarSupresion(seguridad, 'informacionFaltante', faltante.suprimidos);

  const preguntas = filtrarLista(
    leer(datos, 'preguntas_seguimiento', 'preguntasSeguimiento', 'follow_up_questions'),
  );
  registrarSupresion(seguridad, 'preguntasSeguimiento', preguntas.suprimidos);

  const causas = parsearCausas(leer(datos, 'posibles_causas', 'posiblesCausas', 'causes'));
  registrarSupresion(seguridad, 'posiblesCausas', causas.suprimidos);

  return {
    cultivo: cultivoFiltrado.valores[0] ?? null,
    sintomas: sintomas.valores,
    posiblesCausas: causas.valores,
    nivelCertidumbre: normalizarCertidumbre(
      leer(datos, 'nivel_certidumbre', 'nivelCertidumbre', 'confidence_level'),
    ),
    proximosPasos: pasos.valores,
    informacionFaltante: faltante.valores,
    preguntasSeguimiento: preguntas.valores,
    interpretado: true,
    seguridad,
  };
}

/** Acepta snake_case y camelCase para el mismo campo. */
function leer(datos: Record<string, unknown>, ...claves: string[]): unknown {
  for (const clave of claves) {
    const valor = datos[clave];
    if (valor !== undefined && valor !== null) return valor;
  }
  return undefined;
}

export function normalizarCertidumbre(valor: unknown): NivelCertidumbre | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim().toLowerCase();
  return (NIVELES_CERTIDUMBRE as readonly string[]).includes(limpio)
    ? (limpio as NivelCertidumbre)
    : null;
}

/** Las causas admiten string suelto u objeto {descripcion, confianza}. */
function parsearCausas(valor: unknown): { valores: CausaPosible[]; suprimidos: number } {
  if (!Array.isArray(valor)) return { valores: [], suprimidos: 0 };

  const valores: CausaPosible[] = [];
  let suprimidos = 0;

  for (const item of valor) {
    let descripcion: unknown;
    let confianza: number | undefined;

    if (typeof item === 'string') {
      descripcion = item;
    } else if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      descripcion = obj.descripcion ?? obj.causa ?? obj.description ?? obj.cause;
      const c = obj.confianza ?? obj.confidence;
      if (typeof c === 'number' && Number.isFinite(c)) {
        confianza = c > 1 ? Math.min(c / 100, 1) : Math.max(c, 0);
      }
    } else {
      continue;
    }

    const filtrada = filtrarTexto(descripcion);
    suprimidos += filtrada.suprimidos;
    const texto = filtrada.valores[0];
    if (texto) valores.push(confianza === undefined ? { descripcion: texto } : { descripcion: texto, confianza });
  }

  return { valores, suprimidos };
}
