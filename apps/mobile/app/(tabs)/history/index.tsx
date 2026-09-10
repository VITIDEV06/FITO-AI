import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Observacion } from '@fitoai/core';
import { BotonPrincipal, Card, EstadoVacio, Texto } from '../../../src/components/base';
import { colores, espacio, radio, tactil } from '../../../src/theme/tokens';
import { cultivosDelHistorial, listarObservaciones } from '../../../src/storage/observaciones';
import { CERTIDUMBRE, haceCuanto } from '../../../src/services/formato';
import { reiniciarBorrador } from '../../../src/services/borrador';

/** Historial. Sigue el wireframe 06-historial: buscador + filtros + tarjetas. */
export default function Historial() {
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [cultivos, setCultivos] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    const [lista, crops] = await Promise.all([
      listarObservaciones({ busqueda, cultivo: filtro }),
      cultivosDelHistorial(),
    ]);
    setObservaciones(lista);
    setCultivos(crops);
    setCargando(false);
  }, [busqueda, filtro]);

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  const vacioSinDatos = !cargando && observaciones.length === 0 && !busqueda && !filtro;

  return (
    <SafeAreaView style={estilos.raiz} edges={['top']}>
      <View style={estilos.cabecera}>
        <Texto variante="display">Historial</Texto>
        <Texto variante="pequeno" color={colores.textoSuave}>
          {observaciones.length} {observaciones.length === 1 ? 'observación' : 'observaciones'}
        </Texto>
      </View>

      {!vacioSinDatos ? (
        <>
          <View style={estilos.buscador}>
            <Ionicons name="search" size={20} color={colores.textoTenue} />
            <TextInput
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar observaciones…"
              placeholderTextColor={colores.textoTenue}
              style={estilos.input}
              accessibilityLabel="Buscar en el historial"
              returnKeyType="search"
            />
            {busqueda ? (
              <Pressable onPress={() => setBusqueda('')} accessibilityLabel="Limpiar búsqueda" hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colores.textoTenue} />
              </Pressable>
            ) : null}
          </View>

          {cultivos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={estilos.filtros}
            >
              <Chip texto="Todos" activo={filtro === null} onPress={() => setFiltro(null)} />
              {cultivos.map((cultivo) => (
                <Chip
                  key={cultivo}
                  texto={cultivo}
                  activo={filtro === cultivo}
                  onPress={() => setFiltro(filtro === cultivo ? null : cultivo)}
                />
              ))}
            </ScrollView>
          ) : null}
        </>
      ) : null}

      {vacioSinDatos ? (
        <EstadoVacio
          titulo="Tu historial está vacío"
          descripcion="Cuando analices una observación aparecerá aquí, guardada en tu teléfono."
          accion={
            <BotonPrincipal
              titulo="Hacer mi primera observación"
              onPress={() => {
                reiniciarBorrador();
                router.push('/observation');
              }}
            />
          }
        />
      ) : (
        <FlatList
          data={observaciones}
          keyExtractor={(o) => o.id}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            cargando ? null : (
              <Card style={{ marginTop: espacio.lg }}>
                <Texto variante="cuerpoFuerte">Sin resultados</Texto>
                <Texto variante="pequeno" color={colores.textoSuave} style={{ marginTop: espacio.xs }}>
                  Prueba con otra palabra o quita el filtro de cultivo.
                </Texto>
              </Card>
            )
          }
          renderItem={({ item }) => <Fila observacion={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function Fila({ observacion }: { observacion: Observacion }) {
  const certidumbre = observacion.analisis
    ? CERTIDUMBRE[observacion.analisis.nivelCertidumbre]
    : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${observacion.cultivo}. ${observacion.descripcion}`}
      onPress={() => router.push(`/history/${observacion.id}`)}
      style={({ pressed }) => pressed && { opacity: 0.8 }}
    >
      <Card style={estilos.fila}>
        {observacion.fotoUri ? (
          <Image source={{ uri: observacion.fotoUri }} style={estilos.miniatura} />
        ) : (
          <View style={[estilos.miniatura, estilos.miniaturaVacia]}>
            <Ionicons name="document-text" size={22} color={colores.textoTenue} />
          </View>
        )}

        <View style={{ flex: 1, gap: 2 }}>
          <View style={estilos.filaTitulo}>
            <Texto variante="cuerpoFuerte" numberOfLines={1} style={{ flex: 1, textTransform: 'capitalize' }}>
              {observacion.cultivo || 'Sin cultivo'}
            </Texto>
            {certidumbre ? (
              <View style={[estilos.puntoCertidumbre, { backgroundColor: certidumbre.color }]} />
            ) : null}
          </View>
          <Texto variante="pequeno" color={colores.textoSuave} numberOfLines={2}>
            {observacion.descripcion}
          </Texto>
          <Texto variante="pequeno" color={colores.textoTenue}>
            {haceCuanto(observacion.creadoEn)}
          </Texto>
        </View>

        <Ionicons name="chevron-forward" size={20} color={colores.textoTenue} />
      </Card>
    </Pressable>
  );
}

function Chip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      style={[estilos.chip, activo && estilos.chipActivo]}
    >
      <Texto variante="pequeno" color={activo ? colores.fondo : colores.textoSuave} style={{ textTransform: 'capitalize' }}>
        {texto}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.fondo },
  cabecera: { paddingHorizontal: espacio.lg, paddingTop: espacio.md, paddingBottom: espacio.sm },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    marginHorizontal: espacio.lg,
    paddingHorizontal: espacio.md,
    minHeight: tactil.minimo,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
  },
  input: { flex: 1, color: colores.texto, fontSize: 16 },
  filtros: { gap: espacio.sm, paddingHorizontal: espacio.lg, paddingVertical: espacio.md },
  chip: {
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.sm,
    borderRadius: radio.pill,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
    minHeight: 38,
    justifyContent: 'center',
  },
  chipActivo: { backgroundColor: colores.verde, borderColor: colores.verde },
  lista: { padding: espacio.lg, gap: espacio.md, paddingBottom: espacio.xxxl },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  miniatura: { width: 60, height: 60, borderRadius: radio.md, backgroundColor: colores.superficieAlta },
  miniaturaVacia: { alignItems: 'center', justifyContent: 'center' },
  puntoCertidumbre: { width: 9, height: 9, borderRadius: 5 },
});
