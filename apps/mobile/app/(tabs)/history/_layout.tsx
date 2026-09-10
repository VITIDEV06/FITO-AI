import { Stack } from 'expo-router';
import { colores } from '../../../src/theme/tokens';

export default function LayoutHistorial() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
