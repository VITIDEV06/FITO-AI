import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import type { Analisis, ProgresoMotor } from '@fitoai/core';
import { analizar, liberarModelosVoz, obtenerMotorVoz } from '../inference/registro';
import { guardarObservacion } from '../storage/observaciones';
import { resumirParaVoz } from '../services/voz';

/**
 * Estados del asistente de voz.
 *
 * `fallback` no es un error: significa que la voz no está disponible en este
 * dispositivo (sin QVAC, sin RAM suficiente o modelo sin descargar) y que el
 * agricultor debe escribir. La app sigue funcionando en Nivel 0.
 */
export type EstadoVoz =
  | 'inactivo'
  | 'preparando'
  | 'escuchando'
  | 'transcribiendo'
  | 'respondiendo'
  | 'reproduciendo'
  | 'error'
  | 'fallback';

export interface AsistenteVoz {
  estado: EstadoVoz;
  progreso: ProgresoMotor | null;
  transcripcion: string;
  respuesta: string;
  analisis: Analisis | null;
  /** Segundos grabados, para mostrar mientras se habla. */
  segundos: number;
  puedeReproducir: boolean;
  mensaje: string | null;
  empezar: () => Promise<void>;
  detener: () => Promise<void>;
  reproducir: () => void;
  reiniciar: () => void;
}

/** Duración mínima para que merezca la pena transcribir. */
const MINIMO_MS = 700;

