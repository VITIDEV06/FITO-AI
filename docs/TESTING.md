# Testing de FITOAI

## Objetivo

Validar que la app sigue funcionando como MVP local y sin depender de servicios cloud.

## Comandos actuales

```bash
npm test
```

## Validación funcional crítica

1. arrancar la app,
2. abrir la URL local,
3. escribir una observación,
4. enviar el análisis,
5. confirmar respuesta estructurada,
6. comprobar que se guarda en historial,
7. verificar que el indicador de IA local está activo.

## Casos básicos a comprobar

- texto vacío -> error manejado,
- observación con cultivo conocido -> análisis correcto,
- historial con observaciones previas -> se listan,
- motor QVAC cargado -> responde sin Internet,
- almacenamiento local -> persiste entre ejecuciones.

## Criterio de éxito

Si se cumple el flujo con `npm test` y la app responde en `http://localhost:7860`, la aplicación cumple con el mínimo de verificación del MVP.
