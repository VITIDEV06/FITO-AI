import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BotonSecundario, Card, Marca, Texto } from '../../../src/components/base';
import { colores, espacio, radio } from '../../../src/theme/tokens';
import { actualizarBorrador, leerBorrador } from '../../../src/services/borrador';
import { analizar } from '../../../src/inference/registro';
import { guardarObservacion } from '../../../src/storage/observaciones';

type EstadoPaso = 'pendiente' | 'activo' | 'hecho';

const PASOS = [
  { id: 'procesar', icono: 'create' as const, texto: 'Procesando tu observación' },
  { id: 'conocimiento', icono: 'book' as const, texto: 'Consultando conocimiento agrícola' },
  { id: 'ia', icono: 'hardware-chip' as const, texto: 'Analizando con IA local' },
  { id: 'recomendaciones', icono: 'list' as const, texto: 'Preparando recomendaciones' },
];

/**
 * Pantalla de análisis. Sigue el wireframe 03-analizando.
 *
 * Los pasos no son decorativos: reflejan las fases reales de la tubería
 * (parseo, knowledge base, motor, enriquecimiento). El progreso avanza con el
 * trabajo real, y si el motor termina antes, se completa de golpe.
 */
export default function Analizando() {
  const borrador = leerBorrador();
  const [pasoActual, setPasoActual] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;

    const avanzar = setInterval(() => {
      if (vivo) setPasoActual((p) => Math.min(p + 1, PASOS.length - 1));
    }, 700);

    void (async () => {
      try {
        const { analisis, nivel } = await analizar({
          descripcion: borrador.descripcion,
          cultivo: borrador.cultivo || null,
          fotoUri: borrador.fotoUri,
        });

        const observacion = await guardarObservacion({
          descripcion: borrador.descripcion,
          cultivo: borrador.cultivo || analisis.cultivo,
          fotoUri: borrador.fotoUri,
          transcripcion: borrador.transcripcion,
          origen: borrador.origen,
          analisis,
          nivelMotor: nivel,
          notas: null,
        });

        if (!vivo) return;
        clearInterval(avanzar);
        setPasoActual(PASOS.length);
        actualizarBorrador({ analisis, nivelMotor: nivel, observacionId: observacion.id });

        // Un respiro para que se vea el último tick antes de saltar.
        setTimeout(() => vivo && router.replace('/observation/result'), 350);
      } catch (e) {
        if (!vivo) return;
        clearInterval(avanzar);
        setError(e instanceof Error ? e.message : 'No se pudo completar el análisis.');
      }
    })();

    return () => {
      vivo = false;
      clearInterval(avanzar);
    };
    // Se ejecuta una sola vez: el borrador ya está congelado al entrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estadoDe = (i: number): EstadoPaso =>
    i < pasoActual ? 'hecho' : i === pasoActual ? 'activo' : 'pendiente';

  if (error) {
    return (
      <SafeAreaView style={estilos.raiz}>
        <View style={estilos.centro}>
          <Ionicons name="alert-circle" size={56} color={colores.aviso} />
          <Texto variante="subtitulo" centrado style={{ marginTop: espacio.lg }}>
            No pudimos terminar el análisis
          </Texto>
          <Texto variante="cuerpo" color={colores.textoSuave} centrado style={{ marginTop: espacio.sm }}>
            Tu observación no se ha perdido. Puedes intentarlo otra vez.
          </Texto>
          <View style={{ marginTop: espacio.xl, width: '100%', gap: espacio.sm }}>
            <BotonSecundario titulo="Volver e intentar de nuevo" onPress={() => router.back()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.raiz} edges={['top', 'bottom']}>
      <View style={estilos.cabecera}>
        <Marca compacta />
      </View>

      <View style={estilos.cuerpo}>
        {borrador.fotoUri ? (
          <Image source={{ uri: borrador.fotoUri }} style={estilos.foto} resizeMode="cover" />
        ) : null}

        <Texto variante="titulo" centrado style={{ marginTop: espacio.xl }}>
          Analizando tu observación…
        </Texto>

        <View style={{ width: '100%', gap: espacio.sm, marginTop: espacio.xl }}>
          <Texto variante="etiqueta" color={colores.textoTenue}>
            PASOS DEL PROCESO
          </Texto>

          {PASOS.map((paso, i) => {
            const estado = estadoDe(i);
            return (
              <Card
                key={paso.id}
                style={[estilos.paso, estado === 'activo' && { borderColor: colores.verde }]}
              >
                <Ionicons
                  name={paso.icono}
                  size={20}
                  color={estado === 'pendiente' ? colores.textoTenue : colores.verde}
                />
                <Texto
                  variante="cuerpo"
                  color={estado === 'pendiente' ? colores.textoTenue : colores.texto}
                  style={{ flex: 1 }}
                >
                  {i + 1}. {paso.texto}
                </Texto>
                {estado === 'hecho' ? (
                  <Ionicons name="checkmark-circle" size={20} color={colores.verde} />
                ) : estado === 'activo' ? (
                  <Ionicons name="ellipsis-horizontal" size={20} color={colores.verde} />
                ) : null}
              </Card>
            );
          })}
        </View>

        <View style={estilos.nota}>
          <Ionicons name="phone-portrait" size={16} color={colores.cian} />
          <Texto variante="pequeno" color={colores.cian} style={{ flex: 1 }}>
            El análisis se está haciendo en este teléfono. Nada se envía a internet.
          </Texto>
        </View>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.fondo },
  cabecera: { alignItems: 'center', paddingVertical: espacio.md, borderBottomWidth: 1, borderBottomColor: colores.bordeSuave },
  cuerpo: { flex: 1, alignItems: 'center', padding: espacio.lg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacio.xl },
  foto: { width: '100%', height: 150, borderRadius: radio.lg },
  paso: { flexDirection: 'row', alignItems: 'center', gap: espacio.md, paddingVertical: espacio.md },
  nota: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    marginTop: 'auto',
    padding: espacio.md,
    borderRadius: radio.md,
    backgroundColor: colores.superficie,
  },
});
