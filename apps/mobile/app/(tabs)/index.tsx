import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Observacion } from '@fitoai/core';
import { BotonSecundario, Card, Marca, Pildora, Texto } from '../../src/components/base';
import { colores, espacio, gradienteMarca, radio, sombra, tactil } from '../../src/theme/tokens';
import { ultimaObservacion } from '../../src/storage/observaciones';
import { nombreUsuario, onboardingVisto } from '../../src/services/preferencias';
import { reiniciarBorrador } from '../../src/services/borrador';
import { fechaCorta } from '../../src/services/formato';

/** Pantalla de inicio. Sigue el wireframe 01-home. */
export default function Inicio() {
  const [ultima, setUltima] = useState<Observacion | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  // null = aún no sabemos si toca onboarding
  const [visto, setVisto] = useState<boolean | null>(null);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const v = await onboardingVisto();
      if (vivo) setVisto(v);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      void (async () => {
        const [obs, n] = await Promise.all([ultimaObservacion(), nombreUsuario()]);
        if (!vivo) return;
        setUltima(obs);
        setNombre(n);
      })();
      return () => {
        vivo = false;
      };
    }, []),
  );

  const nuevaObservacion = () => {
    reiniciarBorrador();
    router.push('/observation');
  };

  // Redirección declarativa: <Redirect> se resuelve una sola vez durante el
  // render, a diferencia de router.replace() en un efecto, que remontaba el
  // árbol en bucle.
  if (visto === null) return <View style={estilos.raiz} />;
  if (!visto) return <Redirect href="/onboarding" />;

  return (
    <SafeAreaView style={estilos.raiz} edges={['top']}>
      <View style={estilos.cabecera}>
        <Marca compacta />
        <Pildora
          texto="OFFLINE"
          color={colores.verde}
          icono={<Ionicons name="cloud-offline" size={13} color={colores.verde} />}
        />
      </View>

      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <Texto variante="titulo">
          {nombre ? `¡Hola, ${nombre}!` : '¡Hola!'}
        </Texto>
        <Texto variante="pequeno" color={colores.textoSuave} style={{ marginTop: espacio.xs }}>
          ¿Qué observaste hoy en tu cultivo?
        </Texto>

        {/* Acción principal: enorme y con degradado de marca. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nueva observación. Tomar foto y analizar."
          onPress={nuevaObservacion}
          style={({ pressed }) => [estilos.principalContenedor, pressed && { opacity: 0.9 }]}
        >
          <LinearGradient
            colors={[...gradienteMarca]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={estilos.principal}
          >
            <Ionicons name="camera" size={52} color={colores.fondo} />
            <Texto variante="subtitulo" color={colores.fondo} centrado style={{ marginTop: espacio.md }}>
              Nueva observación
            </Texto>
            <Texto variante="pequeno" color="rgba(5,16,11,0.75)" centrado>
              Tomar foto y analizar
            </Texto>
          </LinearGradient>
        </Pressable>

        <View style={estilos.fila}>
          <BotonSecundario
            titulo="Hablar con FITO"
            icono={<Ionicons name="mic" size={20} color={colores.cian} />}
            onPress={() => router.push('/assistant')}
            style={estilos.mitad}
            tamano="principal"
          />
          <BotonSecundario
            titulo="Historial"
            icono={<Ionicons name="time" size={20} color={colores.verde} />}
            onPress={() => router.push('/history')}
            style={estilos.mitad}
            tamano="principal"
          />
        </View>

        <BotonSecundario
          titulo="Aportar conocimiento"
          subtitulo="Ayuda a que FitoIA aprenda de tu campo"
          icono={<Ionicons name="leaf" size={20} color={colores.verdeClaro} />}
          onPress={() => router.push('/knowledge')}
        />

        {ultima ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Última observación: ${ultima.cultivo}. Abrir detalle.`}
            onPress={() => router.push(`/history/${ultima.id}`)}
          >
            <Card style={estilos.ultima}>
              {ultima.fotoUri ? (
                <Image source={{ uri: ultima.fotoUri }} style={estilos.miniatura} />
              ) : (
                <View style={[estilos.miniatura, estilos.miniaturaVacia]}>
                  <Ionicons name="document-text" size={24} color={colores.textoTenue} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Texto variante="etiqueta" color={colores.textoTenue}>
                  ÚLTIMA OBSERVACIÓN
                </Texto>
                <Texto variante="cuerpoFuerte" numberOfLines={1} style={{ marginTop: 2 }}>
                  {ultima.cultivo || 'Cultivo no identificado'}
                </Texto>
                <Texto variante="pequeno" color={colores.textoSuave} numberOfLines={1}>
                  {ultima.descripcion}
                </Texto>
                <Texto variante="pequeno" color={colores.textoTenue} style={{ marginTop: 2 }}>
                  {fechaCorta(ultima.creadoEn)}
                </Texto>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colores.textoTenue} />
            </Card>
          </Pressable>
        ) : (
          <Card style={{ borderStyle: 'dashed' }}>
            <Texto variante="cuerpoFuerte">Aún no tienes observaciones</Texto>
            <Texto variante="pequeno" color={colores.textoSuave} style={{ marginTop: espacio.xs }}>
              Toma una foto de tu cultivo y FitoIA la analizará aquí mismo, sin conexión.
            </Texto>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.fondo },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
    borderBottomWidth: 1,
    borderBottomColor: colores.bordeSuave,
  },
  contenido: { padding: espacio.lg, gap: espacio.lg, paddingBottom: espacio.xxxl },
  principalContenedor: { borderRadius: radio.xl, overflow: 'hidden', ...sombra.card },
  principal: { alignItems: 'center', justifyContent: 'center', paddingVertical: espacio.xxl },
  fila: { flexDirection: 'row', gap: espacio.md },
  mitad: { flex: 1, flexDirection: 'column', minHeight: tactil.principal },
  ultima: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
  miniatura: { width: 56, height: 56, borderRadius: radio.md, backgroundColor: colores.superficieAlta },
  miniaturaVacia: { alignItems: 'center', justifyContent: 'center' },
});