export function useAsistenteVoz(): AsistenteVoz {
  const grabadora = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const estadoGrabadora = useAudioRecorderState(grabadora);
  const reproductor = useAudioPlayer();

  const [estado, setEstado] = useState<EstadoVoz>('inactivo');
  const [progreso, setProgreso] = useState<ProgresoMotor | null>(null);
  const [transcripcion, setTranscripcion] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const vivo = useRef(true);
  // El agricultor puede soltar el botón mientras el modelo todavía se prepara.
  // Sin esto la grabación arrancaría después de soltar y nadie la pararía.
  const soltado = useRef(false);

  // Permisos y modo de audio. Si no hay permiso, quedamos en 'fallback' y la
  // pantalla ofrece escribir: nunca se bloquea la app.
  useEffect(() => {
    vivo.current = true;

    void (async () => {
      try {
        const permiso = await AudioModule.requestRecordingPermissionsAsync();
        if (!vivo.current) return;

        if (!permiso.granted) {
          setEstado('fallback');
          setMensaje(
            'FitoIA no tiene permiso para usar el micrófono. Puedes activarlo en los ajustes del teléfono o escribir tu observación.',
          );
          return;
        }

        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      } catch {
        if (vivo.current) {
          setEstado('fallback');
          setMensaje('No se pudo preparar el audio en este dispositivo. Puedes escribir tu observación.');
        }
      }
    })();

    return () => {
      vivo.current = false;
      // Al salir de la pantalla soltamos Whisper: en un teléfono justo de RAM
      // no tiene sentido mantenerlo cargado mientras no se usa.
      void liberarModelosVoz();
    };
  }, []);

  const fallar = useCallback((texto: string) => {
    if (!vivo.current) return;
    setEstado('error');
    setMensaje(texto);
  }, []);

  const empezar = useCallback(async () => {
    if (estado === 'escuchando') return;

    soltado.current = false;
    setMensaje(null);
    setTranscripcion('');
    setRespuesta('');
    setAnalisis(null);
    setAudioUri(null);

    try {
      // Preparamos Whisper ANTES de grabar: así el agricultor no habla para
      // descubrir después que el modelo no estaba.
      setEstado('preparando');
      const motor = await obtenerMotorVoz();

      if (!motor) {
        setEstado('fallback');
        setMensaje(
          'La IA de voz no está disponible en este teléfono. FitoIA sigue analizando con la base de conocimiento: escribe lo que observas.',
        );
        return;
      }

      const listo = await motor.asegurarAsr((p) => {
        if (vivo.current) setProgreso(p);
      });
      setProgreso(null);

      if (!listo) {
        setEstado('fallback');
        setMensaje(
          'El modelo de voz todavía no está descargado. Descárgalo una vez desde Estado › Administrar modelos y a partir de ahí funcionará sin conexión. Mientras tanto, puedes escribir tu observación.',
        );
        return;
      }

      // Preparar el modelo puede tardar (la primera vez incluye descarga). Si
      // ya soltó el botón, no empezamos a grabar a sus espaldas.
      if (soltado.current || !vivo.current) {
        setEstado('inactivo');
        setMensaje('El modelo de voz ya está listo. Mantén pulsado y habla.');
        return;
      }

      await grabadora.prepareToRecordAsync();
      grabadora.record();
      if (vivo.current) setEstado('escuchando');
    } catch (e) {
      fallar(e instanceof Error ? e.message : 'No se pudo empezar a grabar.');
    }
  }, [estado, grabadora, fallar]);

  const detener = useCallback(async () => {
    soltado.current = true;
    if (estado !== 'escuchando') return;

    try {
      const duracion = estadoGrabadora.durationMillis ?? 0;
      await grabadora.stop();
      const uri = grabadora.uri;

      if (!uri || duracion < MINIMO_MS) {
        setEstado('inactivo');
        setMensaje('No se escuchó nada. Mantén pulsado y habla un poco más cerca.');
        return;
      }

      setEstado('transcribiendo');
      const motor = await obtenerMotorVoz();
      if (!motor) {
        setEstado('fallback');
        setMensaje('La voz dejó de estar disponible. Escribe tu observación.');
        return;
      }

      // Le pasamos la ruta, no los bytes: el worker de QVAC lee el fichero del
      // mismo sandbox y evitamos cargar la grabación entera en memoria JS.
      const { texto } = await motor.transcribir(uri);

      if (!texto) {
        setEstado('inactivo');
        setMensaje('No entendí lo que dijiste. Inténtalo otra vez, más despacio.');
        return;
      }
      if (!vivo.current) return;
      setTranscripcion(texto);

      // El análisis pasa por el registro, que ya degrada a MotorKB si el LLM no
      // está disponible. La voz funciona igual en Nivel 1 que en Nivel 2.
      setEstado('respondiendo');
      const { analisis: resultado, nivel } = await analizar({ descripcion: texto });
      if (!vivo.current) return;
      setAnalisis(resultado);

      const resumen = resumirParaVoz(
        resultado.cultivo,
        resultado.posiblesCausas.map((c) => c.descripcion),
        resultado.proximosPasos,
      );
      setRespuesta(resumen);

      // TTS es opcional: si no hay, el usuario lee la respuesta.
      const vozLista = await motor.asegurarTts();
      if (vozLista) {
        const salida = await motor.hablar(resumen);
        if (salida.audio && vivo.current) {
          const destino = new File(Paths.cache, `fito-voz-${Date.now()}.wav`);
          destino.write(salida.audio);
          setAudioUri(destino.uri);
        }
      }

      await guardarObservacion({
        descripcion: texto,
        cultivo: resultado.cultivo,
        fotoUri: null,
        transcripcion: texto,
        origen: 'voz',
        analisis: resultado,
        nivelMotor: nivel,
        notas: null,
      });

      if (vivo.current) setEstado('inactivo');
    } catch (e) {
      fallar(e instanceof Error ? e.message : 'No se pudo procesar el audio.');
    }
  }, [estado, estadoGrabadora.durationMillis, grabadora, fallar]);

  const reproducir = useCallback(() => {
    if (!audioUri) return;
    try {
      setEstado('reproduciendo');
      reproductor.replace({ uri: audioUri });
      reproductor.play();
    } catch {
      setEstado('inactivo');
    }
  }, [audioUri, reproductor]);

  // Volvemos a 'inactivo' cuando termina la reproducción.
  useEffect(() => {
    if (estado !== 'reproduciendo') return;
    if (!reproductor.playing && reproductor.currentTime > 0) setEstado('inactivo');
  }, [estado, reproductor.playing, reproductor.currentTime]);

  const reiniciar = useCallback(() => {
    setEstado('inactivo');
    setMensaje(null);
    setTranscripcion('');
    setRespuesta('');
    setAnalisis(null);
    setAudioUri(null);
  }, []);

  return {
    estado,
    progreso,
    transcripcion,
    respuesta,
    analisis,
    segundos: Math.round((estadoGrabadora.durationMillis ?? 0) / 1000),
    puedeReproducir: audioUri !== null,
    mensaje,
    empezar,
    detener,
    reproducir,
    reiniciar,
  };
}
