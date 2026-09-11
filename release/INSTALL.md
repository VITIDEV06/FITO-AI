# Instalar FitoIA

Este directorio contiene la compilación **release** de FitoIA lista para
instalar en un teléfono Android, sin necesidad de ordenador, Metro ni Expo Go.

- `FITO-AI.apk` — el instalable.
- `SHA256SUMS.txt` — huella de integridad del APK. Compárala tras descargarlo:
  si no coincide, no lo instales.

## 1. Descargar el APK

Copia `FITO-AI.apk` al teléfono (cable USB, enlace de descarga, o lo que use
la organización del evento).

## 2. Instalar

1. Abre el fichero `FITO-AI.apk` desde el gestor de archivos del teléfono.
2. Android pedirá permiso para **instalar aplicaciones de orígenes
   desconocidos** la primera vez — actívalo solo para la app que estás usando
   para instalar (el gestor de archivos o el navegador), y solo para esta
   instalación.
3. Confirma la instalación.

## 3. Requisitos del teléfono

- **Android 10 (API 29) o superior** para que la app arranque en absoluto
  (Nivel 0 — base de conocimiento local, sin modelos de IA).
- Para IA local (voz, análisis con LLM): **Android 12+ (API 31), arm64-v8a**,
  teléfono físico (no funciona en emuladores) y la RAM que pida cada nivel —
  ver la tabla de niveles en el [README](../README.md#niveles-adaptativos).

## 4. Abrir FitoIA y probar el flujo principal

1. Abre la app. La primera vez siembra la base de conocimiento local en
   SQLite — tarda un instante.
2. Ve a **Nueva observación**, toma o elige una foto, describe lo que ves
   (escribiendo o con el micrófono) y pulsa **Analizar con FitoIA**.
3. El resultado indica de dónde salió la respuesta (modelo, conocimiento
   local, o ambos) y siempre incluye el descargo de responsabilidad.
4. En **Historial** puedes volver a abrir cualquier observación guardada.
5. En **Estado** (pestaña Ajustes) se ve qué nivel de IA está activo en tu
   teléfono y por qué, con honestidad: si algo no está disponible, dice
   exactamente qué falta (RAM, modelo sin descargar, etc.), nunca lo oculta.

## 5. Si un modelo QVAC no está disponible

Es el comportamiento esperado en muchos teléfonos, no un error: FitoIA separa
**Nivel 0** (base de conocimiento, siempre activo, sin descargas) de los
niveles con IA local (voz, LLM, voz de respuesta), que requieren un teléfono
físico compatible y, la primera vez, descargar el modelo correspondiente
desde **Estado › Administrar modelos**.

- Si tu teléfono no cumple los requisitos de un nivel, la pantalla de Estado
  lo explica (por ejemplo: «Este teléfono tiene 3.7 GB de memoria. La IA
  local necesita 4 GB») y la app sigue funcionando con lo que sí está
  disponible.
- Si la descarga de un modelo falla (redes que filtran tráfico P2P/UDP), la
  app no se cierra: la función concreta queda en «no disponible» y el resto
  sigue funcionando.
- En ningún caso la ausencia de un modelo bloquea el resto de la app.

## Verificar la huella del APK (opcional)

En Windows (PowerShell):

```powershell
Get-FileHash .\FITO-AI.apk -Algorithm SHA256
```

En Linux/macOS:

```bash
sha256sum FITO-AI.apk
```

Compara el resultado con el valor de `SHA256SUMS.txt`.
