import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { colores, espacio, tactil } from '../../src/theme/tokens';

/**
 * Barra inferior de 4 destinos, tal como el wireframe 01-home:
 * Inicio · Nueva observación · Historial · Estado.
 *
 * Asistente y Aportar conocimiento se abren desde Inicio como pantallas
 * completas: son flujos, no destinos permanentes, y meter 6 pestañas dejaría
 * los objetivos táctiles demasiado estrechos para usarse en campo.
 */
export default function LayoutPestanas() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.verde,
        tabBarInactiveTintColor: colores.textoTenue,
        tabBarStyle: {
          backgroundColor: colores.fondoElevado,
          borderTopColor: colores.bordeSuave,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : tactil.principal,
          paddingTop: espacio.sm,
          paddingBottom: Platform.OS === 'ios' ? espacio.xl : espacio.sm,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarItemStyle: { paddingVertical: espacio.xs },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="observation"
        options={{
          title: 'Observar',
          tabBarIcon: ({ color, size }) => <Ionicons name="camera" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Estado',
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
