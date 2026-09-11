import { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Aporte, EstadoAporte } from '@fitoai/core';
import { BotonPrincipal, Card, EstadoVacio, Pildora, Texto } from '../../src/components/base';
import { Cabecera } from '../../src/components/Cabecera';
import { colores, espacio, radio } from '../../src/theme/tokens';
import { listarAportes } from '../../src/storage/aportes';
import { haceCuanto } from '../../src/services/formato';

const ESTADO: Record<EstadoAporte, { texto: string; color: string; explicacion: string }> = {
  pending: {
    texto: 'PENDIENTE',
    color: colores.aviso,
    explicacion: 'Guardado en tu teléfono. Aún no forma parte del conocimiento de FitoIA.',
  },
  validated: {
    texto: 'VALIDADO',
    color: colores.verde,
    explicacion: 'Revisado y aceptado como conocimiento agrícola.',
  },
  rejected: {
    texto: 'RECHAZADO',
    color: colores.peligro,
    explicacion: 'No se pudo confirmar. Sigue guardado como tu registro personal.',
  },
  archived: {
    texto: 'ARCHIVADO',
    color: colores.textoTenue,
    explicacion: 'Guardado para consulta, fuera del flujo de revisión.',
  },
};

/**
 * Aportes de conocimiento del usuario.
 *
 * La pantalla insiste, visualmente y por escrito, en la separación entre
 * CONOCIMIENTO VERIFICADO y APORTES SIN VERIFICAR. Un aporte nace 'pending' y
 * no hay ningún camino en la app que lo promueva solo.
 */
export default function Conocimiento() {
  const [aportes, setAportes] = useState<Aporte[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      void (async () => {
        const lista = await listarAportes();
        if (vivo) setAportes(lista);
      })();
      return () => {
        vivo = false;
      };
    }, []),
  );

  const nuevo = () => router.push('/knowledge/new');

  return (
    <SafeAreaView style={estilos.raiz} edges={['top']}>
      <Cabecera
        titulo="Aportar conocimiento"
        accion={{ icono: 'shield-checkmark-outline', etiqueta: 'Cola de validación', onPress: () => router.push('/knowledge/validar') }}
      />

      {aportes && aportes.length === 0 ? (
        <EstadoVacio
          titulo="Comparte lo que sabes de tu campo"
          descripcion="Tus observaciones ayudan a que FitoIA reconozca mejor los problemas de tu zona. Todo se guarda en tu teléfono."
          accion={<BotonPrincipal titulo="Hacer mi primer aporte" onPress={nuevo} />}
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
                  Cómo se usa tu aporte
                </Texto>
              </View>
              <Texto variante="pequeno" color={colores.textoSuave} style={{ marginTop: espacio.sm }}>
                Lo que aportas queda guardado como pendiente y se mantiene separado del
                conocimiento verificado. Nunca se convierte automáticamente en una
                recomendación de FitoIA: primero tiene que revisarlo una persona.
              </Texto>
            </Card>
          }
          renderItem={({ item }) => {
            const estado = ESTADO[item.estado];
            return (
              <Card>
                <View style={estilos.filaEntre}>
                  <Texto variante="cuerpoFuerte" style={{ flex: 1, textTransform: 'capitalize' }} numberOfLines={1}>
                    {item.crop}
                  </Texto>
                  <Pildora texto={estado.texto} color={estado.color} />
                </View>

                <View style={estilos.cuerpo}>
                  {item.fotoUri ? (
                    <Image source={{ uri: item.fotoUri }} style={estilos.miniatura} />
                  ) : null}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Texto variante="cuerpo" numberOfLines={2}>
                      {item.observacion}
                    </Texto>
                    {item.symptoms.length ? (
                      <Texto variante="pequeno" color={colores.textoSuave} numberOfLines={1}>
                        {item.symptoms.join(' · ')}
                      </Texto>
                    ) : null}
                    <Texto variante="pequeno" color={colores.textoTenue}>
                      {haceCuanto(item.creadoEn)}
                    </Texto>
                  </View>
                </View>

                <Texto variante="pequeno" color={colores.textoTenue} style={{ marginTop: espacio.sm }}>
                  {estado.explicacion}
                </Texto>
              </Card>
            );
          }}
        />
      )}

      {aportes && aportes.length > 0 ? (
        <View style={estilos.pie}>
          <BotonPrincipal
            titulo="Nuevo aporte"
            icono={<Ionicons name="add" size={20} color={colores.fondo} />}
            onPress={nuevo}
          />
        </View>
      ) : null}
    </SafeAreaView>
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
  pie: {
    padding: espacio.lg,
    borderTopWidth: 1,
    borderTopColor: colores.bordeSuave,
    backgroundColor: colores.fondoElevado,
  },
});
