import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Texto } from './base';
import { colores, espacio, tactil } from '../theme/tokens';

interface Props {
  titulo: string;
  atras?: boolean;
  accion?: { icono: keyof typeof Ionicons.glyphMap; etiqueta: string; onPress: () => void };
}

export function Cabecera({ titulo, atras = true, accion }: Props) {
  return (
    <View style={estilos.raiz}>
      {atras ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={estilos.boton}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={26} color={colores.texto} />
        </Pressable>
      ) : (
        <View style={estilos.boton} />
      )}

      <Texto variante="subtitulo" numberOfLines={1} style={estilos.titulo}>
        {titulo}
      </Texto>

      {accion ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accion.etiqueta}
          onPress={accion.onPress}
          style={estilos.boton}
          hitSlop={8}
        >
          <Ionicons name={accion.icono} size={22} color={colores.texto} />
        </Pressable>
      ) : (
        <View style={estilos.boton} />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacio.sm,
    paddingVertical: espacio.sm,
    borderBottomWidth: 1,
    borderBottomColor: colores.bordeSuave,
  },
  boton: {
    width: tactil.minimo,
    height: tactil.minimo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { flex: 1, textAlign: 'center' },
});
