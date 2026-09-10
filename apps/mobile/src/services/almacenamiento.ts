import { Directory, File, Paths } from 'expo-file-system';

/**
 * Ficheros locales. API de expo-file-system 19 (SDK 54): `File`, `Directory`
 * y `Paths` en lugar de las funciones sueltas de versiones anteriores.
 */

/** Carpeta privada de la app donde viven las fotos de las observaciones. */
export function dirFotos(): Directory {
  return new Directory(Paths.document, 'fotos');
}

export function prepararDirectorios(): void {
  const dir = dirFotos();
  if (!dir.exists) dir.create({ intermediates: true });
}

/**
 * Copia una foto al almacenamiento privado de la app.
 *
 * Las URIs que devuelven la cámara y el selector son temporales: el sistema
 * las borra. Si guardáramos esa URI en SQLite, el historial acabaría lleno de
 * fotos rotas semanas después.
 */
export function guardarFoto(uriOrigen: string): string {
  prepararDirectorios();

  const origen = new File(uriOrigen);
  const extension = origen.extension || '.jpg';
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;
  const destino = new File(dirFotos(), nombre);

  origen.copy(destino);
  return destino.uri;
}

export function borrarFoto(uri: string | null): void {
  if (!uri) return;
  // Nunca tocar ficheros fuera de nuestra carpeta.
  if (!uri.startsWith(dirFotos().uri)) return;

  try {
    const archivo = new File(uri);
    if (archivo.exists) archivo.delete();
  } catch {
    // Si ya no está, no hay nada que hacer.
  }
}

export function espacioLibreMb(): number {
  try {
    return Math.round(Paths.availableDiskSpace / (1024 * 1024));
  } catch {
    return 0;
  }
}

export function espacioTotalMb(): number {
  try {
    return Math.round(Paths.totalDiskSpace / (1024 * 1024));
  } catch {
    return 0;
  }
}

/** Cuánto ocupan las fotos guardadas por FitoIA. */
export function espacioUsadoPorFotosMb(): number {
  try {
    const dir = dirFotos();
    if (!dir.exists) return 0;

    let total = 0;
    for (const entrada of dir.list()) {
      if (entrada instanceof File) total += entrada.size ?? 0;
    }
    return Math.round(total / (1024 * 1024));
  } catch {
    return 0;
  }
}
