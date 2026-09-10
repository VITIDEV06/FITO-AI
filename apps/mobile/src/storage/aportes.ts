import {
  ESTADO_APORTE_INICIAL,
  puedeTransicionar,
  type Aporte,
  type EstadoAporte,
  type NuevoAporte,
} from '@fitoai/core';
import { abrirBd, ahora, aJson, deJson, idNuevo } from './db';

interface FilaAporte {
  id: string;
  creado_en: string;
  actualizado_en: string;
  foto_uri: string | null;
  observacion: string;
  crop: string;
  symptoms_json: string;
  descripcion: string;
  informacion_adicional: string | null;
  source: string | null;
  source_url: string | null;
  region: string | null;
  estado: string;
  nota_revision: string | null;
  revisado_en: string | null;
}

function aModelo(f: FilaAporte): Aporte {
  return {
    id: f.id,
    creadoEn: f.creado_en,
    actualizadoEn: f.actualizado_en,
    fotoUri: f.foto_uri,
    observacion: f.observacion,
    crop: f.crop,
    symptoms: deJson<string[]>(f.symptoms_json, []),
    descripcion: f.descripcion,
    informacionAdicional: f.informacion_adicional,
    source: f.source,
    sourceUrl: f.source_url,
    region: f.region,
    estado: f.estado as EstadoAporte,
    notaRevision: f.nota_revision,
    revisadoEn: f.revisado_en,
  };
}

/**
 * Guarda un aporte. SIEMPRE nace 'pending'.
 *
 * Regla de producto: un aporte de usuario nunca se convierte en conocimiento
 * oficial de forma automática. El estado inicial no es configurable a
 * propósito: no hay parámetro que permita saltárselo.
 */
export async function guardarAporte(nuevo: NuevoAporte): Promise<Aporte> {
  const bd = await abrirBd();
  const registro: Aporte = {
    ...nuevo,
    id: idNuevo(),
    creadoEn: ahora(),
    actualizadoEn: ahora(),
    estado: ESTADO_APORTE_INICIAL,
    notaRevision: null,
    revisadoEn: null,
  };

  await bd.runAsync(
    `INSERT INTO contributions
       (id, creado_en, actualizado_en, foto_uri, observacion, crop, symptoms_json,
        descripcion, informacion_adicional, source, source_url, region, estado,
        nota_revision, revisado_en)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    registro.id, registro.creadoEn, registro.actualizadoEn, registro.fotoUri,
    registro.observacion, registro.crop, aJson(registro.symptoms), registro.descripcion,
    registro.informacionAdicional, registro.source, registro.sourceUrl, registro.region,
    registro.estado, null, null,
  );

  return registro;
}

export async function listarAportes(estado?: EstadoAporte): Promise<Aporte[]> {
  const bd = await abrirBd();
  const filas = estado
    ? await bd.getAllAsync<FilaAporte>(
        'SELECT * FROM contributions WHERE estado = ? ORDER BY creado_en DESC',
        estado,
      )
    : await bd.getAllAsync<FilaAporte>('SELECT * FROM contributions ORDER BY creado_en DESC');
  return filas.map(aModelo);
}

export async function obtenerAporte(id: string): Promise<Aporte | null> {
  const bd = await abrirBd();
  const fila = await bd.getFirstAsync<FilaAporte>('SELECT * FROM contributions WHERE id = ?', id);
  return fila ? aModelo(fila) : null;
}

/** Cambia el estado respetando las transiciones permitidas. */
export async function cambiarEstadoAporte(
  id: string,
  nuevoEstado: EstadoAporte,
  nota?: string,
): Promise<void> {
  const actual = await obtenerAporte(id);
  if (!actual) throw new Error('El aporte no existe.');

  if (!puedeTransicionar(actual.estado, nuevoEstado)) {
    throw new Error(`No se puede pasar de "${actual.estado}" a "${nuevoEstado}".`);
  }

  const bd = await abrirBd();
  await bd.runAsync(
    'UPDATE contributions SET estado = ?, nota_revision = ?, revisado_en = ?, actualizado_en = ? WHERE id = ?',
    nuevoEstado,
    nota ?? null,
    ahora(),
    ahora(),
    id,
  );
}

export async function contarAportesPorEstado(): Promise<Record<EstadoAporte, number>> {
  const bd = await abrirBd();
  const filas = await bd.getAllAsync<{ estado: string; n: number }>(
    'SELECT estado, COUNT(*) AS n FROM contributions GROUP BY estado',
  );
  const base: Record<EstadoAporte, number> = { pending: 0, validated: 0, rejected: 0, archived: 0 };
  for (const f of filas) base[f.estado as EstadoAporte] = f.n;
  return base;
}
