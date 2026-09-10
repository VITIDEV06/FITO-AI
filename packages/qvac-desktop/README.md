# @fitoai/qvac-desktop — prototipo congelado

Prototipo de escritorio (Node + HTTP + QVAC). **No es el producto.** La
aplicación real es `apps/mobile`.

Se conserva porque es la prueba funcional de que QVAC ejecuta inferencia
local, y como banco de pruebas del adaptador de escritorio.

## Qué NO migrar desde aquí

| Fichero | Motivo |
|---|---|
| `src/core/inference/asegurarWorker.js` | Hack para rutas de Windows con `# % ?`. Ejecuta `npm install` en runtime: rompe la promesa offline-first. En móvil lo resuelve `@qvac/sdk/expo-plugin`. |
| `src/ui/servidor.js` | Servidor HTTP. En móvil las llamadas son directas, sin red. |
| `src/ui/publico/*` | DOM y CSS. La app móvil es React Native, no un WebView. |
| `src/ui/publico/mockData.js` | Código muerto: nadie lo carga. Contiene análisis falsos y recomendaciones químicas que el filtro de seguridad prohíbe. |
| `src/features/observation/almacen.js` | Reescribe el JSON entero en cada guardado. En móvil se usa SQLite. |
| `src/core/models/modelos.js` | Huérfano: nadie lo importa. |
| `src/**/__init__.py` | Fósiles de una versión Python descartada. |

## Qué ya se migró a `packages/core`

La lógica pura, ahora en TypeScript y con seis defectos corregidos:
prompt de sistema, parser defensivo, filtro de seguridad, enriquecimiento
por base de conocimiento y el contrato `MotorInferencia`.

Ver `packages/core/src/` y sus tests.

## Defectos conocidos que NO se han corregido aquí

Este paquete está congelado; los arreglos viven en `packages/core`.

- `motorQvac.js:292` — el `finally` de `analizarImagen` hace `unlinkSync`
  sobre `archivoImagen`, que puede ser la ruta original del usuario. Borra
  la foto del usuario si se llama con la firma documentada. Latente: hoy el
  servidor siempre pasa base64.
- El enriquecimiento por knowledge base es código muerto (BUG-1).
- El filtro de seguridad no cubre `cultivo` ni el contenido de la KB.

## Ejecutar

```bash
npm install --workspace @fitoai/qvac-desktop
npm run desktop
```

Escucha en `http://127.0.0.1:3000` (el README antiguo decía 7860: era falso).
