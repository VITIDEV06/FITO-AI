import { Stack } from 'expo-router';
import { colores } from '../../../src/theme/tokens';

export default function LayoutObservacion() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="analyzing" options={{ gestureEnabled: false }} />
      <Stack.Screen name="result" />
    </Stack>
  );
}
