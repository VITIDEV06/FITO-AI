import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BotonPrincipal, Card, Texto } from '../../../src/components/base';
import { Cabecera } from '../../../src/components/Cabecera';
import { CapturaFoto } from '../../../src/components/CapturaFoto';
import { SelectorCultivo } from '../../../src/components/SelectorCultivo';
import { colores, espacio, radio, tactil } from '../../../src/theme/tokens';
import { actualizarBorrador, calcularOrigen, leerBorrador } from '../../../src/services/borrador';

const MAX_CARACTERES = 500;

/**
 * Nueva observación. Sigue el wireframe 02-nueva-observacion:
 * foto -> descripción (con micro) -> cultivo -> analizar.
 *
 * Sólo la descripción es obligatoria: en campo, obligar a hacer foto antes de
 * poder describir bloquearía a quien tiene poca batería o mala luz.
 */
export default function NuevaObservacion() {
  const inicial = leerBorrador();
  const [descripcion, setDescripcion] = useState(inicial.descripcion);
  const [cultivo, setCultivo] = useState(inicial.cultivo);
  const [fotoUri, setFotoUri] = useState<string | null>(inicial.fotoUri);

  const puedeAnalizar = descripcion.trim().length >= 5;

  const analizar = () => {
    const borrador = actualizarBorrador({ descripcion: descripcion.trim(), cultivo, fotoUri });
    actualizarBorrador({ origen: calcularOrigen(borrador) });
    router.push('/observation/analyzing');
  };

  return (
    <SafeAreaView style={estilos.raiz} edges={['top']}>
      <Cabecera titulo="Nueva observación" atras={false} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <CapturaFoto fotoUri={fotoUri} onFoto={setFotoUri} />

          <View style={{ gap: espacio.xs }}>
            <Texto variante="cuerpoFuerte">¿Qué observas?</Texto>
            <Texto variante="pequeno" color={colores.textoSuave}>
              Descríbelo con tus palabras, como se lo contarías a un vecino.
            </Texto>
          </View>

          <View style={estilos.areaTexto}>
            <TextInput
              value={descripcion}
              onChangeText={(t) => setDescripcion(t.slice(0, MAX_CARACTERES))}
              placeholder="Ej: las hojas de abajo están amarillas y tienen manchas oscuras…"
              placeholderTextColor={colores.textoTenue}
              multiline
              textAlignVertical="top"
              style={estilos.input}
              accessibilityLabel="Descripción de lo que observas"
            />
            <View style={estilos.pieTexto}>
              <Texto variante="pequeno" color={colores.textoTenue}>
                {descripcion.length}/{MAX_CARACTERES}
              </Texto>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Describir hablando"
                onPress={() => router.push('/assistant')}
                style={({ pressed }) => [estilos.micro, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="mic" size={22} color={colores.fondo} />
              </Pressable>
            </View>
          </View>

          <SelectorCultivo valor={cultivo} onCambio={setCultivo} />

          <Card sinBorde style={estilos.flujo}>
            <Texto variante="etiqueta" color={colores.textoTenue}>
              CÓMO FUNCIONA
            </Texto>
            <View style={estilos.pasos}>
              {[
                { icono: 'camera' as const, texto: 'Foto' },
                { icono: 'create' as const, texto: 'Descripción' },
                { icono: 'leaf' as const, texto: 'Cultivo' },
              ].map((paso, i) => (
                <View key={paso.texto} style={estilos.paso}>
                  <Ionicons name={paso.icono} size={16} color={colores.textoSuave} />
                  <Texto variante="pequeno" color={colores.textoSuave}>
                    {paso.texto}
                  </Texto>
                  {i < 2 ? <Texto variante="pequeno" color={colores.textoTenue}>+</Texto> : null}
                </View>
              ))}
              <Ionicons name="arrow-forward" size={16} color={colores.verde} />
              <View style={estilos.chipIa}>
                <Ionicons name="hardware-chip" size={14} color={colores.verde} />
                <Texto variante="pequeno" color={colores.verde}>
                  IA local
                </Texto>
              </View>
            </View>
          </Card>
        </ScrollView>

        <View style={estilos.pie}>
          <BotonPrincipal
            titulo="Analizar con FitoIA"
            subtitulo={puedeAnalizar ? undefined : 'Escribe al menos unas palabras'}
            icono={<Ionicons name="sparkles" size={20} color={colores.fondo} />}
            disabled={!puedeAnalizar}
            onPress={analizar}
            tamano="principal"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.lg, gap: espacio.lg, paddingBottom: espacio.xxl },
  areaTexto: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    padding: espacio.md,
  },
  input: { minHeight: 110, color: colores.texto, fontSize: 16, lineHeight: 23 },
  pieTexto: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: espacio.sm },
  micro: {
    width: tactil.minimo,
    height: tactil.minimo,
    borderRadius: tactil.minimo / 2,
    backgroundColor: colores.cian,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flujo: { backgroundColor: colores.fondoElevado, gap: espacio.sm },
  pasos: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, flexWrap: 'wrap' },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipIa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colores.verde,
    borderRadius: radio.pill,
    paddingHorizontal: espacio.sm,
    paddingVertical: 2,
  },
  pie: {
    padding: espacio.lg,
    borderTopWidth: 1,
    borderTopColor: colores.bordeSuave,
    backgroundColor: colores.fondoElevado,
  },
});
