import { abrirBd, ahora } from '../storage/db';
import { CATALOGO, type DefinicionModelo, type EstadoModelo } from './modelos';
import { cargarSdk, constante } from './qvacSdk';
import { diagnosticar } from './dispositivo';
import { espacioLibreMb } from '../services/almacenamiento';

/**
 * Gestor de modelos locales.
 *
 * QVAC ya resuelve lo difícil: `downloadAsset` escribe por trozos, reanuda
 * sola si se cae la red y verifica el checksum. Aquí sólo se añade lo que la
 * app necesita encima:
 *   - comprobar ANTES de descargar que el teléfono puede con el modelo
 *   - persistir el estado para poder verificarlo en cada arranque
 *   - progreso en MB, no sólo en porcentaje
 *
 * Sin @qvac/sdk instalado, todo queda en 'no_soportado' y la app sigue en
 * Nivel 0. No se rompe nada.
 */

export interface FilaModelo {
  id: string;
  estado: EstadoModelo;
  progreso: number;
  bytesDescargados: number;
  errorMensaje: string | null;
}

export interface EstadoDescarga extends FilaModelo {
  definicion: DefinicionModelo;
  /** Por qué no se puede descargar en este teléfono. */
  bloqueo: string | null;
}

export async function estadoDeModelos(): Promise<EstadoDescarga[]> {
  const bd = await abrirBd();
  const [diagnostico, libreMb] = await Promise.all([
    diagnosticar(await espacioLibreMb()),
    espacioLibreMb(),
  ]);

  const filas = await bd.getAllAsync<{
    id: string;
    estado: string;
    progreso: number;
    bytes_descargados: number;
    error_mensaje: string | null;
  }>('SELECT id, estado, progreso, bytes_descargados, error_mensaje FROM model_registry');

  const porId = new Map(filas.map((f) => [f.id, f]));

  return CATALOGO.map((definicion) => {
    const fila = porId.get(definicion.id);
    return {
      definicion,
      id: definicion.id,
      estado: (fila?.estado as EstadoModelo) ?? 'ausente',
      progreso: fila?.progreso ?? 0,
      bytesDescargados: fila?.bytes_descargados ?? 0,
      errorMensaje: fila?.error_mensaje ?? null,
      bloqueo: motivoBloqueo(definicion, diagnostico.ramTotalMb, libreMb, diagnostico.motivoNoSoportado),
    };
  });
}

function motivoBloqueo(
  definicion: DefinicionModelo,
  ramMb: number,
  libreMb: number,
  motivoDispositivo: string | null,
): string | null {
  if (motivoDispositivo) return motivoDispositivo;
  if (ramMb > 0 && ramMb < definicion.ramMinimaMb) {
    return `Necesita ${Math.round(definicion.ramMinimaMb / 1024)} GB de memoria y este teléfono tiene ${(ramMb / 1024).toFixed(1)} GB.`;
  }
  // Margen: el modelo se descomprime y necesita sitio para trabajar.
  if (libreMb > 0 && libreMb < definicion.tamanoMb * 1.5) {
    return `Hacen falta unos ${Math.round((definicion.tamanoMb * 1.5) / 1024 * 10) / 10} GB libres y quedan ${(libreMb / 1024).toFixed(1)} GB.`;
  }
  return null;
}

async function escribirEstado(
  id: string,
  cambios: Partial<{ estado: EstadoModelo; progreso: number; bytes: number; error: string | null; ruta: string | null }>,
): Promise<void> {
  const bd = await abrirBd();
  const definicion = CATALOGO.find((m) => m.id === id);
  if (!definicion) return;

  await bd.runAsync(
    `INSERT INTO model_registry
       (id, nombre, tipo, nivel, tamano_mb, ram_minima_mb, estado, progreso,
        bytes_descargados, ruta_local, error_mensaje, actualizado_en)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       estado            = COALESCE(excluded.estado, model_registry.estado),
       progreso          = excluded.progreso,
       bytes_descargados = excluded.bytes_descargados,
       ruta_local        = COALESCE(excluded.ruta_local, model_registry.ruta_local),
       error_mensaje     = excluded.error_mensaje,
       actualizado_en    = excluded.actualizado_en`,
    definicion.id,
    definicion.nombre,
    definicion.tipo,
    definicion.nivel,
    definicion.tamanoMb,
    definicion.ramMinimaMb,
    cambios.estado ?? 'ausente',
    cambios.progreso ?? 0,
    cambios.bytes ?? 0,
    cambios.ruta ?? null,
    cambios.error ?? null,
    ahora(),
  );
}

