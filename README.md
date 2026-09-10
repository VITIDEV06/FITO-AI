# FitoIA

Asistente agrícola **móvil y offline-first** con IA local en el dispositivo.

Un agricultor toma una foto, describe lo que ve —escribiendo o hablando— y
obtiene una orientación estructurada. Todo el análisis ocurre en su teléfono.
Ni la foto, ni la voz, ni el texto salen del dispositivo.

## Qué es y qué no es

FitoIA **no diagnostica**. Apoya la observación de campo con lenguaje cauteloso
—"compatible con", "posible", "se requiere más información"— y nunca recomienda
productos químicos ni dosis. Ver [.opencode/rules/04-safety.md](.opencode/rules/04-safety.md).

## Estructura

```
apps/
└── mobile/              App React Native + Expo + Expo Router  ← el producto
packages/
├── core/                Lógica pura en TypeScript, sin dependencias
│                        parser · filtro de seguridad · conocimiento · MotorInferencia
└── qvac-desktop/        Prototipo de escritorio congelado (Node + HTTP + QVAC)
data/
├── knowledge/           Base agrícola en el esquema con procedencia
├── contributions/       Aportes de usuarios
├── examples/            Casos de ejemplo
└── schemas/
design/
├── branding/            Logos oficiales
└── wireframes/          Diseño de las pantallas
docs/
```

## Empezar

```bash
npm install
npm test
```

Aplicación móvil (necesita un dispositivo físico y un Development Build):

```bash
cd apps/mobile
npx expo prebuild --clean
npx expo run:android --device
```

Ver [apps/mobile/README.md](apps/mobile/README.md) para los niveles de servicio
y cómo activar QVAC.

## Niveles de servicio

La app degrada en vez de bloquear. Un teléfono que no puede con un LLM sigue
siendo útil.

| Nivel | Requiere | Descarga | Qué añade |
|---|---|---|---|
| 0 | cualquier Android | 0 MB | Análisis con la base de conocimiento local |
| 1 | arm64, Android 12+ | ~44 MB | Dictado por voz |
| 2 | + 4 GB RAM | +773 MB | Análisis con LLM local |
| 3 | + 6 GB RAM | +641 MB | Voz sintetizada y análisis de fotos |

## Motor de inferencia

Un solo contrato, `MotorInferencia`, con tres implementaciones:

- `MotorKB` — nivel 0, sin modelos, funciona en cualquier teléfono
- `MotorQvacMobile` — QVAC sobre Bare Kit en el dispositivo
- `qvac-desktop` — prototipo de escritorio, congelado

## Conocimiento agrícola

`data/conocimiento_agricola.json` se creó como **datos sintéticos** para probar
el prototipo. Se conserva como semilla de demostración y todo registro derivado
lleva `status: "synthetic"`. **No es conocimiento agronómico verificado.**

Solo un registro con `status: "verified"`, `source` y `reviewedAt` puede
presentarse como conocimiento oficial. Los aportes de usuarios nacen `pending` y
nunca se promueven de forma automática.

## Tests

```bash
npm test        # 130 tests sobre packages/core
npm run typecheck
```

Cubren el parser defensivo, el filtro de seguridad, el enriquecimiento por
knowledge base, la máquina de estados de los aportes y los niveles de servicio.
Dos propiedades son invariantes y están cubiertas explícitamente: **el parser
nunca lanza** ante entradas degeneradas, y **el descargo de responsabilidad
siempre está presente**.

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Modelo de datos](docs/DATA_MODEL.md)
- [QVAC](docs/QVAC.md)
- [MVP](docs/MVP.md)
- [Desarrollo](docs/DEVELOPMENT.md)
- [Testing](docs/TESTING.md)

## Licencia

MIT.
