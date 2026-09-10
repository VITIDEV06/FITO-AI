import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { NIVEL, REQUISITOS } from '@fitoai/core';
import { BotonSecundario, Card, Cargando, Pildora, Texto } from '../../../src/components/base';
import { colores, espacio, radio } from '../../../src/theme/tokens';
import { obtenerMotor, type EstadoMotor } from '../../../src/inference/registro';
import { contarPorEstado } from '../../../src/storage/conocimiento';
import { contarObservaciones } from '../../../src/storage/observaciones';
import { contarAportesPorEstado } from '../../../src/storage/aportes';
import { espacioLibreMb, espacioTotalMb, espacioUsadoPorFotosMb } from '../../../src/services/almacenamiento';
import { formatearTamano } from '../../../src/inference/modelos';

interface Resumen {
  motor: EstadoMotor;
  conocimiento: Record<string, number>;
  observaciones: number;
  aportes: Record<string, number>;
  discoLibre: number;
  discoTotal: number;
  fotos: number;
}

/** Estado del sistema. Sigue el wireframe 08-estado. */
export default function Estado() {
  const [resumen, setResumen] = useState<Resumen | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      void (async () => {
        const [motor, conocimiento, observaciones, aportes, discoLibre, discoTotal, fotos] =
          await Promise.all([
            obtenerMotor(),
            contarPorEstado(),
            contarObservaciones(),
            contarAportesPorEstado(),
            espacioLibreMb(),
            espacioTotalMb(),
            espacioUsadoPorFotosMb(),
          ]);
        if (!vivo) return;
        setResumen({ motor, conocimiento, observaciones, aportes, discoLibre, discoTotal, fotos });
      })();
      return () => {
        vivo = false;
      };
    }, []),
  );

  if (!resumen) {
    return (
      <SafeAreaView style={estilos.raiz} edges={['top']}>
        <Cargando mensaje="Revisando tu dispositivo…" />
      </SafeAreaView>
    );
  }

  const { motor, diagnostico } = { motor: resumen.motor, diagnostico: resumen.motor.diagnostico };
  const nivelActivo = motor.nivelActivo;
  const totalConocimiento = Object.values(resumen.conocimiento).reduce((a, b) => a + b, 0);
  const verificados = resumen.conocimiento.verified ?? 0;
  const usadoPorcentaje =
    resumen.discoTotal > 0 ? 1 - resumen.discoLibre / resumen.discoTotal : 0;

  return (
    <SafeAreaView style={estilos.raiz} edges={['top']}>
      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <Texto variante="display">Estado del sistema</Texto>

        {/* Modo offline: la promesa central del producto */}
        <Card style={{ borderColor: colores.verde }}>
          <View style={estilos.filaCentro}>
            <Ionicons name="cloud-offline" size={30} color={colores.verde} />
            <View style={{ flex: 1 }}>
              <Texto variante="subtitulo" color={colores.verde}>
                Modo offline
              </Texto>
              <Texto variante="pequeno" color={colores.textoSuave}>
                FitoIA funciona en este dispositivo. Nada de lo que escribes o fotografías sale del teléfono.
              </Texto>
            </View>
          </View>
        </Card>

        {/* Nivel de servicio activo: la degradación es explícita, no oculta */}
        <Card>
          <View style={estilos.filaEntre}>
            <Texto variante="etiqueta" color={colores.textoTenue}>
              NIVEL ACTIVO
            </Texto>
            <Pildora
              texto={`NIVEL ${nivelActivo}`}
              color={nivelActivo === NIVEL.KB ? colores.aviso : colores.verde}
            />
          </View>
          <Texto variante="cuerpoFuerte" style={{ marginTop: espacio.xs }}>
            {REQUISITOS[nivelActivo as keyof typeof REQUISITOS]?.nombre ?? 'Conocimiento local'}
          </Texto>
          <Texto variante="pequeno" color={colores.textoSuave} style={{ marginTop: espacio.xs }}>
            {REQUISITOS[nivelActivo as keyof typeof REQUISITOS]?.descripcion}
          </Texto>

          {motor.motivoDegradacion ? (
            <View style={estilos.aviso}>
              <Ionicons name="information-circle" size={18} color={colores.aviso} />
              <Texto variante="pequeno" color={colores.textoSuave} style={{ flex: 1 }}>
                {motor.motivoDegradacion}
              </Texto>
            </View>
          ) : null}
        </Card>

        <BotonSecundario
          titulo="Administrar modelos"
          subtitulo="Descargar o liberar espacio"
          icono={<Ionicons name="cube" size={20} color={colores.cian} />}
          onPress={() => router.push('/settings/models')}
        />

        {/* Conocimiento agrícola: honestidad sobre qué es verificado */}
        <Card>
          <View style={estilos.filaEntre}>
            <Texto variante="etiqueta" color={colores.textoTenue}>
              CONOCIMIENTO AGRÍCOLA
            </Texto>
            <Ionicons name="book" size={18} color={colores.verde} />
          </View>
          <Texto variante="cuerpoFuerte" style={{ marginTop: espacio.xs }}>
            {totalConocimiento} {totalConocimiento === 1 ? 'registro' : 'registros'} en el dispositivo
          </Texto>

          <View style={{ gap: espacio.xs, marginTop: espacio.md }}>
            <Linea etiqueta="Verificados" valor={String(verificados)} color={colores.verde} />
            <Linea
              etiqueta="Demostración (sin verificar)"
              valor={String(resumen.conocimiento.synthetic ?? 0)}
              color={colores.aviso}
            />
          </View>

          {verificados === 0 ? (
            <View style={estilos.aviso}>
              <Ionicons name="warning" size={18} color={colores.aviso} />
              <Texto variante="pequeno" color={colores.textoSuave} style={{ flex: 1 }}>
                Todo el conocimiento actual es material de demostración, creado para probar la app.
                No está verificado agronómicamente: úsalo como orientación, nunca como diagnóstico.
              </Texto>
            </View>
          ) : null}
        </Card>

        {/* Aportes del usuario, separados del conocimiento oficial */}
        <Pressable accessibilityRole="button" onPress={() => router.push('/knowledge')}>
          <Card>
            <View style={estilos.filaEntre}>
              <Texto variante="etiqueta" color={colores.textoTenue}>
                TUS APORTES
              </Texto>
              <Ionicons name="chevron-forward" size={18} color={colores.textoTenue} />
            </View>
            <View style={{ gap: espacio.xs, marginTop: espacio.sm }}>
              <Linea etiqueta="Pendientes de revisión" valor={String(resumen.aportes.pending)} color={colores.aviso} />
              <Linea etiqueta="Validados" valor={String(resumen.aportes.validated)} color={colores.verde} />
            </View>
          </Card>
        </Pressable>

        {/* Almacenamiento */}
        <Card>
          <Texto variante="etiqueta" color={colores.textoTenue}>
            ALMACENAMIENTO DEL DISPOSITIVO
          </Texto>
          <View style={estilos.barra}>
            <View style={[estilos.barraRelleno, { width: `${Math.min(usadoPorcentaje * 100, 100)}%` }]} />
          </View>
          <View style={{ gap: espacio.xs, marginTop: espacio.md }}>
            <Linea etiqueta="Fotos de FitoIA" valor={formatearTamano(resumen.fotos)} />
            <Linea etiqueta="Espacio libre" valor={formatearTamano(resumen.discoLibre)} />
            <Linea etiqueta="Observaciones guardadas" valor={String(resumen.observaciones)} />
          </View>
        </Card>

        {/* Diagnóstico técnico del dispositivo */}
        <Card>
          <Texto variante="etiqueta" color={colores.textoTenue}>
            ESTE DISPOSITIVO
          </Texto>
          <View style={{ gap: espacio.xs, marginTop: espacio.sm }}>
            <Linea etiqueta="Modelo" valor={diagnostico.modelo} />
            <Linea etiqueta="Sistema" valor={diagnostico.sistema} />
            <Linea
              etiqueta="Memoria"
              valor={diagnostico.ramTotalMb ? formatearTamano(diagnostico.ramTotalMb) : 'desconocida'}
            />
            <Linea
              etiqueta="Arquitectura compatible"
              valor={diagnostico.arquitecturaSoportada ? 'Sí' : 'No'}
              color={diagnostico.arquitecturaSoportada ? colores.verde : colores.aviso}
            />
            <Linea
              etiqueta="Nivel máximo posible"
              valor={`Nivel ${diagnostico.nivelMaximo}`}
            />
          </View>
        </Card>

        <Texto variante="pequeno" color={colores.textoTenue} centrado>
          FitoIA {Constants.expoConfig?.version ?? '2.0.0'}
        </Texto>
      </ScrollView>
    </SafeAreaView>
  );
}

function Linea({ etiqueta, valor, color }: { etiqueta: string; valor: string; color?: string }) {
  return (
    <View style={estilos.filaEntre}>
      <Texto variante="pequeno" color={colores.textoSuave}>
        {etiqueta}
      </Texto>
      <Texto variante="pequeno" color={color ?? colores.texto}>
        {valor}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.lg, gap: espacio.md, paddingBottom: espacio.xxxl },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filaCentro: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
  aviso: {
    flexDirection: 'row',
    gap: espacio.sm,
    marginTop: espacio.md,
    padding: espacio.md,
    borderRadius: radio.md,
    backgroundColor: colores.fondoElevado,
    borderWidth: 1,
    borderColor: colores.aviso,
  },
  barra: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colores.superficieAlta,
    marginTop: espacio.md,
    overflow: 'hidden',
  },
  barraRelleno: { height: '100%', backgroundColor: colores.verde, borderRadius: 5 },
});
