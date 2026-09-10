import {
  analizarSalidaModelo,
  construirMensajeUsuario,
  NIVEL,
  PROMPT_SISTEMA,
  type CapacidadesMotor,
  type EntradaAnalisis,
  type KnowledgeRepository,
  type MotorInferencia,
  type ProgresoMotor,
  type Analisis,
  type ResultadoTranscripcion,
  type ResultadoVoz,
} from '@fitoai/core';
import { cargarSdk, constante, type SdkQvac } from './qvacSdk';
import { modelo } from './modelos';

/**
 * Motor QVAC en el dispositivo (niveles 1-3).
 *
 * QVAC soporta React Native / Expo oficialmente: @qvac/sdk declara
 * `react-native-bare-kit`, `expo-file-system`, `expo-device` y
 * `expo-build-properties` como peerDependencies, y publica el config plugin
 * `@qvac/sdk/expo-plugin`. Corre sobre el runtime Bare embebido, no sobre
 * Hermes, y se comunica por RPC.
 *
 * Este adaptador NUNCA lanza hacia arriba por falta de modelos: devuelve
 * `estaDisponible() === false` y el registro cae a MotorKB.
 */
export class MotorQvacMobile implements MotorInferencia {
  readonly id = 'qvac-mobile';
  readonly nivel: number;

  private readonly conocimiento: KnowledgeRepository;
  private sdk: SdkQvac | null = null;
  private idLlm: string | null = null;
  private idAsr: string | null = null;
  private idTts: string | null = null;

  constructor(conocimiento: KnowledgeRepository, nivel: number = NIVEL.LLM) {
    this.conocimiento = conocimiento;
    this.nivel = nivel;
  }

  capacidades(): CapacidadesMotor {
    return {
      analisisTexto: this.idLlm !== null,
      analisisImagen: false, // se activará con el modelo multimodal (nivel 3)
      transcripcion: this.idAsr !== null,
      sintesisVoz: this.idTts !== null,
    };
  }

  async estaDisponible(): Promise<boolean> {
    this.sdk ??= await cargarSdk();
    return this.sdk !== null;
  }

  async inicializar(onProgreso?: (p: ProgresoMotor) => void): Promise<void> {
    this.sdk ??= await cargarSdk();
    if (!this.sdk) throw new Error('QVAC no está instalado en esta app.');

    const def = modelo('llama-3.2-1b');
    if (!def) throw new Error('Falta la definición del modelo de lenguaje.');

    onProgreso?.({ etapa: 'Preparando el modelo', porcentaje: 0 });

    this.idLlm = await this.sdk.loadModel({
      modelSrc: constante(this.sdk, def.constanteQvac),
      modelType: 'llm',
      modelConfig: { device: 'gpu', ctx_size: 2048 },
      onProgress: (p: { percentage?: number; stage?: string }) =>
        onProgreso?.({ etapa: p.stage ?? 'Cargando', porcentaje: p.percentage ?? 0 }),
    });

    onProgreso?.({ etapa: 'Listo', porcentaje: 100 });
  }

  /** Carga perezosa del modelo de voz: sólo cuando se usa el asistente. */
  async asegurarAsr(): Promise<boolean> {
    this.sdk ??= await cargarSdk();
    if (!this.sdk) return false;
    if (this.idAsr) return true;

    const def = modelo('whisper-es-tiny');
    if (!def) return false;

    try {
      this.idAsr = await this.sdk.loadModel({
        modelSrc: constante(this.sdk, def.constanteQvac),
        modelConfig: {
          audio_format: 's16le',
          strategy: 'greedy',
          language: 'es',
          no_timestamps: true,
          temperature: 0,
        },
      });
      return true;
    } catch {
      this.idAsr = null;
      return false;
    }
  }

  async asegurarTts(): Promise<boolean> {
    this.sdk ??= await cargarSdk();
    if (!this.sdk) return false;
    if (this.idTts) return true;

    const def = modelo('supertonic-tts');
    if (!def) return false;

    try {
      this.idTts = await this.sdk.loadModel({
        modelSrc: constante(this.sdk, def.constanteQvac),
        modelConfig: { ttsEngine: 'supertonic', language: 'es', voice: 'F1', outputSampleRate: 44100 },
      });
      return true;
    } catch {
      this.idTts = null;
      return false;
    }
  }

