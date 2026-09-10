import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { abrirBd } from '../src/storage/db';
import { sembrarConocimiento } from '../src/storage/conocimiento';
import { prepararDirectorios } from '../src/services/almacenamiento';
import { colores } from '../src/theme/tokens';
import { ErrorAmigable } from '../src/components/base';

void SplashScreen.preventAutoHideAsync();

/**
 * Arranque local: SQLite, semilla de conocimiento y directorio de fotos.
 *
 * La promesa se cachea a nivel de módulo para que un remontaje del layout no
 * repita el trabajo. Es idempotente de todas formas (abrirBd reutiliza la
 * conexión y sembrarConocimiento comprueba si ya hay filas), pero cachearla
 * evita ráfagas de consultas si React vuelve a montar el árbol.
 */
let arranque: Promise<void> | null = null;

function iniciar(): Promise<void> {
  arranque ??= (async () => {
    await abrirBd();
    await sembrarConocimiento();
    prepararDirectorios();
  })();
  return arranque;
}

export default function LayoutRaiz() {
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    void (async () => {
      try {
        await iniciar();
        if (cancelado) return;
        setListo(true);
      } catch (e) {
        if (cancelado) return;
        setError(e instanceof Error ? e.message : 'Error desconocido');
        setListo(true);
      } finally {
        await SplashScreen.hideAsync().catch(() => {});
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  if (!listo) return <View style={estilos.fondo} />;

  if (error) {
    return (
      <SafeAreaProvider>
        <View style={[estilos.fondo, estilos.centrado]}>
          <ErrorAmigable
            titulo="FitoIA no pudo abrir tus datos"
            descripcion={`Cierra la app y vuelve a abrirla. Si sigue pasando, reinstálala. Detalle: ${error}`}
          />
        </View>
      </SafeAreaProvider>
    );
  }

  // OJO: este layout NO navega. Llamar a router.replace() aquí remontaba el
  // árbol, lo que volvía a disparar el efecto y provocaba un bucle infinito de
  // montajes (la app se quedaba en negro). La decisión de mostrar el
  // onboarding es declarativa y vive en (tabs)/index.tsx.
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colores.fondo },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="assistant/index" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="knowledge/index" />
        <Stack.Screen name="knowledge/new" />
      </Stack>
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.fondo },
  centrado: { justifyContent: 'center', padding: 24 },
});
