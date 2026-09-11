# FITOAI MVP

## Objetivo

Demostrar que una observación agrícola puede analizarse localmente con QVAC, sin depender de APIs cloud ni de un backend remoto.

## Flujo del usuario

1. El usuario escribe, dicta o fotografía una observación del campo.
2. Puede indicar o no el cultivo.
3. `MotorInferencia` (en el propio teléfono, sin red) resuelve el mejor motor
   disponible: `MotorKB` sobre la base de conocimiento local, o `MotorQvacMobile`
   con QVAC si el dispositivo lo soporta.
4. El motor consulta el contexto agrícola local y ejecuta la inferencia.
5. FitoIA devuelve un análisis estructurado y cauteloso.
6. La observación se guarda en SQLite, en el historial local.

## Criterio de éxito del MVP

La aplicación debe permitir:

- analizar observaciones en lenguaje natural,
- identificar cultivo, síntomas y posibles preocupaciones,
- dar recomendaciones cautelosas,
- no depender de Internet,
- guardar el historial y revisarlo después.

## Alcance actual del MVP

### Funcionalidades obligatorias

- entrada de texto para observaciones,
- campo opcional de cultivo,
- respuesta del motor local QVAC,
- análisis estructurado,
- historial persistente,
- indicador de IA local,
- navegación básica por pantallas,
- tratamiento de incertidumbre y contexto local.

### Fuera de alcance del MVP

- usuarios, autenticación,
- base de datos remota,
- sincronización cloud,
- exportación de informes,
- integración con sensores o drones,
- acciones prescriptivas definitivas.

## Ejemplo de uso

Entrada:

"Las hojas de mis tomates están amarillas y algunas tienen manchas."

Salida esperada:

- cultivo identificado,
- síntomas relevantes,
- posibles causas y preocupaciones,
- nivel de certidumbre,
- próximos pasos recomendados,
- información faltante clave.

## Principio de seguridad

FITOAI no sustituye a un profesional agrónomo. La intención del sistema es apoyar la observación, no diagnosticar de forma definitiva.
