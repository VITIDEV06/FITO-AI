import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { nivelMaximoSoportado, type Nivel, type RecursosDispositivo } from '@fitoai/core';

/**
 * Requisitos reales de QVAC en móvil, verificados en
 * https://docs.qvac.tether.io/system-requirements :
 *
 *   Android  12+ (API 31), arm64 ÚNICAMENTE, Vulkan / OpenCL (Adreno 700+)
 *   iOS      17.0+, arm64, Metal
 *   RAM      >= 4 GB total ("por debajo de 4 GB la mayoría de LLMs no cargan")
 *   Disco    >= 5 GB libres
 *   Nunca en emulador ni simulador.
 *
 * Comprobado en los paquetes publicados: @qvac/fabric, @qvac/llm-llamacpp,
 * @qvac/asr-ggml y @qvac/tts-ggml sólo traen prebuilds `android-arm64`.
 * No existe android-x86, android-x64 ni arm de 32 bits.
 */

export const ANDROID_API_MINIMO = 31; // Android 12
export const IOS_MINIMO = 17;

export interface DiagnosticoDispositivo extends RecursosDispositivo {
  esDispositivoFisico: boolean;
  modelo: string;
  sistema: string;
  /** Por qué no se soporta, si es el caso. Se muestra al usuario. */
  motivoNoSoportado: string | null;
  nivelMaximo: Nivel;
}

function arquitecturaArm64(): boolean {
  // expo-device expone las ABIs soportadas en Android.
  const abis = Device.supportedCpuArchitectures ?? [];
  if (Platform.OS === 'android') {
    return abis.some((a) => a.toLowerCase().includes('arm64'));
  }
  // Todo iPhone con iOS 17 es arm64.
  return Platform.OS === 'ios';
}

function versionSoSoportada(): boolean {
  if (Platform.OS === 'android') {
    return typeof Platform.Version === 'number' && Platform.Version >= ANDROID_API_MINIMO;
  }
  if (Platform.OS === 'ios') {
    const mayor = Number.parseInt(String(Device.osVersion ?? '0'), 10);
    return Number.isFinite(mayor) && mayor >= IOS_MINIMO;
  }
  return false;
}

export async function diagnosticar(discoLibreMb: number): Promise<DiagnosticoDispositivo> {
  const esFisico = Device.isDevice;
  const arqOk = arquitecturaArm64();
  const soOk = versionSoSoportada();
  const ramTotalMb = Math.round((Device.totalMemory ?? 0) / (1024 * 1024));

  const recursos: RecursosDispositivo = {
    ramTotalMb,
    discoLibreMb,
    // Un emulador nunca podrá cargar los addons nativos: lo tratamos como
    // arquitectura no soportada para que la app degrade a Nivel 0 en vez de
    // fallar al cargar el modelo.
    arquitecturaSoportada: arqOk && esFisico,
    versionSoSoportada: soOk,
  };

  return {
    ...recursos,
    esDispositivoFisico: esFisico,
    modelo: Device.modelName ?? 'Dispositivo desconocido',
    sistema: `${Platform.OS} ${Device.osVersion ?? ''}`.trim(),
    motivoNoSoportado: explicar(esFisico, arqOk, soOk, ramTotalMb),
    nivelMaximo: nivelMaximoSoportado(recursos),
  };
}

function explicar(
  esFisico: boolean,
  arqOk: boolean,
  soOk: boolean,
  ramMb: number,
): string | null {
  if (!esFisico) {
    return 'Estás en un emulador. Los modelos de IA local sólo funcionan en un teléfono real.';
  }
  if (!arqOk) {
    return 'Este teléfono no es de 64 bits (arm64). FitoIA funcionará con la base de conocimiento local.';
  }
  if (!soOk) {
    return Platform.OS === 'android'
      ? 'Se necesita Android 12 o superior para la IA local. Puedes usar la base de conocimiento.'
      : 'Se necesita iOS 17 o superior para la IA local. Puedes usar la base de conocimiento.';
  }
  if (ramMb > 0 && ramMb < 4096) {
    return `Este teléfono tiene ${(ramMb / 1024).toFixed(1)} GB de memoria. La IA local necesita 4 GB. Puedes usar la base de conocimiento.`;
  }
  return null;
}
