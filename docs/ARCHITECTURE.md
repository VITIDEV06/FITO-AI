# Arquitectura de FitoIA

## Principio

Aplicación móvil nativa, offline-first, con inferencia en el dispositivo.
No hay backend, no hay API en la nube y no hay sincronización.

## Flujo

```text
Agricultor
   ↓  foto (cámara nativa) · texto · voz
App React Native (Expo Router)
   ↓
packages/core  ·  prompt → parser → filtro de seguridad → enriquecimiento
   ↓
MotorInferencia
   ├── MotorKB          nivel 0   base de conocimiento local, sin modelos
   └── MotorQvacMobile  niveles 1-3   QVAC sobre Bare Kit, en el dispositivo
   ↓
Análisis estructurado y cauteloso
   ↓
SQLite local (observaciones · aportes · conocimiento · modelos)
```

## Capas

### `apps/mobile`

React Native + Expo + TypeScript + Expo Router. Solo interfaz, navegación y
acceso a las capacidades del teléfono (cámara, micrófono, disco). No contiene
lógica de análisis.

### `packages/core`

TypeScript puro, **cero dependencias de runtime**. Es el corazón del producto y
lo único cubierto por tests exhaustivos:

| Módulo | Responsabilidad |
|---|---|
| `parser/extractJson` | Extracción de JSON con balanceo de llaves |
| `parser/parseAnalysis` | Interpreta la salida del modelo. No rellena huecos |
| `safety/filter` | Filtro de contenido químico. Deja rastro de lo suprimido |
| `knowledge/enrich` | modelo → knowledge base → genérico, en ese orden |
| `knowledge/KnowledgeRepository` | Índice en memoria, búsqueda por nombre y síntoma |
| `prompt/systemPrompt` | Prompt de sistema y contexto agronómico |
| `inference/*` | Contrato `MotorInferencia`, niveles, `MotorKB` |

### `packages/qvac-desktop`

Prototipo de escritorio congelado. Prueba funcional de QVAC. No se migra.

## La tubería de análisis

El orden importa y fue la corrección más relevante de la migración:

```text
salida cruda del modelo
   ↓  extraer JSON (balanceo de llaves, no regex codicioso)
   ↓  filtrar contenido inseguro  → se registra qué se quitó
   ↓  completar huecos desde la knowledge base → también filtrada
   ↓  completar lo que siga vacío con texto genérico cauteloso
análisis
```

En el prototipo los huecos se rellenaban en el segundo paso, así que la
knowledge base nunca llegaba a actuar: era código muerto. Ahora cada campo toma
el primer nivel que tenga contenido real, y el resultado declara su `origen`
(`modelo`, `mixto`, `conocimiento` o `fallback`) para poder ser honesto en la UI.

## Degradación por niveles

`src/inference/registro.ts` detecta los recursos del dispositivo y elige motor.
Si QVAC no está instalado, si el teléfono no cumple requisitos o si el modelo
falla al cargar, se usa `MotorKB` y la app sigue siendo útil. La razón de la
degradación se muestra en la pantalla de Estado, nunca se oculta.

## Persistencia

SQLite con migraciones incrementales. Cuatro tablas: `observations`,
`contributions`, `knowledge`, `model_registry`. Las fotos se copian al
directorio privado de la app para que las URIs sigan siendo válidas meses
después.

## Lo que NO forma parte de la arquitectura

- backend, API en la nube o inferencia remota
- autenticación y cuentas de usuario
- sincronización entre dispositivos
- WebView o HTML como interfaz
- telemetría
