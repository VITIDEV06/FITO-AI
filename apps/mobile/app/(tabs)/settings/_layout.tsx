import { Stack } from 'expo-router';
import { colores } from '../../../src/theme/tokens';

export default function LayoutEstado() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="models" />
    </Stack>
  );
}
