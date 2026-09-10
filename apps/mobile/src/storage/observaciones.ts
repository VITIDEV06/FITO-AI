import type { Analisis, NuevaObservacion, Observacion } from '@fitoai/core';
import { abrirBd, ahora, aJson, deJson, idNuevo } from './db';

interface FilaObservacion {
  id: string;
  creado_en: string;
  actualizado_en: string;
  descripcion: string;
  cultivo: string;
  foto_uri: string | null;
  transcripcion: string | null;
  origen: string;
  nivel_motor: number;
  notas: string | null;
  analisis_json: string | null;
}

function aModelo(fila: FilaObservacion): Observacion {
  return {
    id: fila.id,
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
    descripcion: fila.descripcion,
    cultivo: fila.cultivo,
    fotoUri: fila.foto_uri,
    transcripcion: fila.transcripcion,
    origen: fila.origen as Observacion['origen'],
    nivelMotor: fila.nivel_motor,
    notas: fila.notas,
    analisis: deJson<Analisis | null>(fila.analisis_json, null),
  };
}

export async function guardarObservacion(nueva: NuevaObservacion): Promise<Observacion> {
  const bd = await abrirBd();
  const registro: Observacion = { ...nueva, id: idNuevo(), creadoEn: ahora(), actualizadoEn: ahora() };

  await bd.runAsync(
    `INSERT INTO observations
       (id, creado_en, actualizado_en, descripcion, cultivo, foto_uri,
        transcripcion, origen, nivel_motor, notas, analisis_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    registro.id,
    registro.creadoEn,
    registro.actualizadoEn,
    registro.descripcion,
    registro.cultivo,
    registro.fotoUri,
    registro.transcripcion,
    registro.origen,
    registro.nivelMotor,
    registro.notas,
    registro.analisis ? aJson(registro.analisis) : null,
  );

  return registro;
}

export async function listarObservaciones(opciones: {
  busqueda?: string;
  cultivo?: string | null;
  limite?: number;
} = {}): Promise<Observacion[]> {
  const bd = await abrirBd();
  const condiciones: string[] = [];
  const parametros: (string | number)[] = [];

  if (opciones.busqueda?.trim()) {
    condiciones.push('(descripcion LIKE ? OR cultivo LIKE ?)');
    const patron = `%${opciones.busqueda.trim()}%`;
    parametros.push(patron, patron);
  }
  if (opciones.cultivo) {
    condiciones.push('cultivo = ?');
    parametros.push(opciones.cultivo);
  }

  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  parametros.push(opciones.limite ?? 200);

  const filas = await bd.getAllAsync<FilaObservacion>(
    `SELECT * FROM observations ${donde} ORDER BY creado_en DESC LIMIT ?`,
    ...parametros,
  );
  return filas.map(aModelo);
}

export async function obtenerObservacion(id: string): Promise<Observacion | null> {
  const bd = await abrirBd();
  const fila = await bd.getFirstAsync<FilaObservacion>('SELECT * FROM observations WHERE id = ?', id);
  return fila ? aModelo(fila) : null;
}

export async function ultimaObservacion(): Promise<Observacion | null> {
  const bd = await abrirBd();
  const fila = await bd.getFirstAsync<FilaObservacion>(
    'SELECT * FROM observations ORDER BY creado_en DESC LIMIT 1',
  );
  return fila ? aModelo(fila) : null;
}

export async function actualizarAnalisis(id: string, analisis: Analisis, nivelMotor: number): Promise<void> {
  const bd = await abrirBd();
  await bd.runAsync(
    'UPDATE observations SET analisis_json = ?, nivel_motor = ?, actualizado_en = ? WHERE id = ?',
    aJson(analisis),
    nivelMotor,
    ahora(),
    id,
  );
}

export async function guardarNotas(id: string, notas: string): Promise<void> {
  const bd = await abrirBd();
  await bd.runAsync('UPDATE observations SET notas = ?, actualizado_en = ? WHERE id = ?', notas, ahora(), id);
}

export async function eliminarObservacion(id: string): Promise<void> {
  const bd = await abrirBd();
  await bd.runAsync('DELETE FROM observations WHERE id = ?', id);
}

export async function contarObservaciones(): Promise<number> {
  const bd = await abrirBd();
  const fila = await bd.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM observations');
  return fila?.n ?? 0;
}

/** Cultivos presentes en el historial, para los filtros de la pantalla. */
export async function cultivosDelHistorial(): Promise<string[]> {
  const bd = await abrirBd();
  const filas = await bd.getAllAsync<{ cultivo: string }>(
    "SELECT DISTINCT cultivo FROM observations WHERE cultivo <> '' ORDER BY cultivo",
  );
  return filas.map((f) => f.cultivo);
}
