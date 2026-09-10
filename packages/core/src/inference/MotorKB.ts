import type {
  CapacidadesMotor,
  EntradaAnalisis,
  MotorInferencia,
} from './MotorInferencia.ts';
import { NIVEL } from './levels.ts';
import type { KnowledgeRepository } from '../knowledge/KnowledgeRepository.ts';
import { construirAnalisis } from '../knowledge/enrich.ts';
import type { AnalisisParcial } from '../parser/parseAnalysis.ts';
import { crearResumenSeguridad } from '../safety/filter.ts';
import type { Analisis } from '../types/analysis.ts';

/**
 * Nivel 0: análisis sin ningún modelo de IA.
 *
 * No es un placeholder ni un mock: consulta la base de conocimiento local y
 * devuelve un análisis real, determinista y trazable. Es lo que hace que la
 * app sirva en un teléfono que nunca podrá cargar un LLM, y también el
 * fallback cuando el modelo no está descargado o falla.
 *
 * Reutiliza exactamente la misma tubería de enriquecimiento y seguridad que
 * los motores con LLM, simplemente entrando con un parcial vacío.
 */
export class MotorKB implements MotorInferencia {
  readonly id = 'kb';
  readonly nivel = NIVEL.KB;

  // Campo explícito en vez de parameter property: así el fichero es
  // "type-strippable" y Node puede ejecutar el TS directamente en los tests.
  private readonly conocimiento: KnowledgeRepository;

  constructor(conocimiento: KnowledgeRepository) {
    this.conocimiento = conocimiento;
  }

  capacidades(): CapacidadesMotor {
    return {
      analisisTexto: true,
      analisisImagen: false,
      transcripcion: false,
      sintesisVoz: false,
    };
  }

  async estaDisponible(): Promise<boolean> {
    return true; // funciona siempre, en cualquier dispositivo
  }

  async inicializar(): Promise<void> {
    // Sin modelos que cargar.
  }

  async liberar(): Promise<void> {
    // Sin recursos que liberar.
  }

  async analizar(entrada: EntradaAnalisis): Promise<Analisis> {
    const registro = this.conocimiento.mejorCoincidencia(
      entrada.descripcion,
      entrada.cultivo ?? null,
    );

    // Parcial vacío: no hubo modelo. Todo el contenido saldrá de la KB o,
    // si no hay coincidencia, de los textos genéricos cautelosos.
    const parcial: AnalisisParcial = {
      cultivo: null,
      sintomas: [],
      posiblesCausas: [],
      nivelCertidumbre: null,
      proximosPasos: [],
      informacionFaltante: [],
      preguntasSeguimiento: [],
      interpretado: false,
      seguridad: crearResumenSeguridad(),
    };

    return construirAnalisis(parcial, registro);
  }
}
