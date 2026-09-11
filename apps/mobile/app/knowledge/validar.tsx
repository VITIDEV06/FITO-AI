import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Aporte, EstadoAporte } from '@fitoai/core';
import { BotonPrincipal, BotonSecundario, Card, EstadoVacio, Pildora, Texto } from '../../src/components/base';
import { Cabecera } from '../../src/components/Cabecera';
import { colores, espacio, radio } from '../../src/theme/tokens';
import { cambiarEstadoAporte, listarAportes } from '../../src/storage/aportes';
import { promoverConocimientoDesdeAporte } from '../../src/storage/conocimiento';
import { haceCuanto } from '../../src/services/formato';

/**
 * Panel de validación de aportes.
 *
 * FitoIA es offline-first y no tiene backend con roles remotos: no existe una
 * cuenta de "moderador" separada. Para la competición, este es el mecanismo
 * local razonable que pide el punto 16 — cualquier persona con el teléfono en
 * la mano puede revisar, pero es una pantalla aparte de "Nuevo aporte" y
 * ningún aporte llega a 'validated' sin pasar por aquí explícitamente. En un
 * despliegue real esto se ligaría a una cuenta de revisor autenticada.
 */
export default function PanelValidacion() {
  const [aportes, setAportes] = useState<Aporte[] | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [procesando, setProcesando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const lista = await listarAportes('pending');
    setAportes(lista);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      void (async () => {
        const lista = await listarAportes('pending');
        if (vivo) setAportes(lista);
      })();
      return () => {
        vivo = false;
      };
    }, []),
  );

  const resolver = async (aporte: Aporte, destino: EstadoAporte) => {
    setProcesando(aporte.id);
    try {
      const nota = notas[aporte.id]?.trim() || undefined;
      await cambiarEstadoAporte(aporte.id, destino, nota);
      if (destino === 'validated') {
        await promoverConocimientoDesdeAporte(aporte);
      }
      await cargar();
    } catch (error) {
      Alert.alert(
        'No se pudo actualizar',
        error instanceof Error ? error.message : 'Error desconocido.',
      );
    } finally {
      setProcesando(null);
    }
  };

  const confirmarRechazo = (aporte: Aporte) => {
    Alert.alert('Rechazar aporte', '¿Seguro que quieres rechazar este aporte? No entrará al conocimiento de FitoIA.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Rechazar', style: 'destructive', onPress: () => void resolver(aporte, 'rejected') },
    ]);
  };

  return (
    <SafeAreaView style={estilos.raiz} edges={['top']}>
      <Cabecera titulo="Cola de validación" />

      {aportes && aportes.length === 0 ? (
        <EstadoVacio
          titulo="No hay aportes pendientes"
          descripcion="Cuando alguien guarde un aporte nuevo, aparecerá aquí para revisión antes de poder usarse."
        />
      ) : (
        <FlatList
          data={aportes ?? []}
          keyExtractor={(a) => a.id}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Card style={estilos.explicacion}>
              <View style={estilos.filaIcono}>
                <Ionicons name="shield-checkmark" size={18} color={colores.cian} />
                <Texto variante="cuerpoFuerte" color={colores.cian}>
                  Validación local (modo demostración)
                </Texto>
              </View>
              <Texto variante="pequeno" color={colores.textoSuave} style={{ marginTop: espacio.sm }}>
                Solo un aporte APROBADO aquí pasa a formar parte del conocimiento que FitoIA
                puede usar en sus análisis, y siempre como &quot;sin verificar&quot;: nunca sube la
                certeza de un diagnóstico por sí solo.
              </Texto>
            </Card>
          }
          renderItem={({ item }) => {
            const abierto = expandido === item.id;
            const ocupado = procesando === item.id;
            return (
              <Card>
                <View style={estilos.filaEntre}>
                  <Texto variante="cuerpoFuerte" style={{ flex: 1, textTransform: 'capitalize' }} numberOfLines={1}>
                    {item.crop}
                  </Texto>
                  <Pildora texto="PENDIENTE" color={colores.aviso} />
                </View>

                <View style={estilos.cuerpo}>
                  {item.fotoUri ? <Image source={{ uri: item.fotoUri }} style={estilos.miniatura} /> : null}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Texto variante="cuerpo" numberOfLines={abierto ? undefined : 2}>
                      {item.observacion}
                    </Texto>
                    <Texto variante="pequeno" color={colores.textoTenue}>
                      {haceCuanto(item.creadoEn)}
                    </Texto>
                  </View>
                </View>

                <BotonSecundario
                  titulo={abierto ? 'Ver menos' : 'Ver detalle completo'}
                  tamano="minimo"
                  onPress={() => setExpandido(abierto ? null : item.id)}
                  style={{ marginTop: espacio.sm }}
                />

                {abierto ? (
                  <View style={{ gap: espacio.sm, marginTop: espacio.md }}>
                    <Detalle etiqueta="Síntomas" valor={item.symptoms.join(', ') || '—'} />
                    <Detalle etiqueta="Descripción" valor={item.descripcion || '—'} />
                    <Detalle etiqueta="Información adicional" valor={item.informacionAdicional || '—'} />
                    <Detalle etiqueta="Zona" valor={item.region || '—'} />
                    <Detalle etiqueta="Fuente declarada" valor={item.source || '—'} />

                    <Texto variante="etiqueta" color={colores.textoTenue} style={{ marginTop: espacio.xs }}>
                      NOTA DE REVISIÓN (OPCIONAL)
                    </Texto>
                    <TextInput
                      value={notas[item.id] ?? ''}
                      onChangeText={(texto) => setNotas((prev) => ({ ...prev, [item.id]: texto }))}
                      placeholder="Motivo de la decisión, para el registro…"
                      placeholderTextColor={colores.textoTenue}
                      multiline
                      style={estilos.nota}
                    />

                    <View style={estilos.acciones}>
                      <BotonSecundario
                        titulo="Archivar"
                        tamano="minimo"
                        disabled={ocupado}
                        onPress={() => void resolver(item, 'archived')}
                        style={{ flex: 1 }}
                      />
                      <BotonSecundario
                        titulo="Rechazar"
                        tamano="minimo"
                        disabled={ocupado}
                        onPress={() => confirmarRechazo(item)}
                        style={{ flex: 1, borderColor: colores.peligro }}
                      />
                      <BotonPrincipal
                        titulo="Aprobar"
                        tamano="minimo"
                        cargando={ocupado}
                        onPress={() => void resolver(item, 'validated')}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                ) : null}
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function Detalle({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View>
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
  lista: { padding: espacio.lg, gap: espacio.md, paddingBottom: espacio.xxl },
  explicacion: { backgroundColor: colores.fondoElevado, borderColor: colores.cian },
  filaIcono: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espacio.sm },
  cuerpo: { flexDirection: 'row', gap: espacio.md, marginTop: espacio.md },
  miniatura: { width: 56, height: 56, borderRadius: radio.md, backgroundColor: colores.superficieAlta },
  nota: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
    minHeight: 60,
    color: colores.texto,
    textAlignVertical: 'top',
  },
  acciones: { flexDirection: 'row', gap: espacio.sm, marginTop: espacio.xs },
});
