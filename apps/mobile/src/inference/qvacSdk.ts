/**
 * Puente hacia @qvac/sdk.
 *
 * El SDK NO está en las dependencias de la app a propósito: sus addons nativos
 * pesan más de 1,5 GB y la app tiene que funcionar en Nivel 0 sin ellos. Se
 * instala aparte con `npm run qvac:install`.
 *
 * Por eso la carga es dinámica y tolerante al fallo: si el paquete no está,
 * `cargarSdk()` devuelve null y la app degrada a MotorKB en vez de reventar.
 *
 * Integración móvil (docs.qvac.tether.io/tutorials/expo):
 *   1. npm run qvac:install
 *   2. app.json  -> plugins: ["@qvac/sdk/expo-plugin",
 *                             ["expo-build-properties", {"android":{"minSdkVersion":31}}]]
 *   3. qvac.config.json en la raíz de apps/mobile:
 *        { "plugins": ["@qvac/sdk/llamacpp-completion/plugin",
 *                      "@qvac/sdk/whispercpp-transcription/plugin",
 *                      "@qvac/sdk/tts-ggml/plugin"] }
 *   4. npx expo prebuild
 *   5. npx expo run:android --device   (dispositivo físico: no hay emulador)
 */

export interface ProgresoQvac {
  percentage: number;
  stage?: string;
  elapsedMs?: number;
}

export interface SdkQvac {
  loadModel: (opciones: Record<string, unknown>) => Promise<string>;
  unloadModel: (opciones: { modelId: string; clearStorage?: boolean }) => Promise<void>;
  completion: (opciones: Record<string, unknown>) => {
    events: AsyncIterable<{ type: string; text?: string }>;
    tokenStream: AsyncIterable<string>;
    requestId: string;
  };
  transcribe: (opciones: Record<string, unknown>) => Promise<string>;
  textToSpeech: (opciones: Record<string, unknown>) => { buffer: Promise<number[]> };
  downloadAsset: (opciones: {
    assetSrc: unknown;
    onProgress?: (p: ProgresoQvac) => void;
  }) => Promise<string>;
  getSystemResources: () => Promise<{ memory?: { total?: number; available?: number }; disk?: { free?: number } }>;
  deleteCache: (opciones: Record<string, unknown>) => Promise<unknown>;
  cancel: (opciones: { requestId?: string; modelId?: string; kind?: string }) => Promise<void>;
  suspend: () => Promise<void>;
  resume: () => Promise<void>;
  state: () => Promise<'active' | 'suspended'>;
  [constante: string]: unknown;
}

let cache: SdkQvac | null | undefined;

/** null si el SDK no está instalado o no puede cargarse en este dispositivo. */
export async function cargarSdk(): Promise<SdkQvac | null> {
  if (cache !== undefined) return cache;

  try {
    // Especificador literal: Metro sólo acepta imports estáticos. Cuando el
    // paquete no está instalado, metro.config.js lo redirige a
    // src/inference/qvacAusente.ts, que marca el centinela de abajo.
    const modulo: unknown = await import('@qvac/sdk');
    const espacio = modulo as Record<string, unknown>;
    const raiz = (espacio.default ?? espacio) as Record<string, unknown>;

    if (raiz.QVAC_NO_DISPONIBLE === true || espacio.QVAC_NO_DISPONIBLE === true) {
      cache = null; // se cargó el stub: el SDK no está instalado
      return null;
    }

    cache = raiz as unknown as SdkQvac;
    return cache;
  } catch {
    cache = null;
    return null;
  }
}

export function sdkDisponible(): boolean {
  return cache != null;
}

/** Resuelve una constante de modelo del SDK por su nombre. */
export function constante(sdk: SdkQvac, nombre: string): unknown {
  const valor = sdk[nombre];
  if (valor === undefined) {
    throw new Error(
      `El modelo "${nombre}" no existe en esta versión de @qvac/sdk. ` +
        'Las constantes cambian entre versiones 0.x: revisa el catálogo en src/inference/modelos.ts.',
    );
  }
  return valor;
}
