import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BotonPrincipal, BotonSecundario, Card, Texto } from '../../src/components/base';
import { Cabecera } from '../../src/components/Cabecera';
import { colores, espacio, radio } from '../../src/theme/tokens';
import { useAsistenteVoz, type EstadoVoz } from '../../src/hooks/useAsistenteVoz';
import { actualizarBorrador } from '../../src/services/borrador';

/**
 * Asistente de voz. Sigue el wireframe 05-asistente-voz.
 *
 * Cadena completa y 100 % local:
 *   micrófono -> Whisper (QVAC) -> MotorInferencia -> TTS (QVAC) -> audio
 *
 * Nada de esto sale del teléfono. Si QVAC no está disponible, el estado pasa a
 * 'fallback' y la pantalla ofrece escribir: la app sigue siendo útil en Nivel 0.
 */

const TEXTO_ESTADO: Record<EstadoVoz, string> = {
  inactivo: 'Mantén pulsado para hablar',
  preparando: 'Preparando el modelo de voz…',
  escuchando: 'Escuchando…',
  transcribiendo: 'Entendiendo lo que dijiste…',
  respondiendo: 'Analizando en tu teléfono…',
  reproduciendo: 'Reproduciendo la respuesta…',
  error: 'Algo salió mal',
  fallback: 'La voz no está disponible',
};

export default function Asistente() {
  const voz = useAsistenteVoz();
  const pulso = useRef(new Animated.Value(1)).current;

  const ocupado =
    voz.estado === 'preparando' ||
    voz.estado === 'transcribiendo' ||
    voz.estado === 'respondiendo';
  const grabando = voz.estado === 'escuchando';
  const inutilizable = voz.estado === 'fallback';

  // Latido mientras graba: retroalimentación clara sin depender de texto.
  useEffect(() => {
    if (!grabando) {
      pulso.setValue(1);
      return;
    }
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1.14, duration: 600, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [grabando, pulso]);

  const verResultado = () => {
    if (!voz.analisis) return;
    actualizarBorrador({
      descripcion: voz.transcripcion,
      analisis: voz.analisis,
      origen: 'voz',
      transcripcion: voz.transcripcion,
    });
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
              accessibilityLabel={grabando ? 'Suelta para enviar' : 'Mantén pulsado para hablar'}
              accessibilityState={{ busy: ocupado, disabled: inutilizable }}
              disabled={ocupado || inutilizable}
              // Mantener pulsado es lo natural en campo; soltar envía.
              onPressIn={() => void voz.empezar()}
              onPressOut={() => void voz.detener()}
              style={[
                estilos.micro,
                grabando && estilos.microActivo,
                (ocupado || inutilizable) && { opacity: 0.45 },
              ]}
            >
              {ocupado ? (
                <ActivityIndicator size="large" color={colores.verde} />
              ) : (
                <Ionicons
                  name={grabando ? 'radio-button-on' : inutilizable ? 'mic-off' : 'mic'}
                  size={52}
                  color={grabando ? colores.fondo : colores.verde}
                />
              )}
            </Pressable>
          </Animated.View>

          <Texto variante="cuerpoFuerte" centrado color={colores.textoSuave} style={{ marginTop: espacio.lg }}>
            {grabando ? `Escuchando… ${voz.segundos} s` : TEXTO_ESTADO[voz.estado]}
          </Texto>

          {voz.progreso ? (
            <View style={estilos.progreso}>
              <View style={estilos.barra}>
                <View style={[estilos.barraRelleno, { width: `${voz.progreso.porcentaje}%` }]} />
              </View>
              <Texto variante="pequeno" color={colores.cian} style={{ marginTop: espacio.xs }}>
                {voz.progreso.etapa} · {Math.round(voz.progreso.porcentaje)}%
              </Texto>
            </View>
          ) : null}
        </View>

        {voz.mensaje ? (
          <Card style={{ borderColor: voz.estado === 'error' ? colores.peligro : colores.aviso }}>
            <View style={estilos.filaIcono}>
              <Ionicons
                name={voz.estado === 'error' ? 'alert-circle' : 'information-circle'}
                size={20}
                color={voz.estado === 'error' ? colores.peligro : colores.aviso}
              />
              <Texto
                variante="cuerpoFuerte"
                color={voz.estado === 'error' ? colores.peligro : colores.aviso}
                style={{ flex: 1 }}
              >
                {TEXTO_ESTADO[voz.estado]}
              </Texto>
            </View>
            <Texto variante="pequeno" color={colores.textoSuave} style={{ marginTop: espacio.sm }}>
              {voz.mensaje}
            </Texto>

            <View style={{ gap: espacio.sm, marginTop: espacio.md }}>
              {inutilizable ? (
                <>
                  <BotonSecundario
                    titulo="Administrar modelos"
                    icono={<Ionicons name="cube" size={18} color={colores.cian} />}
                    onPress={() => router.replace('/settings/models')}
                  />
                  <BotonSecundario
                    titulo="Escribir en su lugar"
                    icono={<Ionicons name="create" size={18} color={colores.verde} />}
                    onPress={() => router.replace('/observation')}
                  />
                </>
              ) : (
                <BotonSecundario titulo="Intentar de nuevo" onPress={voz.reiniciar} />
              )}
            </View>
          </Card>
        ) : null}

        {voz.transcripcion ? (
          <Card>
            <View style={estilos.filaIcono}>
              <Ionicons name="person" size={16} color={colores.textoTenue} />
              <Texto variante="etiqueta" color={colores.textoTenue}>
                TÚ DIJISTE
              </Texto>
            </View>
            <Texto variante="cuerpo" style={{ marginTop: espacio.sm }}>
              {voz.transcripcion}
            </Texto>
          </Card>
        ) : null}

        {voz.respuesta ? (
          <Card style={{ borderColor: colores.verde }}>
            <View style={estilos.filaIcono}>
              <Ionicons name="leaf" size={16} color={colores.verde} />
              <Texto variante="etiqueta" color={colores.verde}>
                FITO RESPONDE · EN TU TELÉFONO
              </Texto>
            </View>
            <Texto variante="cuerpo" style={{ marginTop: espacio.sm }}>
              {voz.respuesta}
            </Texto>
          </Card>
        ) : null}
      </ScrollView>

      {voz.analisis ? (
        <View style={estilos.pie}>
          <View style={{ flexDirection: 'row', gap: espacio.sm }}>
            <BotonSecundario
              titulo={voz.puedeReproducir ? 'Escuchar' : 'Sin audio'}
              icono={<Ionicons name="volume-high" size={20} color={colores.cian} />}
              disabled={!voz.puedeReproducir || voz.estado === 'reproduciendo'}
              onPress={voz.reproducir}
              style={{ flex: 1 }}
            />
            <BotonSecundario
              titulo="Hablar otra vez"
              icono={<Ionicons name="mic" size={20} color={colores.verde} />}
              onPress={voz.reiniciar}
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
  progreso: { width: '100%', marginTop: espacio.lg, alignItems: 'center' },
  barra: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colores.superficieAlta,
    overflow: 'hidden',
  },
  barraRelleno: { height: '100%', backgroundColor: colores.cian, borderRadius: 4 },
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