  async liberar(): Promise<void> {
    if (!this.sdk) return;
    const ids = [this.idLlm, this.idAsr, this.idTts].filter((x): x is string => Boolean(x));
    await Promise.allSettled(ids.map((modelId) => this.sdk!.unloadModel({ modelId })));
    this.idLlm = null;
    this.idAsr = null;
    this.idTts = null;
  }

  async analizar(entrada: EntradaAnalisis): Promise<Analisis> {
    if (!this.sdk || !this.idLlm) throw new Error('El modelo de análisis no está cargado.');

    const registro = this.conocimiento.mejorCoincidencia(entrada.descripcion, entrada.cultivo ?? null);
    const mensaje = construirMensajeUsuario(entrada.descripcion, registro);

    const ejecucion = this.sdk.completion({
      modelId: this.idLlm,
      history: [
        { role: 'system', content: PROMPT_SISTEMA },
        { role: 'user', content: mensaje },
      ],
      stream: true,
    });

    let crudo = '';
    for await (const evento of ejecucion.events) {
      if (evento.type === 'contentDelta' && evento.text) crudo += evento.text;
    }

    // Toda la tubería de parser + seguridad + enriquecimiento vive en el core
    // y está cubierta por tests. Aquí sólo se produce el texto crudo.
    return analizarSalidaModelo(crudo, registro);
  }

  async transcribir(audio: Uint8Array | string): Promise<ResultadoTranscripcion> {
    if (!(await this.asegurarAsr()) || !this.sdk || !this.idAsr) {
      throw new Error('El modelo de voz no está disponible.');
    }
    const texto = await this.sdk.transcribe({
      modelId: this.idAsr,
      audioChunk: audio,
      metadata: false,
    });
    return { texto: String(texto ?? '').trim() };
  }

  async hablar(texto: string): Promise<ResultadoVoz> {
    const mensaje = texto.trim();
    if (!mensaje) return { audio: null, texto: '' };

    if (!(await this.asegurarTts()) || !this.sdk || !this.idTts) {
      // Degradación honesta: el usuario lee el texto en vez de escucharlo.
      return { audio: null, texto: mensaje };
    }

    try {
      const resultado = this.sdk.textToSpeech({
        modelId: this.idTts,
        text: mensaje,
        inputType: 'text',
        stream: false,
      });
      const muestras = await resultado.buffer;
      return { audio: pcmAWav(Int16Array.from(muestras), 44100), texto: mensaje };
    } catch {
      return { audio: null, texto: mensaje };
    }
  }
}

/** Envuelve PCM 16-bit en una cabecera WAV para poder reproducirlo. */
function pcmAWav(muestras: Int16Array, frecuencia: number): Uint8Array {
  const canales = 1;
  const bits = 16;
  const datos = new Uint8Array(muestras.buffer, muestras.byteOffset, muestras.byteLength);
  const salida = new Uint8Array(44 + datos.length);
  const vista = new DataView(salida.buffer);

  const escribir = (offset: number, texto: string) => {
    for (let i = 0; i < texto.length; i += 1) vista.setUint8(offset + i, texto.charCodeAt(i));
  };

  escribir(0, 'RIFF');
  vista.setUint32(4, 36 + datos.length, true);
  escribir(8, 'WAVE');
  escribir(12, 'fmt ');
  vista.setUint32(16, 16, true);
  vista.setUint16(20, 1, true);
  vista.setUint16(22, canales, true);
  vista.setUint32(24, frecuencia, true);
  vista.setUint32(28, (frecuencia * canales * bits) / 8, true);
  vista.setUint16(32, (canales * bits) / 8, true);
  vista.setUint16(34, bits, true);
  escribir(36, 'data');
  vista.setUint32(40, datos.length, true);
  salida.set(datos, 44);

  return salida;
}
