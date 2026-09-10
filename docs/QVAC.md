# QVAC en FITOAI

## Propósito

QVAC es la capa de inferencia local de FITOAI. Tiene que ser la única vía de IA del producto durante esta fase MVP.

## Requisito funcional

La app debe poder:

- recibir una observación del usuario,
- sumar contexto local del cultivo,
- ejecutar la inferencia en el dispositivo,
- devolver un análisis estructurado,
- mantener la lógica operativa sin conexión a Internet.

## Implementación actual

El motor principal está en `src/core/inference/motorQvac.js`.

La app usa:

- `loadModel` para cargar el modelo,
- `completion` para generar la respuesta,
- `unloadModel` para limpiar al cerrar,
- `LLAMA_3_2_1B_INST_Q4_0` como modelo de referencia del SDK.

## Comportamiento defensivo

El motor no asume que la respuesta del modelo sea perfectamente válida. Hace:

- extracción defensiva del JSON,
- limpieza de listas,
- fallback a contexto local del cultivo,
- normalización de nombres de campos,
- respuesta cautelosa cuando el modelo no responde bien.

## Importante para el proyecto

No se aceptan inferencias cloud. FITOAI debe poder demostrar que el análisis se ejecuta localmente en el equipo del usuario.

## Ruta con caracteres especiales

En Windows, cuando el proyecto está en una ruta con símbolos no estándar, el worker de QVAC puede romperse; por eso se incluye una validación de instalación limpia para evitar errores del worker.

La lógica de corrección vive en `src/core/inference/asegurarWorker.js`.
