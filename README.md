# FITO-AI

Asistente agrícola **offline-first** para Android. El agricultor fotografía o describe lo que ve en su cultivo y recibe orientación en el propio teléfono, sin enviar nada a ningún servidor.

FitoIA **nunca da un diagnóstico**. Habla en términos de *compatible con*, *posible*, *probable*, y siempre acompaña el resultado de un descargo de responsabilidad.

---

## Estado actual (verificado en hardware real)

Probado en un **vivo V2556 · Android 16 · arm64 · 3,70 GB de RAM**.

| Función | Estado |
|---|---|
| App Android nativa (Expo Router, New Architecture) | ✅ Funciona |
| Nivel 0 — análisis con base de conocimiento local | ✅ Funciona |
| SQLite (observaciones, aportes, conocimiento, modelos) | ✅ Funciona |
| Cámara y galería nativas | ✅ Funciona |
| Funcionamiento sin conexión | ✅ Verificado con WiFi y datos desactivados |
| Aportes de conocimiento (siempre `pending`) | ✅ Funciona |
| QVAC cargado en el dispositivo, Nivel 1 detectado | ✅ Funciona |
| Pantalla de voz completa con sus 8 estados y fallback | ✅ Funciona |
| Transcripción real con Whisper | ⛔ Bloqueada: el modelo no se puede descargar (ver *Limitaciones reales*) |
| TTS (respuestas habladas) | ⛔ Requiere Nivel 3; este teléfono no llega |
| Análisis con LLM | ⛔ Requiere Nivel 2 (4 GB); este teléfono no llega |
| Visión / SmolVLM2 | ⛔ No implementado (fuera de alcance) |

Nada de lo marcado ⛔ está simulado: la app lo desactiva y lo explica.

---

## Arquitectura

Monorepo con workspaces de npm:

```
packages/core/      Lógica pura en TypeScript, sin dependencias de runtime. 130 tests.
apps/mobile/        La app React Native / Expo. Es la aplicación real.
packages/qvac-desktop/  Prototipo de escritorio. NO se ejecuta dentro de React Native.
data/               Semilla de conocimiento agrícola (material de demostración).
docs/               Documentación de detalle.
```

`packages/core` contiene el «corazón útil» y es donde vive todo lo que se puede probar sin un teléfono:

- modelo de observación y análisis
- parser defensivo de la salida del modelo (nunca lanza)
- filtro de seguridad sobre términos peligrosos
- enriquecimiento con la base de conocimiento
- `MotorInferencia` y el sistema de niveles
- prompt de sistema y mensajes

### MotorInferencia

Una sola interfaz, varias implementaciones:

| Motor | Qué hace |
|---|---|
| `MotorKB` | Nivel 0. Coincidencia contra la base de conocimiento local. Siempre disponible. |
| `MotorQvacMobile` | Niveles 1–3. Usa QVAC en el dispositivo. |
| `MotorQvacDesktop` | Prototipo de escritorio, fuera de la app móvil. |

`src/inference/registro.ts` elige el mejor motor disponible y **garantiza que siempre hay uno**: si QVAC no está, si el dispositivo no cumple requisitos o si un modelo falla al cargar, se usa `MotorKB`. `analizar()` además envuelve la llamada en try/catch y reintenta con `MotorKB`. El agricultor siempre obtiene una respuesta.

---

## Offline-first

- Todo el análisis ocurre en el teléfono.
- La base de conocimiento vive en SQLite, en el dispositivo.
- Las fotos se guardan en el almacenamiento privado de la app.
- **El único tráfico de red del proyecto es la descarga de modelos de QVAC.** Ni audio, ni texto, ni fotos salen nunca del teléfono.
- Una vez descargado un modelo, esa función funciona sin conexión para siempre.

---

## Niveles adaptativos

El nivel se calcula en arranque a partir de la RAM, la arquitectura, la versión de Android y el disco libre (`src/inference/dispositivo.ts` + `packages/core/src/inference/levels.ts`).

| Nivel | Nombre | RAM mínima | Qué habilita |
|---|---|---|---|
| 0 | Base de conocimiento | — | **Siempre disponible.** No se puede desactivar. |
| 1 | Dictado por voz | 2 GB | Whisper (STT) |
| 2 | Análisis con IA | 4 GB | LLM local |
| 3 | Completo | 6 GB | + TTS |

Reglas que se cumplen en el código:

