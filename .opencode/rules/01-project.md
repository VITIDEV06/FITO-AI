# FITOAI - Reglas del Proyecto

## Objetivo

FITOAI es un asistente agrícola offline-first impulsado por IA.

La aplicación convierte observaciones en lenguaje natural de agricultores en observaciones agrícolas estructuradas y proporciona recomendaciones cautelosas.

## Principio fundamental

FITOAI debe funcionar sin conexión a Internet.

La inferencia de IA se ejecuta localmente mediante el SDK de QVAC.

Las APIs cloud NUNCA deben utilizarse para inferencia de IA.

Los servicios cloud solo pueden usarse para funcionalidades no relacionadas con inferencia, cuando se apruebe explícitamente.

## MVP

El MVP debe permitir al usuario:

1. Introducir una observación agrícola.
2. Procesar la observación localmente usando QVAC.
3. Extraer información estructurada.
4. Identificar posibles causas o preocupaciones.
5. Proporcionar recomendaciones cautelosas.
6. Guardar la observación localmente.
7. Mostrar el resultado de forma clara.

## Prioridades

1. Inferencia local con QVAC
2. Funcionalidad confiable
3. Arquitectura simple
4. UX clara
5. Pulido visual
6. Funcionalidades adicionales

No sacrificar la funcionalidad offline core por funcionalidades innecesarias.

## Filosofía de desarrollo

Preferir soluciones simples sobre abstracciones complejas.

No introducir una librería a menos que proporcione un valor claro.

No construir funcionalidades que no sean requeridas para el MVP.

No crear funcionalidad falsa ni simular comportamiento de IA en la implementación final.
