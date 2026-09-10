import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BotonPrincipal, BotonSecundario, EstadoVacio, Texto } from '../../../src/components/base';
import { Cabecera } from '../../../src/components/Cabecera';
import { ResultadoAnalisis } from '../../../src/components/ResultadoAnalisis';
import { colores, espacio, radio } from '../../../src/theme/tokens';
import { leerBorrador, reiniciarBorrador } from '../../../src/services/borrador';

/** Resultado del análisis. Sigue el wireframe 04-resultado. */
export default function Resultado() {
  const borrador = leerBorrador();

  if (!borrador.analisis) {
    return (
      <SafeAreaView style={estilos.raiz} edges={['top']}>
        <Cabecera titulo="Resultado" />
        <EstadoVacio
          titulo="No hay ningún análisis abierto"
          descripcion="Empieza una nueva observación para ver aquí el resultado."
          accion={
            <BotonPrincipal
              titulo="Nueva observación"
              onPress={() => {
                reiniciarBorrador();
                router.replace('/observation');
              }}
            />
          }
        />
      </SafeAreaView>
    );
  }

  const terminar = () => {
    reiniciarBorrador();
    router.replace('/');
  };

  return (
    <SafeAreaView style={estilos.raiz} edges={['top']}>
      <Cabecera titulo="Resultado" />

      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        {borrador.fotoUri ? (
          <Image source={{ uri: borrador.fotoUri }} style={estilos.foto} resizeMode="cover" />
        ) : null}

        {/* La observación ya se guardó al analizar: aquí sólo se confirma. */}
        <View style={estilos.guardado}>
          <Ionicons name="checkmark-circle" size={18} color={colores.verde} />
          <Texto variante="pequeno" color={colores.verde} style={{ flex: 1 }}>
            Guardado en tu historial, en este teléfono.
          </Texto>
        </View>

        <ResultadoAnalisis analisis={borrador.analisis} />
      </ScrollView>

      <View style={estilos.pie}>
        <BotonSecundario
          titulo="Escuchar resultado"
          icono={<Ionicons name="volume-high" size={20} color={colores.cian} />}
          onPress={() => router.push('/assistant')}
        />
        <BotonPrincipal
          titulo="Terminar"
          icono={<Ionicons name="checkmark" size={20} color={colores.fondo} />}
          onPress={terminar}
        />
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.lg, gap: espacio.md, paddingBottom: espacio.xxl },
  foto: { width: '100%', height: 170, borderRadius: radio.lg },
  guardado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    padding: espacio.md,
    borderRadius: radio.md,
    backgroundColor: colores.superficie,
  },
  pie: {
    padding: espacio.lg,
    gap: espacio.sm,
    borderTopWidth: 1,
    borderTopColor: colores.bordeSuave,
    backgroundColor: colores.fondoElevado,
  },
});
