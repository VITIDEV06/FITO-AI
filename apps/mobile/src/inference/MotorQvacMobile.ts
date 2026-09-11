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
import { modeloEstaListo } from './gestorModelos';

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
      // El LLM se carga bajo demanda; la capacidad depende del nivel, no de
      // si ya está en memoria.
      analisisTexto: this.nivel >= NIVEL.LLM,
      analisisImagen: false, // se activará con el modelo multimodal (nivel 3)
      transcripcion: this.nivel >= NIVEL.VOZ,
      sintesisVoz: this.nivel >= NIVEL.COMPLETO,
    };
  }

  async estaDisponible(): Promise<boolean> {
    this.sdk ??= await cargarSdk();
    return this.sdk !== null;
  }

  /**
   * Inicializar NO carga ningún modelo.
   *
   * Antes cargaba el LLM (773 MB) incondicionalmente, lo que en un teléfono de
   * nivel VOZ (2 GB de RAM basta para Whisper, pero no para el LLM) hacía
   * fallar el arranque y tumbaba también la voz. Cada modelo se carga ahora
   * perezosamente, solo cuando la función que lo necesita se usa de verdad.
   */
  async inicializar(onProgreso?: (p: ProgresoMotor) => void): Promise<void> {
    this.sdk ??= await cargarSdk();
    if (!this.sdk) throw new Error('QVAC no está instalado en esta app.');
    onProgreso?.({ etapa: 'Motor local listo', porcentaje: 100 });
  }

  /** Carga perezosa del LLM. Solo en nivel 2 o superior. */
  private async asegurarLlm(onProgreso?: (p: ProgresoMotor) => void): Promise<boolean> {
    this.sdk ??= await cargarSdk();
    if (!this.sdk || this.nivel < NIVEL.LLM) return false;
    if (this.idLlm) return true;

    const def = modelo('llama-3.2-1b');
    if (!def) return false;

    try {
      if (!(await this.modeloDisponible(def.id))) return false;
      // Nunca dos modelos pesados a la vez: el LLM ocupa 773 MB y en un
      // teléfono justo de RAM convivir con Whisper es la forma más rápida de
      // que el sistema mate la app.
      await this.liberarVoz();
      this.idLlm = await this.sdk.loadModel({
        modelSrc: constante(this.sdk, def.constanteQvac),
        modelType: 'llm',
        modelConfig: { device: 'gpu', ctx_size: 2048 },
      });
      return true;
    } catch {
      this.idLlm = null;
      return false;
    }
  }

  /**
   * ¿Está el modelo ya en el teléfono?
   *
   * El motor NO descarga. Descargar es una decisión explícita del agricultor en
   * «Administrar modelos», por dos razones:
   *
   *   1. QVAC distribuye los modelos por P2P (Hyperswarm/UDX sobre UDP). En
   *      redes que filtran UDP el worker de Bare aborta con SIGABRT y se lleva
   *      el proceso por delante; no hay try/catch que lo evite. Confinado a la
   *      pantalla de modelos, ese fallo es visible y voluntario; disparado
   *      desde «mantén pulsado para hablar», sería la app cerrándose sola.
   *   2. Son decenas o cientos de MB. Eso no se gasta sin permiso.
   */
  private async modeloDisponible(id: string): Promise<boolean> {
    return modeloEstaListo(id);
  }

  /**
   * Carga perezosa del modelo de voz (Whisper), solo si ya está descargado.
   * Devuelve false en vez de lanzar: quien llama degrada a texto.
   */
  async asegurarAsr(onProgreso?: (p: ProgresoMotor) => void): Promise<boolean> {
    this.sdk ??= await cargarSdk();
    if (!this.sdk || this.nivel < NIVEL.VOZ) return false;
    if (this.idAsr) return true;

    const def = modelo('whisper-es-tiny');
    if (!def) return false;

    try {
      if (!(await this.modeloDisponible(def.id))) return false;

      onProgreso?.({ etapa: 'Cargando el modelo de voz', porcentaje: 0 });
      this.idAsr = await this.sdk.loadModel({
        modelSrc: constante(this.sdk, def.constanteQvac),
        modelConfig: {
          // Sin `audio_format`: no le pasamos PCM crudo sino el fichero grabado,
          // y el addon bare-ffmpeg del worker lo decodifica. Es lo que hacen los
          // ejemplos del propio SDK.
          strategy: 'greedy',
          language: 'es',
          no_timestamps: true,
          temperature: 0,
        },
      });
      onProgreso?.({ etapa: 'Modelo de voz listo', porcentaje: 100 });
      return true;
    } catch {
      this.idAsr = null;
      return false;
    }
  }

  /** Carga perezosa del TTS. Solo nivel 3: es lo primero que se sacrifica. */
  async asegurarTts(onProgreso?: (p: ProgresoMotor) => void): Promise<boolean> {
    this.sdk ??= await cargarSdk();
    if (!this.sdk || this.nivel < NIVEL.COMPLETO) return false;
    if (this.idTts) return true;

    const def = modelo('supertonic-tts');
    if (!def) return false;

    try {
      if (!(await this.modeloDisponible(def.id))) return false;

      onProgreso?.({ etapa: 'Cargando la voz', porcentaje: 0 });
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

  /**
   * Descarga de memoria los modelos de voz sin tocar el LLM.
   *
   * En un teléfono justo de RAM, tener Whisper cargado mientras no se usa el
   * asistente es desperdicio: la pantalla de voz llama a esto al salir.
   */
  async liberarVoz(): Promise<void> {
    if (!this.sdk) return;
    const ids = [this.idAsr, this.idTts].filter((x): x is string => Boolean(x));
    await Promise.allSettled(ids.map((modelId) => this.sdk!.unloadModel({ modelId })));
    this.idAsr = null;
    this.idTts = null;
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
    // El LLM se carga aquí, no al arrancar. Si no se puede (nivel insuficiente,
    // modelo sin descargar o carga fallida), lanzamos: registro.ts lo captura y
    // responde con MotorKB, así que el agricultor siempre obtiene análisis.
    if (!(await this.asegurarLlm())) {
      throw new Error('El modelo de análisis no está disponible en este dispositivo.');
    }
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

  /**
   * Transcribe audio ya grabado.
   *
   * `audio` puede ser la ruta del fichero —lo que usan los ejemplos del SDK, y
   * lo que permite que ffmpeg decodifique el m4a del grabador— o los bytes ya
   * decodificados. El worker de Bare comparte el sandbox de la app, así que
   * puede leer el fichero del directorio de caché sin copiarlo.
   */
  async transcribir(audio: Uint8Array | string): Promise<ResultadoTranscripcion> {
    if (!(await this.asegurarAsr()) || !this.sdk || !this.idAsr) {
      throw new Error('El modelo de voz no está disponible.');
    }
    // `file://` es de React Native; bare-fs espera una ruta del sistema.
    const entrada = typeof audio === 'string' ? rutaLocal(audio) : audio;
    const texto = await this.sdk.transcribe({
      modelId: this.idAsr,
      audioChunk: entrada,
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

/** Quita el esquema `file://` que añade React Native a las URIs locales. */
function rutaLocal(uri: string): string {
  return uri.startsWith('file://') ? decodeURI(uri.slice('file://'.length)) : uri;
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