export interface ProgresoDescarga {
  porcentaje: number;
  mbDescargados: number;
  mbTotales: number;
}

/**
 * Descarga un modelo. Devuelve false si no es posible en este dispositivo.
 * Es idempotente: si ya está completo, QVAC retorna de inmediato.
 */
export async function descargarModelo(
  id: string,
  onProgreso?: (p: ProgresoDescarga) => void,
): Promise<boolean> {
  const definicion = CATALOGO.find((m) => m.id === id);
  if (!definicion) return false;

  const sdk = await cargarSdk();
  if (!sdk) {
    await escribirEstado(id, {
      estado: 'no_soportado',
      error: 'El motor de IA local no está incluido en esta compilación de la app.',
    });
    return false;
  }

  await escribirEstado(id, { estado: 'descargando', progreso: 0 });

  try {
    const ruta = await sdk.downloadAsset({
      assetSrc: constante(sdk, definicion.constanteQvac),
      onProgress: (p) => {
        const porcentaje = p.percentage ?? 0;
        const mbDescargados = Math.round((porcentaje / 100) * definicion.tamanoMb);
        onProgreso?.({ porcentaje, mbDescargados, mbTotales: definicion.tamanoMb });
        void escribirEstado(id, {
          estado: 'descargando',
          progreso: porcentaje,
          bytes: mbDescargados * 1024 * 1024,
        });
      },
    });

    // El proyector multimodal viaja aparte y también hace falta.
    if (definicion.constanteProyector) {
      await sdk.downloadAsset({ assetSrc: constante(sdk, definicion.constanteProyector) });
    }

    await escribirEstado(id, { estado: 'listo', progreso: 100, ruta: String(ruta), error: null });
    return true;
  } catch (error) {
    // Una descarga cortada deja trozos válidos: se marca 'parcial' para que la
    // UI ofrezca reanudar en vez de empezar de cero.
    await escribirEstado(id, {
      estado: 'parcial',
      error: error instanceof Error ? error.message : 'La descarga se interrumpió.',
    });
    return false;
  }
}

/**
 * Verifica en cada arranque que lo marcado como 'listo' sigue estándolo.
 * Android limpia cachés bajo presión de disco: un modelo puede desaparecer.
 */
export async function verificarModelos(): Promise<void> {
  const sdk = await cargarSdk();
  if (!sdk) return;

  const bd = await abrirBd();
  const listos = await bd.getAllAsync<{ id: string }>(
    "SELECT id FROM model_registry WHERE estado = 'listo'",
  );

  for (const { id } of listos) {
    const definicion = CATALOGO.find((m) => m.id === id);
    if (!definicion) continue;
    try {
      // downloadAsset es idempotente: si el fichero está completo, vuelve ya.
      await sdk.downloadAsset({ assetSrc: constante(sdk, definicion.constanteQvac) });
    } catch {
      await escribirEstado(id, { estado: 'ausente', progreso: 0, error: null });
    }
  }
}

export async function eliminarModelo(id: string): Promise<void> {
  const sdk = await cargarSdk();
  const definicion = CATALOGO.find((m) => m.id === id);
  if (sdk && definicion) {
    try {
      await sdk.deleteCache({ all: false, modelId: id });
    } catch {
      // Si el SDK no puede, al menos dejamos el registro coherente.
    }
  }
  await escribirEstado(id, { estado: 'ausente', progreso: 0, bytes: 0, ruta: null, error: null });
}
