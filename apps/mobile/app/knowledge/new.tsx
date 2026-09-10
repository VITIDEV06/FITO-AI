import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BotonPrincipal, BotonSecundario, Card, Pildora, Texto } from '../../src/components/base';
import { Cabecera } from '../../src/components/Cabecera';
import { CapturaFoto } from '../../src/components/CapturaFoto';
import { SelectorCultivo } from '../../src/components/SelectorCultivo';
import { colores, espacio, radio, tactil } from '../../src/theme/tokens';
import { guardarAporte } from '../../src/storage/aportes';

/**
 * Flujo de aporte, exactamente el que se pidió:
 *   foto -> qué observas -> cultivo -> síntomas -> descripción ->
 *   información adicional -> fuente (opcional) -> revisar -> guardar
 *
 * Se presenta en 4 pasos en lugar de 8 pantallas: en campo, ocho saltos
 * abandonan al usuario a mitad. Cada paso agrupa lo que va junto y muestra
 * su progreso.
 */
const PASOS = ['Foto y cultivo', 'Qué observas', 'Detalles', 'Revisar'] as const;

export default function NuevoAporte() {
  const [paso, setPaso] = useState(0);
  const [guardando, setGuardando] = useState(false);

  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [crop, setCrop] = useState('');
  const [observacion, setObservacion] = useState('');
  const [sintoma, setSintoma] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [descripcion, setDescripcion] = useState('');
  const [informacionAdicional, setInformacionAdicional] = useState('');
  const [source, setSource] = useState('');
  const [region, setRegion] = useState('');

  const puedeAvanzar =
    paso === 0 ? crop.trim().length > 0 : paso === 1 ? observacion.trim().length >= 5 : true;

  const anadirSintoma = () => {
    const limpio = sintoma.trim();
    if (!limpio || symptoms.includes(limpio)) return;
    setSymptoms([...symptoms, limpio]);
    setSintoma('');
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarAporte({
        fotoUri,
        observacion: observacion.trim(),
        crop: crop.trim(),
        symptoms,
        descripcion: descripcion.trim(),
        informacionAdicional: informacionAdicional.trim() || null,
        source: source.trim() || null,
        sourceUrl: null,
        region: region.trim() || null,
      });
      router.replace('/knowledge');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.raiz} edges={['top']}>
      <Cabecera titulo="Nuevo aporte" />

      <View style={estilos.progreso}>
        {PASOS.map((nombre, i) => (
          <View key={nombre} style={estilos.progresoItem}>
            <View style={[estilos.progresoBarra, i <= paso && { backgroundColor: colores.verde }]} />
            <Texto variante="pequeno" color={i <= paso ? colores.verde : colores.textoTenue}>
              {nombre}
            </Texto>
          </View>
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {paso === 0 ? (
            <>
              <Texto variante="subtitulo">Foto y cultivo</Texto>
              <CapturaFoto fotoUri={fotoUri} onFoto={setFotoUri} />
              <SelectorCultivo valor={crop} onCambio={setCrop} />
            </>
          ) : null}

          {paso === 1 ? (
            <>
              <Texto variante="subtitulo">¿Qué estás observando?</Texto>
              <Campo
                valor={observacion}
                onCambio={setObservacion}
                marcador="Ej: mancha circular marrón con borde amarillo en hojas bajas"
                alto
                etiqueta="OBSERVACIÓN"
              />

              <View style={{ gap: espacio.sm }}>
                <Texto variante="etiqueta" color={colores.textoTenue}>
                  SÍNTOMAS
                </Texto>
                <View style={estilos.filaSintoma}>
                  <TextInput
                    value={sintoma}
                    onChangeText={setSintoma}
                    placeholder="Añade un síntoma…"
                    placeholderTextColor={colores.textoTenue}
                    style={estilos.inputSintoma}
                    onSubmitEditing={anadirSintoma}
                    returnKeyType="done"
                    accessibilityLabel="Añadir síntoma"
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Añadir a la lista"
                    onPress={anadirSintoma}
                    disabled={!sintoma.trim()}
                    style={[estilos.anadir, !sintoma.trim() && { opacity: 0.4 }]}
                  >
                    <Ionicons name="add" size={24} color={colores.fondo} />
                  </Pressable>
                </View>

                {symptoms.length ? (
                  <View style={estilos.chips}>
                    {symptoms.map((s) => (
                      <Pressable
                        key={s}
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar ${s}`}
                        onPress={() => setSymptoms(symptoms.filter((x) => x !== s))}
                        style={estilos.chip}
                      >
                        <Texto variante="pequeno" color={colores.texto}>
                          {s}
                        </Texto>
                        <Ionicons name="close" size={14} color={colores.textoSuave} />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          {paso === 2 ? (
            <>
              <Texto variante="subtitulo">Detalles</Texto>
              <Campo
                valor={descripcion}
                onCambio={setDescripcion}
                marcador="Cómo evolucionó, qué hiciste, qué resultado tuvo…"
                alto
                etiqueta="DESCRIPCIÓN"
              />
              <Campo
                valor={informacionAdicional}
                onCambio={setInformacionAdicional}
                marcador="Clima, riego, momento del ciclo, variedad…"
                alto
                etiqueta="INFORMACIÓN ADICIONAL"
              />
              <Campo valor={region} onCambio={setRegion} marcador="Ej: Valle del Cauca" etiqueta="ZONA O REGIÓN" />
              <Campo
                valor={source}
                onCambio={setSource}
                marcador="Técnico, cartilla, experiencia propia…"
                etiqueta="FUENTE (OPCIONAL)"
              />
              <Texto variante="pequeno" color={colores.textoSuave}>
                Si tu aporte viene de una fuente concreta, indícala: es lo que permitirá
                verificarlo más adelante.
              </Texto>
            </>
          ) : null}

          {paso === 3 ? (
            <>
              <Texto variante="subtitulo">Revisa tu aporte</Texto>

              <Card>
                <Resumen etiqueta="Cultivo" valor={crop} />
                <Resumen etiqueta="Observación" valor={observacion} />
                <Resumen etiqueta="Síntomas" valor={symptoms.join(', ') || '—'} />
                <Resumen etiqueta="Descripción" valor={descripcion || '—'} />
                <Resumen etiqueta="Información adicional" valor={informacionAdicional || '—'} />
                <Resumen etiqueta="Zona" valor={region || '—'} />
                <Resumen etiqueta="Fuente" valor={source || '—'} />
                <Resumen etiqueta="Foto" valor={fotoUri ? 'Adjunta' : 'Sin foto'} />
              </Card>

              {/* Expectativa clara antes de guardar */}
              <Card style={{ borderColor: colores.aviso }}>
                <View style={estilos.filaIcono}>
                  <Ionicons name="information-circle" size={18} color={colores.aviso} />
                  <Pildora texto="SE GUARDA COMO PENDIENTE" color={colores.aviso} />
                </View>
                <Texto variante="pequeno" color={colores.textoSuave} style={{ marginTop: espacio.sm }}>
                  Tu aporte se queda en tu teléfono y no pasa a ser conocimiento de FitoIA
                  hasta que una persona lo revise. Mientras tanto no afecta a los análisis.
                </Texto>
              </Card>
            </>
          ) : null}
        </ScrollView>

        <View style={estilos.pie}>
          {paso > 0 ? (
            <BotonSecundario titulo="Atrás" onPress={() => setPaso(paso - 1)} style={{ flex: 1 }} />
          ) : null}
          {paso < PASOS.length - 1 ? (
            <BotonPrincipal
              titulo="Continuar"
              disabled={!puedeAvanzar}
              onPress={() => setPaso(paso + 1)}
              style={{ flex: 2 }}
            />
          ) : (
            <BotonPrincipal
              titulo="Guardar aporte"
              cargando={guardando}
              onPress={guardar}
              style={{ flex: 2 }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Campo({
  valor,
  onCambio,
  marcador,
  etiqueta,
  alto,
}: {
  valor: string;
  onCambio: (v: string) => void;
  marcador: string;
  etiqueta: string;
  alto?: boolean;
}) {
  return (
    <View style={{ gap: espacio.xs }}>
      <Texto variante="etiqueta" color={colores.textoTenue}>
        {etiqueta}
      </Texto>
      <TextInput
        value={valor}
        onChangeText={onCambio}
        placeholder={marcador}
        placeholderTextColor={colores.textoTenue}
        multiline={alto}
        textAlignVertical={alto ? 'top' : 'center'}
        style={[estilos.campo, alto && { minHeight: 90 }]}
        accessibilityLabel={etiqueta}
      />
    </View>
  );
}

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={{ marginBottom: espacio.md }}>
      <Texto variante="etiqueta" color={colores.textoTenue}>
        {etiqueta.toUpperCase()}
      </Texto>
      <Texto variante="cuerpo" style={{ marginTop: 2 }}>
        {valor}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.fondo },
  progreso: { flexDirection: 'row', gap: espacio.xs, paddingHorizontal: espacio.lg, paddingVertical: espacio.md },
  progresoItem: { flex: 1, gap: espacio.xs },
  progresoBarra: { height: 4, borderRadius: 2, backgroundColor: colores.borde },
  contenido: { padding: espacio.lg, gap: espacio.lg, paddingBottom: espacio.xxl },
  campo: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
    minHeight: tactil.comodo,
    color: colores.texto,
    fontSize: 16,
  },
  filaSintoma: { flexDirection: 'row', gap: espacio.sm },
  inputSintoma: {
    flex: 1,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    paddingHorizontal: espacio.lg,
    minHeight: tactil.comodo,
    color: colores.texto,
    fontSize: 16,
  },
  anadir: {
    width: tactil.comodo,
    height: tactil.comodo,
    borderRadius: radio.md,
    backgroundColor: colores.verde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    backgroundColor: colores.superficieAlta,
    borderRadius: radio.pill,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
  },
  filaIcono: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  pie: {
    flexDirection: 'row',
    gap: espacio.sm,
    padding: espacio.lg,
    borderTopWidth: 1,
    borderTopColor: colores.bordeSuave,
    backgroundColor: colores.fondoElevado,
  },
});
