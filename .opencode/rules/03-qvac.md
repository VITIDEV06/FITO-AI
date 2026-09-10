# Reglas de QVAC

QVAC es la capa obligatoria de inferencia de IA de FITOAI.

## Obligatorio

Toda inferencia que genere análisis del usuario debe pasar por QVAC.

## Prohibido

- llamadas cloud para inferencia,
- APIs externas de IA,
- inferencia simulada,
- mensajes tipo "AI local" que en realidad no usan QVAC.

## Requisito offline

La funcionalidad principal debe seguir operando sin conexión a Internet.

## Seguridad y confianza

La salida del modelo debe tratarse como ayuda, no como diagnóstico definitivo.

## Verificación

Cada cambio en la capa de inferencia debe comprobarse con el flujo real de la app y con la salida estructurada del modelo.
