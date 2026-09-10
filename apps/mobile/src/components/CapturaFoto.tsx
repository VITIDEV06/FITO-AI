import { useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { BotonPrincipal, BotonSecundario, Texto } from './base';
import { colores, espacio, radio, tactil } from '../theme/tokens';
import { guardarFoto } from '../services/almacenamiento';

interface Props {
  fotoUri: string | null;
  onFoto: (uri: string | null) => void;
}

/**
 * Captura de foto con la cámara NATIVA del teléfono (expo-camera), más
 * selección desde la galería (expo-image-picker).
 *
 * Nada de `<input type="file">`: esto es una app nativa. La foto se copia al
 * almacenamiento privado de la app para que la URI siga siendo válida cuando
 * el usuario abra el historial semanas después.
 */
export function CapturaFoto({ fotoUri, onFoto }: Props) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const camara = useRef<CameraView>(null);

  const abrirCamara = async () => {
    if (!permiso?.granted) {
      const resultado = await pedirPermiso();
      if (!resultado.granted) return;
    }
    setCamaraAbierta(true);
  };

  const disparar = async () => {
    if (ocupado) return;
    setOcupado(true);
    try {
      const foto: CameraCapturedPicture | undefined = await camara.current?.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
      });
      if (foto?.uri) onFoto(await guardarFoto(foto.uri));
      setCamaraAbierta(false);
    } finally {
      setOcupado(false);
    }
  };

  const desdeGaleria = async () => {
    const permisoGaleria = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permisoGaleria.granted) return;

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    const elegida = resultado.assets?.[0];
    if (!resultado.canceled && elegida) onFoto(await guardarFoto(elegida.uri));
  };

  return (
    <View style={{ gap: espacio.sm }}>
      <View style={estilos.marco}>
        {fotoUri ? (
          <>
            <Image source={{ uri: fotoUri }} style={estilos.previa} resizeMode="cover" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quitar foto"
              onPress={() => onFoto(null)}
              style={estilos.quitar}
            >
              <Ionicons name="close" size={20} color={colores.texto} />
            </Pressable>
          </>
        ) : (
          <View style={estilos.vacio}>
            <Ionicons name="camera-outline" size={44} color={colores.textoTenue} />
            <Texto variante="pequeno" color={colores.textoTenue} centrado style={{ marginTop: espacio.sm }}>
              Una foto ayuda mucho, pero no es obligatoria
            </Texto>
          </View>
        )}
      </View>

      <BotonSecundario
        titulo={fotoUri ? 'Tomar otra foto' : 'Tomar foto'}
        icono={<Ionicons name="camera" size={20} color={colores.verde} />}
        onPress={abrirCamara}
      />
      <BotonSecundario
        titulo="Elegir de galería"
        icono={<Ionicons name="images" size={20} color={colores.cian} />}
        onPress={desdeGaleria}
      />

      <Modal visible={camaraAbierta} animationType="slide" onRequestClose={() => setCamaraAbierta(false)}>
        <View style={estilos.camaraRaiz}>
          <CameraView ref={camara} style={{ flex: 1 }} facing="back" />
          <View style={estilos.controles}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              onPress={() => setCamaraAbierta(false)}
              style={estilos.controlLateral}
            >
              <Ionicons name="close" size={28} color={colores.texto} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tomar la foto"
              onPress={disparar}
              disabled={ocupado}
              style={({ pressed }) => [estilos.disparador, pressed && { transform: [{ scale: 0.94 }] }]}
            >
              <View style={estilos.disparadorInterior} />
            </Pressable>

            <View style={estilos.controlLateral} />
          </View>
        </View>
      </Modal>

      {permiso && !permiso.granted && !permiso.canAskAgain ? (
        <View style={estilos.avisoPermiso}>
          <Texto variante="pequeno" color={colores.aviso}>
            FitoIA no tiene permiso para la cámara. Puedes activarlo en los ajustes del
            teléfono, o describir lo que observas por escrito.
          </Texto>
        </View>
      ) : null}
    </View>
  );
}

/** Botón grande para el paso final del flujo. Reexportado por comodidad. */
export { BotonPrincipal };

const estilos = StyleSheet.create({
  marco: {
    height: 200,
    borderRadius: radio.lg,
    overflow: 'hidden',
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderStyle: 'dashed',
  },
  previa: { width: '100%', height: '100%' },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacio.lg },
  quitar: {
    position: 'absolute',
    top: espacio.sm,
    right: espacio.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colores.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camaraRaiz: { flex: 1, backgroundColor: '#000' },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacio.xl,
    paddingVertical: espacio.xl,
    backgroundColor: colores.fondo,
  },
  controlLateral: {
    width: tactil.comodo,
    height: tactil.comodo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disparador: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colores.verde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disparadorInterior: { width: 58, height: 58, borderRadius: 29, backgroundColor: colores.verde },
  avisoPermiso: {
    padding: espacio.md,
    borderRadius: radio.md,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.aviso,
  },
});
