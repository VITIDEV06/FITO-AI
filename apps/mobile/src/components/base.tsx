import { forwardRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colores, espacio, gradienteMarca, radio, sombra, tactil, tipografia, LOGOS } from '../theme/tokens';

/* ------------------------------------------------------------------ Texto */

type Variante = keyof typeof tipografia;

interface TextoProps extends TextProps {
  variante?: Variante;
  color?: string;
  centrado?: boolean;
}

export function Texto({ variante = 'cuerpo', color, centrado, style, ...rest }: TextoProps) {
  return (
    <Text
      {...rest}
      style={[
        tipografia[variante] as object,
        { color: color ?? colores.texto },
        centrado && { textAlign: 'center' },
        style,
      ]}
    />
  );
}

/* ------------------------------------------------------------------ Card */

interface CardProps extends ViewProps {
  alta?: boolean;
  sinBorde?: boolean;
}

export function Card({ alta, sinBorde, style, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[
        estilos.card,
        alta && { backgroundColor: colores.superficieAlta },
        sinBorde && { borderWidth: 0 },
        style,
      ]}
    />
  );
}

/* --------------------------------------------------------------- Botones */

interface BotonProps extends Omit<PressableProps, 'style'> {
  titulo: string;
  subtitulo?: string;
  icono?: React.ReactNode;
  cargando?: boolean;
  tamano?: keyof typeof tactil;
  style?: ViewProps['style'];
}

/** Acción principal. Degradado de marca, alto contraste, muy pulsable. */
export const BotonPrincipal = forwardRef<View, BotonProps>(function BotonPrincipal(
  { titulo, subtitulo, icono, cargando, disabled, tamano = 'comodo', style, ...rest },
  ref,
) {
  const inactivo = disabled || cargando;
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: Boolean(inactivo), busy: Boolean(cargando) }}
      disabled={inactivo}
      style={({ pressed }) => [
        { borderRadius: radio.lg, overflow: 'hidden', opacity: inactivo ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
      {...rest}
    >
      <LinearGradient
        colors={[...gradienteMarca]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[estilos.botonBase, { minHeight: tactil[tamano] }]}
      >
        {cargando ? (
          <ActivityIndicator color={colores.fondo} />
        ) : (
          <>
            {icono}
            <View>
              <Texto variante="cuerpoFuerte" color={colores.fondo} centrado>
                {titulo}
              </Texto>
              {subtitulo ? (
                <Texto variante="pequeno" color="rgba(5,16,11,0.75)" centrado>
                  {subtitulo}
                </Texto>
              ) : null}
            </View>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
});

/** Acción secundaria. Contorno, sin relleno. */
export function BotonSecundario({
  titulo,
  subtitulo,
  icono,
  disabled,
  tamano = 'comodo',
  style,
  ...rest
}: BotonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      style={({ pressed }) => [
        estilos.botonBase,
        estilos.botonSecundario,
        { minHeight: tactil[tamano], opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
        style,
      ]}
      {...rest}
    >
      {icono}
      <View>
        <Texto variante="cuerpoFuerte" centrado>
          {titulo}
        </Texto>
        {subtitulo ? (
          <Texto variante="pequeno" color={colores.textoSuave} centrado>
            {subtitulo}
          </Texto>
        ) : null}
      </View>
    </Pressable>
  );
}

/* -------------------------------------------------------------- Etiquetas */

interface PildoraProps {
  texto: string;
  color?: string;
  icono?: React.ReactNode;
}

export function Pildora({ texto, color = colores.verde, icono }: PildoraProps) {
  return (
    <View style={[estilos.pildora, { borderColor: color }]}>
      {icono}
      <Texto variante="etiqueta" color={color}>
        {texto}
      </Texto>
    </View>
  );
}

/** Marca de la cabecera: logo real + wordmark. */
export function Marca({ compacta }: { compacta?: boolean }) {
  return (
    <View style={estilos.marca}>
      <Image
        source={LOGOS.icono}
        style={compacta ? estilos.logoPequeno : estilos.logo}
        accessibilityLabel="Logotipo de FitoIA"
        resizeMode="contain"
      />
      <Texto variante={compacta ? 'subtitulo' : 'titulo'}>FitoIA</Texto>
    </View>
  );
}

/* ------------------------------------------------------- Estados de la UI */

export function EstadoVacio({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion: string;
  accion?: React.ReactNode;
}) {
  return (
    <View style={estilos.centrado}>
      <Image source={LOGOS.icono} style={estilos.logoVacio} resizeMode="contain" />
      <Texto variante="subtitulo" centrado>
        {titulo}
      </Texto>
      <Texto variante="cuerpo" color={colores.textoSuave} centrado style={{ marginTop: espacio.sm }}>
        {descripcion}
      </Texto>
      {accion ? <View style={{ marginTop: espacio.xl, width: '100%' }}>{accion}</View> : null}
    </View>
  );
}

export function Cargando({ mensaje }: { mensaje: string }) {
  return (
    <View style={estilos.centrado} accessibilityRole="progressbar" accessibilityLabel={mensaje}>
      <ActivityIndicator size="large" color={colores.verde} />
      <Texto variante="cuerpo" color={colores.textoSuave} centrado style={{ marginTop: espacio.lg }}>
        {mensaje}
      </Texto>
    </View>
  );
}

/** Error amigable: dice qué pasó y qué hacer, sin jerga. */
export function ErrorAmigable({
  titulo,
  descripcion,
  onReintentar,
}: {
  titulo: string;
  descripcion: string;
  onReintentar?: () => void;
}) {
  return (
    <Card style={{ borderColor: colores.peligro }}>
      <Texto variante="cuerpoFuerte" color={colores.peligro}>
        {titulo}
      </Texto>
      <Texto variante="pequeno" color={colores.textoSuave} style={{ marginTop: espacio.xs }}>
        {descripcion}
      </Texto>
      {onReintentar ? (
        <BotonSecundario titulo="Reintentar" onPress={onReintentar} style={{ marginTop: espacio.md }} />
      ) : null}
    </Card>
  );
}

const estilos = StyleSheet.create({
  card: {
    backgroundColor: colores.superficie,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    padding: espacio.lg,
    ...sombra.card,
  },
  botonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.sm,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
    borderRadius: radio.lg,
  },
  botonSecundario: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  pildora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    borderWidth: 1,
    borderRadius: radio.pill,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.xs,
    alignSelf: 'flex-start',
  },
  marca: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  logo: { width: 40, height: 40, borderRadius: radio.sm },
  logoPequeno: { width: 30, height: 30, borderRadius: radio.sm },
  logoVacio: { width: 96, height: 96, borderRadius: radio.lg, marginBottom: espacio.lg, opacity: 0.7 },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacio.xl,
  },
});
