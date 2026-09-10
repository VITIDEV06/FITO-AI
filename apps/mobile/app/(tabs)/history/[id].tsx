import { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Observacion } from '@fitoai/core';
import { BotonSecundario, Card, Cargando, EstadoVacio, Texto } from '../../../src/components/base';
import { Cabecera } from '../../../src/components/Cabecera';
import { ResultadoAnalisis } from '../../../src/components/ResultadoAnalisis';
import { colores, espacio, radio } from '../../../src/theme/tokens';
import {
  actualizarAnalisis,
  eliminarObservacion,
  guardarNotas,
  obtenerObservacion,
} from '../../../src/storage/observaciones';
import { borrarFoto } from '../../../src/services/almacenamiento';
import { analizar } from '../../../src/inference/registro';
import { fechaHora } from '../../../src/services/formato';

/** Detalle de observación. Sigue el wireframe 07-detalle-observacion. */
export default function DetalleObservacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [observacion, setObservacion] = useState<Observacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [reanalizando, setReanalizando] = useState(false);
  const [notas, setNotas] = useState('');

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      void (async () => {
        const obs = id ? await obtenerObservacion(id) : null;
        if (!vivo) return;
        setObservacion(obs);
        setNotas(obs?.notas ?? '');
        setCargando(false);
      })();
      return () => {
        vivo = false;
      };
    }, [id]),
  );

  const repetirAnalisis = async () => {
    if (!observacion) return;
    setReanalizando(true);
    try {
      const { analisis, nivel } = await analizar({
        descripcion: observacion.descripcion,
        cultivo: observacion.cultivo || null,
        fotoUri: observacion.fotoUri,
      });
      await actualizarAnalisis(observacion.id, analisis, nivel);
      setObservacion({ ...observacion, analisis, nivelMotor: nivel });
    } catch {
      Alert.alert('No se pudo repetir el análisis', 'Inténtalo de nuevo en un momento.');
    } finally {
      setReanalizando(false);
    }
  };

  const eliminar = () => {
    if (!observacion) return;
    Alert.alert(
      '¿Eliminar esta observación?',
      'Se borrará de tu teléfono junto con su foto. No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await borrarFoto(observacion.fotoUri);
            await eliminarObservacion(observacion.id);
            router.back();
          },
        },
      ],
    );
  };

  const guardarNota = async (texto: string) => {
    setNotas(texto);
    if (observacion) await guardarNotas(observacion.id, texto);
  };

  if (cargando) {
    return (
      <SafeAreaView style={estilos.raiz} edges={['top']}>
        <Cabecera titulo="Observación" />
        <Cargando mensaje="Abriendo tu observación…" />
      </SafeAreaView>
    );
  }

  if (!observacion) {
    return (
      <SafeAreaView style={estilos.raiz} edges={['top']}>
        <Cabecera titulo="Observación" />
        <EstadoVacio
          titulo="No encontramos esta observación"
          descripcion="Puede que se haya eliminado desde otra pantalla."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.raiz} edges={['top']}>
      <Cabecera
        titulo="Observación"
        accion={{ icono: 'trash-outline', etiqueta: 'Eliminar observación', onPress: eliminar }}
      />

      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        {observacion.fotoUri ? (
          <Image source={{ uri: observacion.fotoUri }} style={estilos.foto} resizeMode="cover" />
        ) : null}

        {/* Lo que dijo el agricultor, sin transformar */}
        <Card>
          <Texto variante="etiqueta" color={colores.textoTenue}>
            TU OBSERVACIÓN
          </Texto>
          <Texto variante="pequeno" color={colores.textoTenue} style={{ marginTop: espacio.xs }}>
            {fechaHora(observacion.creadoEn)}
          </Texto>
          <Texto variante="cuerpo" style={{ marginTop: espacio.md }}>
            {observacion.descripcion}
          </Texto>
          {observacion.transcripcion ? (
            <View style={estilos.transcripcion}>
              <Ionicons name="mic" size={14} color={colores.cian} />
              <Texto variante="pequeno" color={colores.textoSuave} style={{ flex: 1 }}>
                Dictado por voz
              </Texto>
            </View>
          ) : null}
        </Card>

        {observacion.analisis ? (
          <ResultadoAnalisis analisis={observacion.analisis} />
        ) : (
          <Card>
            <Texto variante="cuerpoFuerte">Esta observación no tiene análisis</Texto>
            <Texto variante="pequeno" color={colores.textoSuave} style={{ marginTop: espacio.xs }}>
              Puedes analizarla ahora con el motor disponible en tu teléfono.
            </Texto>
          </Card>
        )}

        {/* Notas del agricultor: su seguimiento en el tiempo */}
        <Card>
          <Texto variante="etiqueta" color={colores.textoTenue}>
            TUS NOTAS
          </Texto>
          <TextInput
            value={notas}
            onChangeText={guardarNota}
            placeholder="¿Cómo evolucionó? Anota lo que veas los próximos días…"
            placeholderTextColor={colores.textoTenue}
            multiline
            textAlignVertical="top"
            style={estilos.notas}
            accessibilityLabel="Notas sobre esta observación"
          />
        </Card>
      </ScrollView>

      <View style={estilos.pie}>
        <BotonSecundario
          titulo={reanalizando ? 'Analizando…' : 'Repetir análisis'}
          icono={<Ionicons name="refresh" size={20} color={colores.verde} />}
          disabled={reanalizando}
          onPress={repetirAnalisis}
          style={{ flex: 1 }}
        />
        <BotonSecundario
          titulo="Escuchar"
          icono={<Ionicons name="volume-high" size={20} color={colores.cian} />}
          onPress={() => router.push('/assistant')}
          style={{ flex: 1 }}
        />
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.lg, gap: espacio.md, paddingBottom: espacio.xxl },
  foto: { width: '100%', height: 200, borderRadius: radio.lg },
  transcripcion: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, marginTop: espacio.md },
  notas: { minHeight: 80, color: colores.texto, fontSize: 16, marginTop: espacio.sm },
  pie: {
    flexDirection: 'row',
    gap: espacio.sm,
    padding: espacio.lg,
    borderTopWidth: 1,
    borderTopColor: colores.bordeSuave,
    backgroundColor: colores.fondoElevado,
  },
});
