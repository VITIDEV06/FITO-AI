# FitoIA — aplicación móvil

App nativa Android/iOS con Expo + React Native + TypeScript + Expo Router.
Todo el análisis ocurre en el teléfono. No hay servidor ni API en la nube.

## Arrancar

```bash
npm install
npx expo prebuild --clean
npx expo run:android --device
```

**No hay Expo Go.** La app usa módulos nativos (SQLite, cámara, audio y, cuando
se instale, QVAC), así que necesita un Development Build.

Sin QVAC instalado la app arranca y funciona en **Nivel 0**: analiza con la base
de conocimiento local. Eso incluye emuladores, donde QVAC nunca podrá cargar.

## Niveles de servicio

| Nivel | Requiere | Descarga | Qué añade |
|---|---|---|---|
| **0 — Conocimiento** | cualquier Android | 0 MB | Análisis desde la base agrícola local |
| **1 — Voz** | arm64, Android 12+, 2 GB RAM | ~44 MB | Dictado por voz |
| **2 — IA local** | + 4 GB RAM | +773 MB | Análisis con LLM en el dispositivo |
| **3 — Completo** | + 6 GB RAM | +641 MB | Respuestas habladas y análisis de fotos |

`src/inference/registro.ts` elige el nivel al arrancar y degrada solo. La app
nunca muestra un muro por tener el teléfono equivocado.

## QVAC (niveles 1-3)

QVAC ya está instalado y configurado en este repositorio: `@qvac/sdk`,
`react-native-bare-kit`, `bare-rpc` y `bare-pack` están en `dependencies`, el
plugin `@qvac/sdk/expo-plugin` está en `app.json`, y `qvac.config.json` declara
los tres addons activos (completion, transcripción, TTS). Un `npm install` +
`npx expo prebuild --clean` + `npx expo run:android --device` normal ya
compila con QVAC dentro.

`src/inference/qvacSdk.ts` carga el SDK **dinámicamente** de todas formas: si
por lo que sea no está disponible en el runtime, `cargarSdk()` devuelve `null`
y la app cae a Nivel 0 sin romperse. `npm run qvac:install` queda como
referencia para reinstalar los paquetes sueltos si alguna vez se quitan de
`package.json` para aligerar un `npm install` de solo-Nivel-0.

### Requisitos reales de QVAC en móvil

Verificado en [docs.qvac.tether.io/system-requirements](https://docs.qvac.tether.io/system-requirements/)
y en el contenido de los paquetes publicados:

- **Android 12+ (API 31)**, **arm64-v8a únicamente**. No existen prebuilds para
  x86, x86_64 ni arm de 32 bits en `@qvac/fabric`, `@qvac/llm-llamacpp`,
  `@qvac/asr-ggml` ni `@qvac/tts-ggml`.
- **iOS 17+**, arm64, Metal.
- **≥ 4 GB de RAM** y **≥ 5 GB de disco libre**.
- **Nunca en emulador.** Los emuladores Android son x86_64.

## Estructura

```
app/                      rutas (Expo Router)
├── _layout.tsx           arranque: SQLite, seed, permisos
├── onboarding.tsx        wireframe 09
├── (tabs)/
│   ├── index.tsx         Inicio          — wireframe 01
│   ├── observation/      Nueva observación — wireframes 02, 03, 04
│   ├── history/          Historial y detalle — wireframes 06, 07
│   └── settings/         Estado y modelos — wireframe 08
├── assistant/            Asistente de voz — wireframe 05
└── knowledge/            Aportar conocimiento
    ├── new.tsx           Nuevo aporte (nace `pending`)
    └── validar.tsx       Cola de validación local (`pending` → `validated`/`rejected`/`archived`)

src/
├── components/           UI reutilizable, tokens de design/branding
├── inference/            selección de motor, QVAC, gestor de modelos
├── services/             fotos, voz, formato, preferencias, borrador
├── storage/              SQLite: observaciones, aportes, conocimiento
└── theme/                colores y tipografía derivados de los logos
```

La lógica de análisis (parser, filtro de seguridad, enriquecimiento) **no** vive
aquí: está en `packages/core`, en TypeScript puro y con 130 tests.

## Base de datos

SQLite (`expo-sqlite`), migraciones incrementales en `src/storage/schema.ts`.
Tablas: `observations`, `contributions`, `knowledge`, `model_registry`.

Nada se sincroniza. Nada sale del teléfono.

## Conocimiento agrícola

`assets/seed/seed.synthetic.json` se siembra en el primer arranque. Todos sus
registros tienen `status: "synthetic"`: **son datos de demostración, no
conocimiento agronómico verificado**, y la pantalla de Estado lo dice
explícitamente. Solo un registro con `status: "verified"`, fuente y fecha de
revisión puede presentarse como conocimiento oficial.

## Pendiente

- **Icono de launcher en PNG.** Expo necesita PNG para `icon` y
  `adaptiveIcon.foregroundImage`; los logos de `design/branding/` son JPEG. La
  app los usa tal cual en la interfaz (React Native lee JPEG sin problema), pero
  para el icono del sistema hay que exportar `icon.png` (1024×1024) y
  `adaptive-icon.png` (foreground con transparencia) desde el original.
- Análisis multimodal de fotos (nivel 3): el adaptador está preparado pero
  `analisisImagen` sigue en `false` hasta integrar SmolVLM2.
