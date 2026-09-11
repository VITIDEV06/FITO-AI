import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Analisis } from '@fitoai/core';
import { Card, Pildora, Texto } from './base';
import { colores, espacio, radio } from '../theme/tokens';
import { CERTIDUMBRE, ORIGEN } from '../services/formato';

/**
 * Presentación del análisis.
 *
 * Regla de producto no negociable (docs/SAFETY.md): nunca se
 * afirma un diagnóstico. Los encabezados dicen "compatible con" y "posible",
 * la certidumbre es visible siempre, y el descargo cierra la pantalla.
 * El contenido ya viene filtrado por packages/core; aquí sólo se enmarca.
 */
export function ResultadoAnalisis({ analisis }: { analisis: Analisis }) {
  const certidumbre = CERTIDUMBRE[analisis.nivelCertidumbre];
  const origen = ORIGEN[analisis.origen];

  return (
    <View style={{ gap: espacio.md }}>
      {/* Cultivo + marco de cautela */}
      <Card>
        <View style={estilos.filaEntre}>
          <Texto variante="etiqueta" color={colores.textoTenue}>
            CULTIVO
          </Texto>
          <Pildora texto={origen.etiqueta} color={origen.color} />
        </View>
        <Texto variante="titulo" style={{ marginTop: espacio.xs, textTransform: 'capitalize' }}>
          {analisis.cultivo}
        </Texto>
        <Texto variante="pequeno" color={colores.textoSuave} style={{ marginTop: espacio.xs }}>
          {origen.detalle}
        </Texto>
      </Card>

      {/* Certidumbre: siempre visible, nunca escondida */}
      <Card>
        <View style={estilos.filaEntre}>
          <Texto variante="etiqueta" color={colores.textoTenue}>
            NIVEL DE CONFIANZA
          </Texto>
          <Texto variante="cuerpoFuerte" color={certidumbre.color}>
            {certidumbre.etiqueta}
          </Texto>
        </View>
        <View style={estilos.barra}>
          <View
            style={[
              estilos.barraRelleno,
              { width: `${certidumbre.fraccion * 100}%`, backgroundColor: certidumbre.color },
            ]}
          />
        </View>
        <Texto variante="pequeno" color={colores.textoSuave} style={{ marginTop: espacio.sm }}>
          Refleja cuánta información hay, no una certeza sobre el problema.
        </Texto>
      </Card>

      <Seccion titulo="LO QUE SE OBSERVA" icono="eye" items={analisis.sintomas} />

      {/* Causas: el lenguaje cauteloso vive aquí */}
      <Card>
        <View style={estilos.tituloSeccion}>
          <Ionicons name="help-circle" size={18} color={colores.cian} />
          <Texto variante="etiqueta" color={colores.textoTenue}>
            POSIBLES CAUSAS
          </Texto>
        </View>
        <Texto variante="pequeno" color={colores.textoSuave} style={{ marginBottom: espacio.sm }}>
          Compatible con lo siguiente. No es un diagnóstico.
        </Texto>
        {analisis.posiblesCausas.map((causa, i) => (
          <View key={`${causa.descripcion}-${i}`} style={estilos.causa}>
            <View style={estilos.vinieta} />
            <View style={{ flex: 1 }}>
              <Texto variante="cuerpo">{causa.descripcion}</Texto>
              {typeof causa.confianza === 'number' ? (
                <Texto variante="pequeno" color={colores.textoTenue}>
                  Probabilidad estimada: {Math.round(causa.confianza * 100)}%
                </Texto>
              ) : null}
            </View>
          </View>
        ))}
      </Card>

      <Seccion
        titulo="QUÉ PUEDES HACER AHORA"
        icono="checkmark-circle"
        items={analisis.proximosPasos}
        numerada
      />

      <Seccion
        titulo="INFORMACIÓN QUE FALTA"
        icono="information-circle"
        items={analisis.informacionFaltante}
        color={colores.aviso}
      />

      {analisis.preguntasSeguimiento.length ? (
        <Seccion
          titulo="PARA AFINAR EL ANÁLISIS"
          icono="chatbubble-ellipses"
          items={analisis.preguntasSeguimiento}
          color={colores.cian}
        />
      ) : null}

      {/* BUG-6: la supresión del filtro es visible, no silenciosa */}
      {analisis.seguridad.contenidoSuprimido && analisis.seguridad.aviso ? (
        <Card style={{ borderColor: colores.aviso }}>
          <View style={estilos.tituloSeccion}>
            <Ionicons name="shield-checkmark" size={18} color={colores.aviso} />
            <Texto variante="etiqueta" color={colores.aviso}>
              CONTENIDO OMITIDO
            </Texto>
          </View>
          <Texto variante="pequeno" color={colores.textoSuave} style={{ marginTop: espacio.xs }}>
            {analisis.seguridad.aviso}
          </Texto>
        </Card>
      ) : null}

      {/* Descargo: siempre, al final, sin poder saltárselo */}
      <View style={estilos.descargo}>
        <Ionicons name="alert-circle-outline" size={18} color={colores.textoSuave} />
        <Texto variante="pequeno" color={colores.textoSuave} style={{ flex: 1 }}>
          {analisis.descargoResponsabilidad}
        </Texto>
      </View>
    </View>
  );
}

function Seccion({
  titulo,
  icono,
  items,
  numerada,
  color = colores.verde,
}: {
  titulo: string;
  icono: keyof typeof Ionicons.glyphMap;
  items: string[];
  numerada?: boolean;
  color?: string;
}) {
  if (!items.length) return null;

  return (
    <Card>
      <View style={estilos.tituloSeccion}>
        <Ionicons name={icono} size={18} color={color} />
        <Texto variante="etiqueta" color={colores.textoTenue}>
          {titulo}
        </Texto>
      </View>
      <View style={{ gap: espacio.sm, marginTop: espacio.sm }}>
        {items.map((item, i) => (
          <View key={`${item}-${i}`} style={estilos.item}>
            {numerada ? (
              <View style={[estilos.numero, { borderColor: color }]}>
                <Texto variante="pequeno" color={color}>
                  {i + 1}
                </Texto>
              </View>
            ) : (
              <View style={[estilos.vinieta, { backgroundColor: color }]} />
            )}
            <Texto variante="cuerpo" style={{ flex: 1 }}>
              {item}
            </Texto>
          </View>
        ))}
      </View>
    </Card>
  );
}

const estilos = StyleSheet.create({
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tituloSeccion: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio.md },
  causa: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio.md, marginBottom: espacio.sm },
  vinieta: { width: 7, height: 7, borderRadius: 4, backgroundColor: colores.cian, marginTop: 8 },
  numero: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barra: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colores.superficieAlta,
    marginTop: espacio.sm,
    overflow: 'hidden',
  },
  barraRelleno: { height: '100%', borderRadius: 4 },
  descargo: {
    flexDirection: 'row',
    gap: espacio.sm,
    padding: espacio.md,
    borderRadius: radio.md,
    backgroundColor: colores.fondoElevado,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
  },
});
