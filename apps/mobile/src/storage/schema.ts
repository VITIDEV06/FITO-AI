/**
 * Esquema SQLite de FitoIA.
 *
 * Todo vive en el teléfono. No hay servidor, no hay sincronización y no se
 * envía nada a ninguna parte. Las migraciones son incrementales para no
 * perder observaciones del agricultor al actualizar la app.
 */

export const VERSION_ESQUEMA = 1;

export const MIGRACIONES: Record<number, string> = {
  1: `
    CREATE TABLE IF NOT EXISTS observations (
      id             TEXT PRIMARY KEY NOT NULL,
      creado_en      TEXT NOT NULL,
      actualizado_en TEXT NOT NULL,
      descripcion    TEXT NOT NULL,
      cultivo        TEXT NOT NULL DEFAULT '',
      foto_uri       TEXT,
      transcripcion  TEXT,
      origen         TEXT NOT NULL DEFAULT 'texto',
      nivel_motor    INTEGER NOT NULL DEFAULT 0,
      notas          TEXT,
      -- El análisis se guarda serializado: es un documento, no se consulta por campos.
      analisis_json  TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_obs_fecha   ON observations (creado_en DESC);
    CREATE INDEX IF NOT EXISTS idx_obs_cultivo ON observations (cultivo);

    CREATE TABLE IF NOT EXISTS contributions (
      id                    TEXT PRIMARY KEY NOT NULL,
      creado_en             TEXT NOT NULL,
      actualizado_en        TEXT NOT NULL,
      foto_uri              TEXT,
      observacion           TEXT NOT NULL,
      crop                  TEXT NOT NULL,
      symptoms_json         TEXT NOT NULL DEFAULT '[]',
      descripcion           TEXT NOT NULL DEFAULT '',
      informacion_adicional TEXT,
      source                TEXT,
      source_url            TEXT,
      region                TEXT,
      -- Nace SIEMPRE 'pending'. Nunca se promueve solo.
      estado                TEXT NOT NULL DEFAULT 'pending'
                            CHECK (estado IN ('pending','validated','rejected','archived')),
      nota_revision         TEXT,
      revisado_en           TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_contrib_estado ON contributions (estado, creado_en DESC);

    CREATE TABLE IF NOT EXISTS knowledge (
      id                     TEXT PRIMARY KEY NOT NULL,
      crop                   TEXT NOT NULL,
      aliases_json           TEXT NOT NULL DEFAULT '[]',
      problem                TEXT NOT NULL DEFAULT '',
      symptoms_json          TEXT NOT NULL DEFAULT '[]',
      causes_json            TEXT NOT NULL DEFAULT '[]',
      favorable_json         TEXT NOT NULL DEFAULT '[]',
      severity               TEXT NOT NULL DEFAULT 'desconocida',
      management_json        TEXT NOT NULL DEFAULT '[]',
      prevention_json        TEXT NOT NULL DEFAULT '[]',
      follow_up_json         TEXT NOT NULL DEFAULT '[]',
      missing_info_json      TEXT NOT NULL DEFAULT '[]',
      source                 TEXT,
      source_url             TEXT,
      publication_date       TEXT,
      region                 TEXT,
      reviewed_at            TEXT,
      confidence             REAL NOT NULL DEFAULT 0.25,
      -- 'synthetic' = material de demostración. Solo 'verified' es oficial.
      status                 TEXT NOT NULL DEFAULT 'synthetic'
                             CHECK (status IN ('verified','unverified','synthetic','demo'))
    );
    CREATE INDEX IF NOT EXISTS idx_knowledge_crop   ON knowledge (crop);
    CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge (status);

    CREATE TABLE IF NOT EXISTS model_registry (
      id             TEXT PRIMARY KEY NOT NULL,
      nombre         TEXT NOT NULL,
      tipo           TEXT NOT NULL CHECK (tipo IN ('llm','asr','tts','vlm')),
      nivel          INTEGER NOT NULL DEFAULT 0,
      tamano_mb      INTEGER NOT NULL DEFAULT 0,
      ram_minima_mb  INTEGER NOT NULL DEFAULT 0,
      -- Máquina de estados del gestor de descargas.
      estado         TEXT NOT NULL DEFAULT 'ausente'
                     CHECK (estado IN ('ausente','no_soportado','verificando','descargando','parcial','listo','error')),
      progreso       REAL NOT NULL DEFAULT 0,
      bytes_descargados INTEGER NOT NULL DEFAULT 0,
      ruta_local     TEXT,
      error_mensaje  TEXT,
      actualizado_en TEXT NOT NULL
    );
  `,
};
