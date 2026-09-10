import { useRef, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BotonPrincipal, Card, Texto } from '../src/components/base';
import { colores, espacio, LOGOS, radio } from '../src/theme/tokens';
import { marcarOnboardingVisto } from '../src/services/preferencias';

const { width: ANCHO } = Dimensions.get('window');

/** Tres pantallas, exactamente las del wireframe 09-onboarding. */
const PASOS = [
  {
    tipo: 'portada' as const,
    titulo: 'Tu asistente agrícola',
    texto:
      'FitoIA te ayuda a analizar observaciones de tus cultivos usando IA local. Toma una foto y obtén información útil para proteger tu cosecha.',
  },
  {
    tipo: 'lista' as const,
    titulo: 'Cómo funciona',
    items: [
      { icono: 'camera' as const, texto: '1. Toma una foto' },
      { icono: 'chatbubble-ellipses' as const, texto: '2. Describe lo que observas' },
      { icono: 'leaf' as const, texto: '3. FitoIA analiza la información' },
    ],
  },
  {
    tipo: 'lista' as const,
    titulo: 'IA local y segura',
    items: [
      { icono: 'phone-portrait' as const, texto: 'Tu información permanece en tu dispositivo' },
      { icono: 'hardware-chip' as const, texto: 'Los modelos de IA funcionan localmente' },
      { icono: 'cloud-offline' as const, texto: 'No necesitas internet para analizar' },
    ],
  },
];

export default function Onboarding() {
  const [indice, setIndice] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const esUltimo = indice === PASOS.length - 1;

  const avanzar = async () => {
    if (esUltimo) {
      await marcarOnboardingVisto();
      router.replace('/');
      return;
    }
    const siguiente = indice + 1;
    setIndice(siguiente);
    scroll.current?.scrollTo({ x: siguiente * ANCHO, animated: true });
  };

  return (
    <SafeAreaView style={estilos.raiz} edges={['top', 'bottom']}>
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) =>
          setIndice(Math.round(e.nativeEvent.contentOffset.x / ANCHO))
        }
      >
        {PASOS.map((paso) => (
          <View key={paso.titulo} style={[estilos.pagina, { width: ANCHO }]}>
            {paso.tipo === 'portada' ? (
              <>
                <Image source={LOGOS.icono} style={estilos.logo} resizeMode="contain" />
                <Texto variante="display" centrado style={{ marginTop: espacio.xxl }}>
                  {paso.titulo}
                </Texto>
                <Texto
                  variante="cuerpo"
                  color={colores.textoSuave}
                  centrado
                  style={{ marginTop: espacio.lg }}
                >
                  {paso.texto}
                </Texto>
              </>
            ) : (
              <>
                <Texto variante="titulo" centrado style={{ marginBottom: espacio.xl }}>
                  {paso.titulo}
                </Texto>
                {paso.items.map((item) => (
                  <Card key={item.texto} style={estilos.item}>
                    <View style={estilos.iconoCaja}>
                      <Ionicons name={item.icono} size={26} color={colores.verde} />
                    </View>
                    <Texto variante="cuerpoFuerte" style={estilos.itemTexto}>
                      {item.texto}
                    </Texto>
                  </Card>
                ))}
              </>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={estilos.pie}>
        <View style={estilos.puntos} accessibilityRole="tablist">
          {PASOS.map((paso, i) => (
            <View
              key={paso.titulo}
              style={[estilos.punto, i === indice && estilos.puntoActivo]}
            />
          ))}
        </View>
        <BotonPrincipal
          titulo={esUltimo ? 'Comenzar' : 'Siguiente'}
          onPress={avanzar}
          tamano="comodo"
        />
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.fondo },
  pagina: { flex: 1, justifyContent: 'center', paddingHorizontal: espacio.xl },
  logo: { width: 160, height: 160, alignSelf: 'center', borderRadius: radio.xl },
  item: { flexDirection: 'row', alignItems: 'center', gap: espacio.lg, marginBottom: espacio.md },
  iconoCaja: {
    width: 48,
    height: 48,
    borderRadius: radio.md,
    backgroundColor: colores.superficieAlta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTexto: { flex: 1 },
  pie: { paddingHorizontal: espacio.xl, paddingBottom: espacio.lg, gap: espacio.lg },
  puntos: { flexDirection: 'row', justifyContent: 'center', gap: espacio.sm },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: colores.borde },
  puntoActivo: { backgroundColor: colores.verde, width: 22 },
});
