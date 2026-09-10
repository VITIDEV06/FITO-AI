import { MotorKB, NIVEL, type EntradaAnalisis, type MotorInferencia, type Analisis } from '@fitoai/core';
import { repositorioConocimiento } from '../storage/conocimiento';
import { MotorQvacMobile } from './MotorQvacMobile';
import { diagnosticar, type DiagnosticoDispositivo } from './dispositivo';
import { espacioLibreMb } from '../services/almacenamiento';

/**
 * Selecciona el mejor motor disponible y garantiza que SIEMPRE hay uno.
 *
 * Esta es la pieza que hace real la decisión de arquitectura: la app no muestra
 * un muro por tener el teléfono equivocado. Si QVAC no está instalado, si el
 * dispositivo no cumple requisitos o si el modelo falla al cargar, se usa
 * MotorKB y la app sigue siendo útil.
 */

export interface EstadoMotor {
  motor: MotorInferencia;
  diagnostico: DiagnosticoDispositivo;
  /** Nivel realmente activo, que puede ser menor que el máximo soportado. */
  nivelActivo: number;
  /** Por qué no se está usando un nivel superior. Se muestra en Estado. */
  motivoDegradacion: string | null;
}

let estado: EstadoMotor | null = null;
let cargando: Promise<EstadoMotor> | null = null;

export async function obtenerMotor(): Promise<EstadoMotor> {
  if (estado) return estado;
  cargando ??= inicializar();
  estado = await cargando;
  cargando = null;
  return estado;
}

async function inicializar(): Promise<EstadoMotor> {
  const conocimiento = await repositorioConocimiento();
  const diagnostico = await diagnosticar(await espacioLibreMb());
  const motorKb = new MotorKB(conocimiento);

  if (diagnostico.nivelMaximo === NIVEL.KB) {
    return {
      motor: motorKb,
      diagnostico,
      nivelActivo: NIVEL.KB,
      motivoDegradacion: diagnostico.motivoNoSoportado,
    };
  }

  const qvac = new MotorQvacMobile(conocimiento, diagnostico.nivelMaximo);
  if (!(await qvac.estaDisponible())) {
    return {
      motor: motorKb,
      diagnostico,
      nivelActivo: NIVEL.KB,
      motivoDegradacion:
        'El motor de IA local todavía no está instalado en esta compilación. ' +
        'FitoIA funciona con la base de conocimiento del teléfono.',
    };
  }

  try {
    await qvac.inicializar();
    return { motor: qvac, diagnostico, nivelActivo: diagnostico.nivelMaximo, motivoDegradacion: null };
  } catch (error) {
    return {
      motor: motorKb,
      diagnostico,
      nivelActivo: NIVEL.KB,
      motivoDegradacion: `No se pudo cargar el modelo de IA: ${mensajeDeError(error)}. Se usa la base de conocimiento.`,
    };
  }
}

/**
 * Analiza con el mejor motor y, si falla, reintenta con la base de
 * conocimiento. El agricultor siempre obtiene una respuesta.
 */
export async function analizar(entrada: EntradaAnalisis): Promise<{ analisis: Analisis; nivel: number }> {
  const actual = await obtenerMotor();

  try {
    return { analisis: await actual.motor.analizar(entrada), nivel: actual.nivelActivo };
  } catch {
    const conocimiento = await repositorioConocimiento();
    const respaldo = new MotorKB(conocimiento);
    return { analisis: await respaldo.analizar(entrada), nivel: NIVEL.KB };
  }
}

export function reiniciarMotor(): void {
  void estado?.motor.liberar();
  estado = null;
  cargando = null;
}

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : 'error desconocido';
}
