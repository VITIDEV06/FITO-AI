import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BotonSecundario, Card, Cargando, Pildora, Texto } from '../../../src/components/base';
import { Cabecera } from '../../../src/components/Cabecera';
import { colores, espacio, radio } from '../../../src/theme/tokens';
import { descargarModelo, eliminarModelo, estadoDeModelos, type EstadoDescarga } from '../../../src/inference/gestorModelos';
import { formatearTamano } from '../../../src/inference/modelos';
import { descargaSoloWifi, guardarDescargaSoloWifi } from '../../../src/services/preferencias';
import { reiniciarMotor } from '../../../src/inference/registro';

const ETIQUETAS: Record<string, { texto: string; color: string }> = {
  ausente: { texto: 'NO DESCARGADO', color: colores.textoTenue },
  no_soportado: { texto: 'NO DISPONIBLE', color: colores.textoTenue },
  verificando: { texto: 'VERIFICANDO', color: colores.cian },
  descargando: { texto: 'DESCARGANDO', color: colores.cian },
  parcial: { texto: 'INCOMPLETO', color: colores.aviso },
  listo: { texto: 'LISTO', color: colores.verde },
  error: { texto: 'ERROR', color: colores.peligro },
};

export default function AdministrarModelos() {
  const [modelos, setModelos] = useState<EstadoDescarga[] | null>(null);
  const [soloWifi, setSoloWifi] = useState(true);
  const [progresos, setProgresos] = useState<Record<string, number>>({});

  const recargar = useCallback(async () => {
    const [lista, wifi] = await Promise.all([estadoDeModelos(), descargaSoloWifi()]);
    setModelos(lista);
    setSoloWifi(wifi);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  const descargar = (modelo: EstadoDescarga) => {
    Alert.alert(
      `Descargar ${modelo.definicion.nombre}`,
      `Se descargarán ${formatearTamano(modelo.definicion.tamanoMb)}. ` +
        'Después funcionará sin conexión para siempre.' +
        (soloWifi ? '\n\nSolo se descargará con Wi-Fi.' : '\n\nSe usarán tus datos móviles.'),
      [
        { text: 'Ahora no', style: 'cancel' },
        {
          text: 'Descargar',
          onPress: async () => {
            await descargarModelo(modelo.id, (p) =>
              setProgresos((prev) => ({ ...prev, [modelo.id]: p.porcentaje })),
            );
            reiniciarMotor();
            await recargar();
          },
        },
      ],
    );
  };

  const eliminar = (modelo: EstadoDescarga) => {
    Alert.alert(
      `¿Liberar ${formatearTamano(modelo.definicion.tamanoMb)}?`,
      'Podrás volver a descargarlo, pero necesitarás conexión.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await eliminarModelo(modelo.id);
            reiniciarMotor();
            await recargar();
          },
        },
      ],
    );
  };

  if (!modelos) {
    return (
      <SafeAreaView style={estilos.raiz} edges={['top']}>
        <Cabecera titulo="Modelos" />
        <Cargando mensaje="Comprobando modelos…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.raiz} edges={['top']}>
      <Cabecera titulo="Administrar modelos" />

      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={estilos.filaEntre}>
            <View style={{ flex: 1, paddingRight: espacio.md }}>
              <Texto variante="cuerpoFuerte">Descargar solo con Wi-Fi</Texto>
              <Texto variante="pequeno" color={colores.textoSuave}>
                Recomendado: algunos modelos ocupan cientos de megas.
              </Texto>
            </View>
            <Switch
              value={soloWifi}
              onValueChange={async (v) => {
                setSoloWifi(v);
                await guardarDescargaSoloWifi(v);
              }}
              trackColor={{ true: colores.verdeOscuro, false: colores.borde }}
              thumbColor={soloWifi ? colores.verde : colores.textoTenue}
            />
          </View>
        </Card>

        <Texto variante="pequeno" color={colores.textoSuave}>
          FitoIA ya funciona sin descargar nada: analiza con la base de conocimiento del
          teléfono. Estos modelos añaden voz e IA, y una vez descargados no vuelven a
          necesitar internet.
        </Texto>

        {modelos.map((modelo) => {
          const etiqueta = ETIQUETAS[modelo.estado] ?? ETIQUETAS.ausente;
          const progreso = progresos[modelo.id] ?? modelo.progreso;
          const descargando = modelo.estado === 'descargando';

          return (
            <Card key={modelo.id}>
              <View style={estilos.filaEntre}>
                <Texto variante="cuerpoFuerte" style={{ flex: 1 }}>
                  {modelo.definicion.nombre}
                </Texto>
                <Pildora texto={etiqueta.texto} color={etiqueta.color} />
              </View>

              <Texto variante="pequeno" color={colores.textoSuave} style={{ marginTop: espacio.xs }}>
                {modelo.definicion.descripcion}
              </Texto>

              <View style={[estilos.filaEntre, { marginTop: espacio.sm }]}>
                <Texto variante="pequeno" color={colores.textoTenue}>
                  {formatearTamano(modelo.definicion.tamanoMb)}
                  {modelo.definicion.tamanoConfirmado ? '' : ' (aprox.)'}
                </Texto>
                <Texto variante="pequeno" color={colores.textoTenue}>
                  Nivel {modelo.definicion.nivel}
                </Texto>
              </View>

              {descargando ? (
                <>
                  <View style={estilos.barra}>
                    <View style={[estilos.barraRelleno, { width: `${progreso}%` }]} />
                  </View>
                  {/* Progreso en MB: un porcentaje solo, en una descarga de 20
                      minutos, no le dice nada útil al usuario. */}
                  <Texto variante="pequeno" color={colores.cian} style={{ marginTop: espacio.xs }}>
                    {Math.round((progreso / 100) * modelo.definicion.tamanoMb)} de{' '}
                    {modelo.definicion.tamanoMb} MB
                  </Texto>
                </>
              ) : null}

              {modelo.bloqueo ? (
                <View style={estilos.bloqueo}>
                  <Ionicons name="information-circle" size={18} color={colores.aviso} />
                  <Texto variante="pequeno" color={colores.textoSuave} style={{ flex: 1 }}>
                    {modelo.bloqueo}
                  </Texto>
                </View>
              ) : modelo.estado === 'listo' ? (
                <BotonSecundario
                  titulo="Eliminar del teléfono"
                  icono={<Ionicons name="trash-outline" size={18} color={colores.textoSuave} />}
                  onPress={() => eliminar(modelo)}
                  style={{ marginTop: espacio.md }}
                />
              ) : !descargando ? (
                <BotonSecundario
                  titulo={modelo.estado === 'parcial' ? 'Reanudar descarga' : 'Descargar'}
                  icono={<Ionicons name="cloud-download" size={18} color={colores.verde} />}
                  onPress={() => descargar(modelo)}
                  style={{ marginTop: espacio.md }}
                />
              ) : null}

              {modelo.errorMensaje && modelo.estado !== 'listo' ? (
                <Texto variante="pequeno" color={colores.aviso} style={{ marginTop: espacio.sm }}>
                  {modelo.errorMensaje}
                </Texto>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.lg, gap: espacio.md, paddingBottom: espacio.xxxl },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barra: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colores.superficieAlta,
    marginTop: espacio.md,
    overflow: 'hidden',
  },
  barraRelleno: { height: '100%', backgroundColor: colores.cian, borderRadius: 4 },
  bloqueo: {
    flexDirection: 'row',
    gap: espacio.sm,
    marginTop: espacio.md,
    padding: espacio.md,
    borderRadius: radio.md,
    backgroundColor: colores.fondoElevado,
  },
});
