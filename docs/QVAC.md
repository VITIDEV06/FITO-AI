# QVAC en FitoIA

QVAC es la capa de inferencia local. **Ninguna inferencia sale del dispositivo.**

## QVAC sí funciona en React Native y Expo

Confirmado con evidencia primaria, no por suposición:

1. `@qvac/sdk@0.19.0` declara como `peerDependencies`: `react-native-bare-kit`,
   `expo-file-system`, `expo-device`, `expo-build-properties` y `bare-link`.
2. Publica el config plugin `@qvac/sdk/expo-plugin`.
3. Trae prebuilds nativos `android-arm64` e `ios-arm64` en todos los addons.
4. Hay tutorial oficial: [docs.qvac.tether.io/tutorials/expo](https://docs.qvac.tether.io/tutorials/expo/).

QVAC no corre sobre Hermes: corre sobre el runtime **Bare**, embebido en la app
mediante `react-native-bare-kit`, y se comunica por RPC. Es el mismo patrón de
worker que ya usaba el prototipo de escritorio, cambiando el host.

## Requisitos reales

Fuente: [docs.qvac.tether.io/system-requirements](https://docs.qvac.tether.io/system-requirements/)

| | Mínimo |
|---|---|
| Android | 12+ (API 31), **arm64-v8a únicamente**, Vulkan / OpenCL (Adreno 700+) |
| iOS | 17.0+, arm64, Metal |
| RAM | ≥ 4 GB totales, ≥ 2 GB disponibles al cargar |
| Disco | ≥ 5 GB libres |
| Emuladores | **No soportados.** Dispositivo físico obligatorio |

### Solo arm64 en Android

Verificado inspeccionando los paquetes publicados. `@qvac/fabric@0.13.0`,
`@qvac/llm-llamacpp@0.52.0`, `@qvac/asr-ggml@0.4.2` y `@qvac/tts-ggml@0.8.1`
traen exactamente estos targets:

```text
android-arm64   darwin-arm64   darwin-x64   ios-arm64
ios-arm64-simulator   ios-x64-simulator   linux-arm64   linux-x64   win32-x64
```

No existe `android-x86`, `android-x64` ni arm de 32 bits. El propio script
`bare:ensureprebuilds` de `@qvac/sdk` **copia** `android-arm64` sobre esos slots:
son marcadores para que el empaquetador no falle, no soporte real. Por eso los
emuladores (x86_64) no funcionan.

## Huella nativa en Android (slice arm64)

| Paquete | Total | del cual Vulkan |
|---|---|---|
| `@qvac/fabric` | 121,0 MB | 97,4 MB |
| `@qvac/llm-llamacpp` | 126,7 MB | 97,4 MB |
| `@qvac/asr-ggml` | 46,6 MB | 31,3 MB |
| `@qvac/tts-ggml` | 49,0 MB | 31,3 MB |

`libqvac-ggml-vulkan.so` es ~72 % de la huella del MVP. Merece medir si
`bare-pack` deduplica las dos copias y si se puede excluir cuando no se usa GPU.

## Modelos

| Modelo | Tamaño | Confirmado |
|---|---|---|
| `LLAMA_3_2_1B_INST_Q4_0` | 773 MB | sí (HuggingFace) |
| `WHISPER_SPANISH_TINY_Q8_0` | ~44 MB | estimado |
| `TTS_MULTILINGUAL_SUPERTONIC3_Q8_0` | ~100 MB | estimado |
| `SMOLVLM2_500M_MULTIMODAL_Q8_0` + mmproj | ~541 MB | parcial |

Mide los estimados con `progress.total` en la primera descarga real.

> **Aviso.** La documentación pública va por la v0.11.0 mientras el SDK fijado es
> 0.19.0. Las constantes de modelo cambian entre versiones 0.x. Si `loadModel`
> falla con "modelo desconocido", revisa el catálogo en
> `apps/mobile/src/inference/modelos.ts`.

## API usada

`loadModel` · `completion` · `transcribe` · `textToSpeech` · `unloadModel` ·
`downloadAsset` · `getSystemResources` · `deleteCache` · `cancel` ·
`suspend` / `resume`

`downloadAsset` ya resuelve lo difícil: escribe por trozos, reanuda tras un
corte de red y verifica el checksum.

## Integración en la app

`apps/mobile/src/inference/qvacSdk.ts` carga el SDK **dinámicamente**. El
paquete no está en `dependencies` porque pesa más de 1,5 GB y la app funciona
sin él en Nivel 0. Si no está instalado, `cargarSdk()` devuelve `null` y
`registro.ts` cae a `MotorKB`.

Instalación: ver [apps/mobile/README.md](../apps/mobile/README.md).

## Regla del proyecto

No se acepta inferencia en la nube. Después de descargar los modelos, la app
debe funcionar en modo avión. Ese es el criterio de aceptación de "offline real".

---

## Hallazgos al integrarlo de verdad (verificados en un vivo V2556, Android 16, arm64, 3,70 GB)

### 1. Los modelos viajan por P2P, no por HTTPS

El descriptor de un modelo es `registry://s3/...` con un `blobCoreKey`, y los
addons enlazados incluyen `udx-native`, `sodium-native` y `rocksdb-native`: la
distribución es **Hyperswarm sobre UDP**, no una descarga HTTP.

Consecuencia práctica: en redes que filtran UDP/DHT (WiFi de campus, redes
corporativas, portales cautivos) el swarm no arranca y el worker de Bare
**aborta el proceso**:

```text
F libc: Fatal signal 6 (SIGABRT) in tid (bare-worklet)
#02 libbare-kit.so (js_callback_s::on_call(...))
```

No es capturable desde JavaScript: mata la app entera.

**Mitigación adoptada:** `MotorQvacMobile` no descarga nunca. Solo carga modelos
que ya están en disco, consultando `modeloEstaListo()` contra `model_registry`.
Descargar es una acción explícita en *Administrar modelos*. Así un fallo de red
queda confinado a la pantalla donde el usuario lo pidió, en lugar de cerrar la
app a mitad de una interacción de voz.

### 2. `useLegacyPackaging` es obligatorio

`libbare-kit.so` declara `NEEDED libnativehelper.so` (una librería pública del
sistema). Sin empaquetado legacy los `.so` van comprimidos dentro del APK,
SoLoader resuelve las dependencias por su cuenta en vez de delegar en el linker
de Android, no encuentra `libnativehelper.so`, y `libappmodules.so` no carga.
Resultado: la app arranca **sin TurboModules** y muere con
`PlatformConstants could not be found` (pantalla negra).

```json
["expo-build-properties", { "android": { "useLegacyPackaging": true } }]
```

### 3. No cargar nada en `inicializar()`

Cargar el LLM al arrancar hacía fallar la inicialización completa en teléfonos
que sí podían con la voz, tumbando también el Nivel 1. Todo se carga perezoso y
se libera al salir (`liberarVoz()`), y cargar el LLM libera antes los modelos de
voz para no tener dos modelos pesados en memoria a la vez.

### 4. Audio a `transcribe`

Los ejemplos del propio SDK pasan la **ruta del fichero** como `audioChunk` y no
declaran `audio_format`; el addon `bare-ffmpeg` lo decodifica. Es lo que hace la
app con la grabación `.m4a` de `expo-audio`, quitándole el prefijo `file://`.
