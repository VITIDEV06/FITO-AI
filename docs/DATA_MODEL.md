# Modelo de datos de FitoIA

Todo vive en SQLite, en el teléfono. Migraciones incrementales en
`apps/mobile/src/storage/schema.ts`. Los tipos canónicos están en
`packages/core/src/types/`.

## `observations`

Una observación de campo y su análisis.

```ts
{
  id, creadoEn, actualizadoEn,
  descripcion,                    // lo que dijo el agricultor, sin transformar
  cultivo,
  fotoUri,                        // fichero en el directorio privado de la app
  transcripcion,                  // solo si el origen fue voz
  origen: 'texto'|'voz'|'foto'|'foto+texto',
  nivelMotor,                     // qué nivel produjo el análisis
  notas,                          // seguimiento posterior del agricultor
  analisis: Analisis | null
}
```

## `Analisis`

Forma canónica, **una sola nomenclatura** (camelCase). El prototipo emitía
además una copia en snake_case; esa redundancia se eliminó.

```ts
{
  cultivo,
  sintomas: string[],
  posiblesCausas: { descripcion, confianza? }[],
  nivelCertidumbre: 'bajo'|'medio'|'alto',
  proximosPasos: string[],
  informacionFaltante: string[],
  preguntasSeguimiento: string[],
  descargoResponsabilidad,        // fuente única en core/messages.ts
  origen: 'modelo'|'conocimiento'|'mixto'|'fallback',
  seguridad: {
    contenidoSuprimido: boolean,
    suprimidosPorCampo: Record<string, number>,
    aviso?: string
  }
}
```

`origen` permite decirle al usuario de dónde sale la respuesta.
`seguridad` hace visible lo que el filtro eliminó, en vez de suprimirlo en
silencio.

## `knowledge`

Base agrícola con procedencia. **Solo `status: 'verified'` es conocimiento
oficial.**

```ts
{
  id, crop, aliases[], problem,
  symptoms[], causes[], favorableConditions[],
  severity: 'baja'|'media'|'alta'|'desconocida',
  management[], prevention[], followUpQuestions[], missingInfo[],
  source, sourceUrl, publicationDate, region, reviewedAt,
  confidence,                     // 0..1
  status: 'verified'|'unverified'|'synthetic'|'demo'
}
```

El seed embarcado (`assets/seed/seed.synthetic.json`) tiene todos sus registros
en `synthetic` con `confidence: 0.25` y sin fuente: es material de demostración
creado para el prototipo, **no conocimiento agronómico verificado**.

Un registro sintético no sube el nivel de certidumbre de un análisis. Solo uno
verificado lo hace.

## `contributions`

Aportes de usuarios. **Nacen `pending` y nunca se promueven solos.**

```ts
{
  id, creadoEn, actualizadoEn,
  fotoUri, observacion, crop, symptoms[],
  descripcion, informacionAdicional,
  source, sourceUrl, region,
  estado: 'pending'|'validated'|'rejected'|'archived',
  notaRevision, revisadoEn
}
```

Transiciones permitidas (`puedeTransicionar` en core):

```text
pending   → validated · rejected · archived
validated → archived · rejected
rejected  → pending · archived
archived  → pending
```

Nada salta directo a `validated` sin pasar por revisión, y ningún estado
transiciona a sí mismo.

La transición a `validated` ocurre solo desde el panel de validación
(`app/knowledge/validar.tsx`) y dispara `promoverConocimientoDesdeAporte()`,
que inserta un registro nuevo en `knowledge` con `status: 'unverified'` (nunca
`'verified'`: pasó revisión local, no contraste contra fuente agronómica
citable). Es lo único que saca un aporte de la lista personal `pending` y lo
pone a disposición de `mejorCoincidencia` para futuros análisis.

## `model_registry`

Estado del gestor de descargas.

```text
ausente · no_soportado · verificando · descargando · parcial · listo · error
```

`parcial` existe porque `downloadAsset` de QVAC conserva los trozos ya
descargados: la UI ofrece reanudar en vez de empezar de cero.

## Regla de negocio

Ningún análisis se presenta como diagnóstico. El descargo de responsabilidad
está siempre presente y hay un test que lo verifica ante cualquier entrada,
incluidas las degeneradas.
