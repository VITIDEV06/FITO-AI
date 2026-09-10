import * as SQLite from 'expo-sqlite';
import { MIGRACIONES, VERSION_ESQUEMA } from './schema';

const NOMBRE_BD = 'fitoai.db';

let instancia: SQLite.SQLiteDatabase | null = null;

/**
 * Abre la base de datos y aplica migraciones pendientes.
 * Idempotente: se puede llamar desde cualquier pantalla.
 */
export async function abrirBd(): Promise<SQLite.SQLiteDatabase> {
  if (instancia) return instancia;

  const bd = await SQLite.openDatabaseAsync(NOMBRE_BD);
  await bd.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrar(bd);
  instancia = bd;
  return bd;
}

async function migrar(bd: SQLite.SQLiteDatabase): Promise<void> {
  const fila = await bd.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = fila?.user_version ?? 0;

  while (version < VERSION_ESQUEMA) {
    const siguiente = version + 1;
    const sql = MIGRACIONES[siguiente];
    if (!sql) break;

    await bd.withTransactionAsync(async () => {
      await bd.execAsync(sql);
    });
    // PRAGMA no admite parámetros enlazados.
    await bd.execAsync(`PRAGMA user_version = ${siguiente}`);
    version = siguiente;
  }
}

/** Solo para tests y para el botón de "borrar todos mis datos". */
export async function cerrarBd(): Promise<void> {
  await instancia?.closeAsync();
  instancia = null;
}

export function idNuevo(): string {
  // No usamos crypto.randomUUID: no está garantizado en todos los runtimes RN.
  const aleatorio = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${aleatorio}`;
}

export function ahora(): string {
  return new Date().toISOString();
}

export function aJson(valor: unknown): string {
  return JSON.stringify(valor ?? null);
}

export function deJson<T>(texto: string | null | undefined, porDefecto: T): T {
  if (!texto) return porDefecto;
  try {
    const valor = JSON.parse(texto) as T;
    return valor ?? porDefecto;
  } catch {
    return porDefecto;
  }
}