- **Nivel 0 nunca se apaga.**
- Ningún modelo se carga al arrancar. `inicializar()` no carga nada.
- Cada modelo se carga perezosamente, solo cuando la función que lo necesita se usa de verdad, y solo si el nivel del dispositivo lo permite.
- **Nunca dos modelos pesados a la vez**: cargar el LLM libera antes los modelos de voz.
- Al salir de la pantalla de voz se llama a `liberarVoz()` y Whisper/TTS salen de memoria.
- Si el dispositivo no puede con un modelo, la función se desactiva y se explica por qué. No se fuerza la carga.

En el V2556 (3,70 GB) el nivel máximo es **1**: la app dice literalmente «Este teléfono tiene 3.7 GB de memoria. La IA local necesita 4 GB» para los niveles 2 y 3, y deja el 1 habilitado.

---

## QVAC

QVAC es la capa de inferencia local. Ver `.opencode/rules/03-qvac.md` y `docs/QVAC.md`.

- Soporte oficial de Expo/React Native: `@qvac/sdk` declara `react-native-bare-kit`, `expo-file-system`, `expo-device` y `expo-build-properties` como peerDependencies y publica el config plugin `@qvac/sdk/expo-plugin`.
- Corre sobre el runtime **Bare** embebido (no Hermes) y se comunica por RPC.
- Requisitos: **Android 12+ (API 31), arm64 únicamente**, sin emuladores.
- Es **opcional y lazy**: no está en las dependencias por defecto de la app y se carga con `import()` dinámico. Si no está, `cargarSdk()` devuelve `null` y la app sigue en Nivel 0. `metro.config.js` lo resuelve a un stub cuando no está instalado.

Plugins activos en `apps/mobile/qvac.config.json`: completion (llama.cpp), transcripción (whisper.cpp) y TTS.

### Instalar QVAC

```bash
cd apps/mobile && npm run qvac:install
```

Después hay que volver a hacer `npx expo prebuild --platform android` y recompilar.

---

## Voz

Flujo real implementado en `src/hooks/useAsistenteVoz.ts` y `app/assistant/index.tsx`:

```
🎤 permiso → grabar (mantener pulsado) → Whisper/QVAC → texto
   → MotorInferencia → respuesta → TTS/QVAC → 🔊
```

Estados, todos visibles en pantalla:

`inactivo` · `preparando` · `escuchando` · `transcribiendo` · `respondiendo` · `reproduciendo` · `error` · `fallback`

`fallback` **no es un error**: significa que la voz no está disponible en este teléfono (sin QVAC, sin RAM, o modelo sin descargar). La pantalla ofrece entonces «Administrar modelos» y «Escribir en su lugar», y la app sigue siendo útil en Nivel 0.

**Descargar y usar están separados a propósito.** El motor nunca descarga: solo carga modelos que ya están en el teléfono. La descarga es una decisión explícita en *Estado › Administrar modelos*. El motivo está en *Limitaciones reales*.

### STT — Whisper

`WHISPER_SPANISH_TINY_Q8_0` (≈44 MB), Nivel 1, español, greedy, sin timestamps. Se le pasa la **ruta del fichero grabado**; el addon `bare-ffmpeg` del worker lo decodifica.

### TTS

`TTS_MULTILINGUAL_SUPERTONIC3_Q8_0` (≈100 MB), Nivel 3. El PCM de 16 bits que devuelve se envuelve en una cabecera WAV para poder reproducirlo. Si no hay TTS, el usuario **lee** la respuesta: degradación honesta, no botón muerto.

---

## Conocimiento agrícola

Separación estricta entre conocimiento verificado y no verificado:

- `data/conocimiento_agricola.json` está marcado como **`synthetic` / demostración / no verificado**. No es conocimiento oficial. `esConocimientoOficial()` solo devuelve `true` para `verified`.
- Los aportes del usuario se guardan **siempre** como `pending` y **nunca** se promueven automáticamente. Estados: `pending` → `validated` / `rejected` / `archived`.
- La pantalla de Estado muestra el recuento de verificados frente a demostración, con un aviso explícito.

---

## Privacidad

- Cero inferencia en la nube. Cero APIs externas de IA.
- Audio, texto y fotos no salen del dispositivo.
- Permisos con textos explícitos en `app.json` (cámara, galería, micrófono).
- Único acceso a red: descarga de modelos.

---

## Requisitos

**Para la app (Nivel 0):** Android 10 (API 29) o superior.

**Para QVAC (Niveles 1–3):** Android 12 (API 31) o superior, **arm64**, teléfono físico (no emulador), y la RAM que pida el nivel.

