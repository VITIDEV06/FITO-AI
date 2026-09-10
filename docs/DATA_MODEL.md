# Modelo de datos de FITOAI

## Almacenamiento actual

FITOAI guarda observaciones en `data/observaciones.json` mediante un almacenamiento local en disco. No hay base de datos remota ni backend externo.

## Estructura de una observación

```json
{
  "id": "abc123",
  "fecha": "2026-09-10T14:28:46.479Z",
  "textoOriginal": "Las hojas de mis tomates están amarillas y algunas tienen manchas.",
  "cultivo": "Tomate",
  "observacion": "Las hojas de mis tomates están amarillas y algunas tienen manchas.",
  "analisis": {
    "cultivo": "Tomate",
    "sintomas": ["Hojas amarillentas", "Manchas foliares"],
    "posiblesCausas": ["Deficiencia de nutrientes", "Estrés hídrico"],
    "nivelCertidumbre": "medio",
    "proximosPasos": ["Revisa el pH del suelo", "Inspecciona la planta"],
    "informacionFaltante": ["Edad de la planta", "Condiciones de riego"],
    "descargoResponsabilidad": "FITOAI proporciona orientación basada en la información disponible y no sustituye la evaluación de un especialista agrícola."
  },
  "metadata": {
    "imagen": false,
    "tipo": "analisis"
  }
}
```

## Campos clave

- `id`: identificador único,
- `fecha`: fecha ISO,
- `textoOriginal`: observación del usuario,
- `cultivo`: cultivo principal,
- `observacion`: copia del texto original,
- `analisis`: contenido estructurado del análisis,
- `metadata`: datos útiles de contexto.

## Análisis generado

El análisis incluye:

- `cultivo`
- `sintomas`
- `posiblesCausas`
- `nivelCertidumbre`
- `proximosPasos`
- `informacionFaltante`
- `descargoResponsabilidad`

## Regla de negocio

La inferencia nunca debe interpretarse como diagnóstico definitivo. La respuesta debe combinar un análisis útil con mensajes de precaución.
