import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Texto } from './base';
import { colores, espacio, radio, tactil } from '../theme/tokens';
import { repositorioConocimiento } from '../storage/conocimiento';

interface Props {
  valor: string;
  onCambio: (cultivo: string) => void;
}

/**
 * Selector de cultivo alimentado por la base de conocimiento real del
 * dispositivo, no por una lista fija: si el conocimiento crece, el selector
 * crece con él. Permite además escribir un cultivo que aún no exista.
 */
export function SelectorCultivo({ valor, onCambio }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [cultivos, setCultivos] = useState<string[]>([]);
  const [otro, setOtro] = useState('');

  useEffect(() => {
    void (async () => {
      const repo = await repositorioConocimiento();
      setCultivos(repo.listarCultivos());
    })();
  }, []);

  const elegir = (cultivo: string) => {
    onCambio(cultivo);
    setAbierto(false);
    setOtro('');
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={valor ? `Cultivo seleccionado: ${valor}. Cambiar.` : 'Seleccionar cultivo'}
        onPress={() => setAbierto(true)}
        style={({ pressed }) => [estilos.campo, pressed && { opacity: 0.8 }]}
      >
        <View style={{ flex: 1 }}>
          <Texto variante="etiqueta" color={colores.textoTenue}>
            CULTIVO
          </Texto>
          <Texto variante="cuerpo" color={valor ? colores.texto : colores.textoTenue}>
            {valor || 'Seleccionar cultivo (opcional)'}
          </Texto>
        </View>
        <Ionicons name="chevron-down" size={20} color={colores.textoSuave} />
      </Pressable>

      <Modal visible={abierto} animationType="slide" transparent onRequestClose={() => setAbierto(false)}>
        <Pressable style={estilos.fondo} onPress={() => setAbierto(false)} accessibilityLabel="Cerrar" />
        <View style={estilos.hoja}>
          <View style={estilos.asa} />
          <Texto variante="subtitulo" style={{ marginBottom: espacio.md }}>
            ¿Qué cultivo es?
          </Texto>

          <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
            {cultivos.map((cultivo) => (
              <Pressable
                key={cultivo}
                accessibilityRole="button"
                onPress={() => elegir(cultivo)}
                style={({ pressed }) => [estilos.opcion, pressed && { backgroundColor: colores.superficieAlta }]}
              >
                <Ionicons
                  name={valor === cultivo ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={valor === cultivo ? colores.verde : colores.textoTenue}
                />
                <Texto variante="cuerpo" style={{ flex: 1, textTransform: 'capitalize' }}>
                  {cultivo}
                </Texto>
              </Pressable>
            ))}
          </ScrollView>

          <View style={estilos.otro}>
            <TextInput
              value={otro}
              onChangeText={setOtro}
              placeholder="Otro cultivo…"
              placeholderTextColor={colores.textoTenue}
              style={estilos.input}
              returnKeyType="done"
              onSubmitEditing={() => otro.trim() && elegir(otro.trim())}
              accessibilityLabel="Escribir otro cultivo"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Usar este cultivo"
              disabled={!otro.trim()}
              onPress={() => elegir(otro.trim())}
              style={[estilos.confirmar, !otro.trim() && { opacity: 0.4 }]}
            >
              <Ionicons name="checkmark" size={22} color={colores.fondo} />
            </Pressable>
          </View>

          {valor ? (
            <Pressable onPress={() => elegir('')} style={estilos.limpiar} accessibilityRole="button">
              <Texto variante="pequeno" color={colores.textoSuave}>
                Quitar selección
              </Texto>
            </Pressable>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    minHeight: tactil.comodo,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.sm,
  },
  fondo: { flex: 1, backgroundColor: colores.overlay },
  hoja: {
    backgroundColor: colores.fondoElevado,
    borderTopLeftRadius: radio.xl,
    borderTopRightRadius: radio.xl,
    padding: espacio.lg,
    paddingBottom: espacio.xxl,
    gap: espacio.sm,
  },
  asa: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colores.borde,
    alignSelf: 'center',
    marginBottom: espacio.md,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    minHeight: tactil.minimo,
    paddingHorizontal: espacio.sm,
    borderRadius: radio.sm,
  },
  otro: { flexDirection: 'row', gap: espacio.sm, marginTop: espacio.md },
  input: {
    flex: 1,
    minHeight: tactil.minimo,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    paddingHorizontal: espacio.lg,
    color: colores.texto,
    fontSize: 16,
  },
  confirmar: {
    width: tactil.minimo,
    height: tactil.minimo,
    borderRadius: radio.md,
    backgroundColor: colores.verde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limpiar: { alignSelf: 'center', padding: espacio.sm },
});