**Para desarrollar:** Node 22+, Android SDK con NDK `29.0.14206865`, JDK 17.

---

## Instalación y ejecución

```bash
npm install
```

Comando oficial de desarrollo, desde la raíz:

```bash
npm start
```

Arranca Metro. Con el teléfono conectado por USB y la app instalada:

```bash
adb reverse tcp:8081 tcp:8081
```

Otros comandos:

```bash
npm test        # 130 tests de packages/core
npm run typecheck
npm run android # compila e instala en el teléfono conectado
```

---

## Generar el APK

Desde `apps/mobile/android`:

```bash
./gradlew assembleRelease
```

El APK queda en:

```
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

Para una compilación de depuración (con Metro):

```bash
./gradlew assembleDebug
```

```
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

> El `buildType` de release está firmado con el **keystore de depuración** que genera la plantilla de Expo. Sirve para instalar y probar; para publicar hay que generar un keystore propio.

### Instalar el APK

```bash
adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

O copiarlo al teléfono y abrirlo, permitiendo la instalación de orígenes desconocidos.

---

## Limitaciones reales del dispositivo de prueba

Esto es lo que **no** funciona y por qué. No está disimulado en la app.

**1. Los modelos no se pueden descargar en la red de prueba.**
QVAC no distribuye modelos por HTTPS: el descriptor es `registry://s3/...` con un `blobCoreKey`, y los addons enlazados incluyen `udx-native`, `sodium-native` y `rocksdb-native`. Es **Hyperswarm P2P sobre UDP**. En la WiFi abierta de campus usada para las pruebas el swarm no llega a arrancar y el worker de Bare **aborta con SIGABRT**, matando el proceso:

```
F libc: Fatal signal 6 (SIGABRT) in tid (bare-worklet)
#02 libbare-kit.so (js_callback_s::on_call(...))
```

Reproducido varias veces, con **cero bytes escritos**: falla antes de empezar a descargar. No es capturable desde JavaScript.

Mitigación implementada: el motor **nunca** descarga. Así el fallo queda confinado a la pantalla donde el usuario pulsa «Descargar» conscientemente, en lugar de cerrar la app a mitad de «mantén pulsado para hablar». Verificado: mantener pulsado → `fallback` limpio y app viva.

Para desbloquearlo hace falta descargar el modelo desde una red que no filtre UDP/P2P.

**2. RAM insuficiente para Niveles 2 y 3.** 3,70 GB frente a los 4 GB que pide el LLM. La app lo dice y desactiva esas descargas.

**3. Sin transcripción verificada de extremo a extremo.** La cadena está conectada y comprobada hasta el punto de carga del modelo, pero sin el fichero de Whisper en disco no se ha podido ejecutar una transcripción real.

---

## Detalles de compilación que importan

- **`useLegacyPackaging: true`** (en `app.json`, vía `expo-build-properties`) es obligatorio. `libbare-kit.so` declara `NEEDED libnativehelper.so`; sin empaquetado legacy, SoLoader resuelve las dependencias a mano, no conoce las librerías públicas del sistema, `libappmodules.so` no carga y la app arranca **sin TurboModules** (`PlatformConstants could not be found`, pantalla negra).
- Varios paquetes de Expo declaran `peerDependencies` con comodín; npm los resuelve a la última versión publicada y rompen la ABI de `expo-modules-core`. Por eso el `package.json` de la raíz fija `overrides` para `expo-asset`, `expo-font`, `expo-build-properties`, `react`, `react-dom`, `babel-preset-expo` y `@babel/core`.
- La arquitectura de Android está fijada a `arm64-v8a` por el plugin de QVAC.

---

## Roadmap / pendiente

- [ ] Descargar Whisper desde una red sin filtrado P2P y verificar la transcripción real de extremo a extremo.
- [ ] Probar el LLM y el TTS en un teléfono de 6 GB o más.
- [ ] Visión y SmolVLM2 (**no implementado**, deliberadamente fuera de alcance).
- [ ] Flujo de revisión y promoción de aportes (`pending` → `validated`) por parte de un agrónomo.
- [ ] Sustituir la semilla `synthetic` por conocimiento agronómico verificado y con fuente.
- [ ] Keystore propio y build de producción firmado.
- [ ] iOS.

---

## Documentación

- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/DEVELOPMENT.md`
- `docs/QVAC.md`
- `docs/TESTING.md`
- `docs/MVP.md`
