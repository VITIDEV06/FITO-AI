import AsyncStorage from '@react-native-async-storage/async-storage';

const CLAVES = {
  onboardingVisto: 'fitoai.onboarding.visto',
  nombreUsuario: 'fitoai.usuario.nombre',
  descargaSoloWifi: 'fitoai.modelos.soloWifi',
} as const;

export async function onboardingVisto(): Promise<boolean> {
  return (await AsyncStorage.getItem(CLAVES.onboardingVisto)) === '1';
}

export async function marcarOnboardingVisto(): Promise<void> {
  await AsyncStorage.setItem(CLAVES.onboardingVisto, '1');
}

export async function nombreUsuario(): Promise<string | null> {
  return AsyncStorage.getItem(CLAVES.nombreUsuario);
}

export async function guardarNombreUsuario(nombre: string): Promise<void> {
  await AsyncStorage.setItem(CLAVES.nombreUsuario, nombre.trim());
}

/** Por defecto true: 773 MB en datos móviles rurales es inaceptable. */
export async function descargaSoloWifi(): Promise<boolean> {
  const valor = await AsyncStorage.getItem(CLAVES.descargaSoloWifi);
  return valor === null ? true : valor === '1';
}

export async function guardarDescargaSoloWifi(activo: boolean): Promise<void> {
  await AsyncStorage.setItem(CLAVES.descargaSoloWifi, activo ? '1' : '0');
}
