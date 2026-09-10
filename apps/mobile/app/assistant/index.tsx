import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import type { Analisis } from '@fitoai/core';
import { BotonPrincipal, BotonSecundario, Card, Texto } from '../../src/components/base';
import { Cabecera } from '../../src/components/Cabecera';
import { colores, espacio, radio } from '../../src/theme/tokens';
import { hablar, resumirParaVoz, transcribirArchivo } from '../../src/services/voz';
import { analizar } from '../../src/inference/registro';
import { guardarObservacion } from '../../src/storage/observaciones';
import { actualizarBorrador } from '../../src/services/borrador';

type Fase = 'listo' | 'grabando' | 'transcribiendo' | 'analizando' | 'respondido' | 'sin-voz';

/**
 * Asistente de voz. Sigue el wireframe 05-asistente-voz.
 *
 * Cadena completa y 100 % local:
 *   micrófono -> Whisper (QVAC) -> motor de inferencia -> TTS (QVAC) -> audio
 *
 * Si el modelo de voz no está en el teléfono, la pantalla lo dice con claridad
 * y ofrece escribir. No hay ningún camino que llame a un servicio en la nube.
 */
export default function Asistente() {
  const grabadora = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const estadoGrabadora = useAudioRecorderState(grabadora);
  const reproductor = useAudioPlayer();

  const [fase, setFase] = useState<Fase>('listo');
  const [transcripcion, setTranscripcion] = useState('');
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [pulso] = useState(new Animated.Value(1));

  useEffect(() => {
    void (async () => {
      const permiso = await AudioModule.requestRecordingPermissionsAsync();
      if (!permiso.granted) setFase('sin-voz');
    })();
  }, []);

  // Latido del micrófono mientras graba: retroalimentación clara sin texto.
  useEffect(() => {
    if (fase !== 'grabando') {
      pulso.setValue(1);
      return;
    }
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [fase, pulso]);

  const empezar = async () => {
    setTranscripcion('');
    setRespuesta('');
    setAnalisis(null);
    setAudioUri(null);
    await grabadora.prepareToRecordAsync();
    grabadora.record();
    setFase('grabando');
  };

  const detener = async () => {
    await grabadora.stop();
    const uri = grabadora.uri;
    if (!uri) {
      setFase('listo');
      return;
    }

    setFase('transcribiendo');
    const texto = await transcribirArchivo(uri);

    if (!texto) {
      setFase('sin-voz');
      return;
    }

    setTranscripcion(texto);
    setFase('analizando');

    const { analisis: resultado, nivel } = await analizar({ descripcion: texto });
    setAnalisis(resultado);

    const resumen = resumirParaVoz(
      resultado.cultivo,
      resultado.posiblesCausas.map((c) => c.descripcion),
      resultado.proximosPasos,
    );
    setRespuesta(resumen);

    const vozRespuesta = await hablar(resumen);
    setAudioUri(vozRespuesta.audioUri);
    setFase('respondido');

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
  };

  const escuchar = () => {
    if (!audioUri) return;
    reproductor.replace({ uri: audioUri });
    reproductor.play();
  };

  const verResultado = () => {
    if (!analisis) return;
    actualizarBorrador({ descripcion: transcripcion, analisis, origen: 'voz', transcripcion });
    router.replace('/observation/result');
  };

  return (
    <SafeAreaView style={estilos.raiz} edges={['top', 'bottom']}>
      <Cabecera titulo="Asistente FITO" />

      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <Card sinBorde style={estilos.encabezado}>
          <Texto variante="subtitulo" centrado>
            Habla sobre lo que observas
          </Texto>
          <Texto variante="pequeno" color={colores.textoSuave} centrado style={{ marginTop: espacio.xs }}>
            Cuéntalo con tus palabras. Se procesa en tu teléfono, sin internet.
          </Texto>
        </Card>

        <View style={estilos.zonaMicro}>
          <Animated.View style={{ transform: [{ scale: pulso }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fase === 'grabando' ? 'Detener grabación' : 'Empezar a hablar'}
              accessibilityState={{ busy: fase === 'transcribiendo' || fase === 'analizando' }}
              disabled={fase === 'transcribiendo' || fase === 'analizando' || fase === 'sin-voz'}
              onPress={fase === 'grabando' ? detener : empezar}
              style={[estilos.micro, fase === 'grabando' && estilos.microActivo]}
            >
              <Ionicons
                name={fase === 'grabando' ? 'stop' : 'mic'}
                size={52}
                color={fase === 'grabando' ? colores.fondo : colores.verde}
              />
            </Pressable>
          </Animated.View>

          <Texto variante="cuerpoFuerte" centrado color={colores.textoSuave} style={{ marginTop: espacio.lg }}>
            {
              {
                listo: 'Toca para hablar',
                grabando: `Grabando… ${Math.round((estadoGrabadora.durationMillis ?? 0) / 1000)} s`,
                transcribiendo: 'Entendiendo lo que dijiste…',
                analizando: 'Analizando en tu teléfono…',
                respondido: 'Toca para hablar otra vez',
                'sin-voz': 'La voz no está disponible',
              }[fase]
            }
          </Texto>
        </View>

        {fase === 'sin-voz' ? (
          <Card style={{ borderColor: colores.aviso }}>
            <View style={estilos.filaIcono}>
              <Ionicons name="mic-off" size={20} color={colores.aviso} />
              <Texto variante="cuerpoFuerte" color={colores.aviso}>
                El modelo de voz no está en tu teléfono
              </Texto>
            </View>
            <Texto variante="pequeno" color={colores.textoSuave} style={{ marginTop: espacio.sm }}>
              Puedes descargarlo desde Estado (ocupa unos 44 MB) o escribir tu observación.
              FitoIA nunca envía tu voz a internet.
            </Texto>
            <View style={{ gap: espacio.sm, marginTop: espacio.md }}>
              <BotonSecundario
                titulo="Descargar el modelo de voz"
                icono={<Ionicons name="cloud-download" size={18} color={colores.verde} />}
                onPress={() => router.replace('/settings/models')}
              />
              <BotonSecundario
                titulo="Escribir en su lugar"
                icono={<Ionicons name="create" size={18} color={colores.cian} />}
                onPress={() => router.replace('/observation')}
              />
            </View>
          </Card>
        ) : null}

        {transcripcion ? (
          <Card>
            <View style={estilos.filaIcono}>
              <Ionicons name="person" size={16} color={colores.textoTenue} />
              <Texto variante="etiqueta" color={colores.textoTenue}>
                TÚ DIJISTE
              </Texto>
            </View>
            <Texto variante="cuerpo" style={{ marginTop: espacio.sm }}>
              {transcripcion}
            </Texto>
          </Card>
        ) : null}

        {respuesta ? (
          <Card style={{ borderColor: colores.verde }}>
            <View style={estilos.filaIcono}>
              <Ionicons name="leaf" size={16} color={colores.verde} />
              <Texto variante="etiqueta" color={colores.verde}>
                FITO RESPONDE · IA LOCAL
              </Texto>
            </View>
            <Texto variante="cuerpo" style={{ marginTop: espacio.sm }}>
              {respuesta}
            </Texto>
          </Card>
        ) : null}
      </ScrollView>

      {fase === 'respondido' ? (
        <View style={estilos.pie}>
          <View style={{ flexDirection: 'row', gap: espacio.sm }}>
            <BotonSecundario
              titulo={audioUri ? 'Escuchar' : 'Sin audio'}
              icono={<Ionicons name="volume-high" size={20} color={colores.cian} />}
              disabled={!audioUri}
              onPress={escuchar}
              style={{ flex: 1 }}
            />
            <BotonSecundario
              titulo="Hablar otra vez"
              icono={<Ionicons name="mic" size={20} color={colores.verde} />}
              onPress={empezar}
              style={{ flex: 1 }}
            />
          </View>
          <BotonPrincipal titulo="Ver análisis completo" onPress={verResultado} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.lg, gap: espacio.lg },
  encabezado: { backgroundColor: colores.fondoElevado },
  zonaMicro: { alignItems: 'center', paddingVertical: espacio.xl },
  micro: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colores.superficie,
    borderWidth: 3,
    borderColor: colores.verde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microActivo: { backgroundColor: colores.peligro, borderColor: colores.peligro },
  filaIcono: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  pie: {
    padding: espacio.lg,
    gap: espacio.sm,
    borderTopWidth: 1,
    borderTopColor: colores.bordeSuave,
    backgroundColor: colores.fondoElevado,
    borderTopLeftRadius: radio.lg,
    borderTopRightRadius: radio.lg,
  },
});
