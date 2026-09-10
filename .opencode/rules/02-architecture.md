# Reglas de arquitectura

FITOAI usa una arquitectura simple y local-first.

## Flujo principal

Usuario
 ↓
Frontend web
 ↓
Backend local
 ↓
Conocimiento agrícola local
 ↓
Motor QVAC local
 ↓
Resultado estructurado
 ↓
Historial local

## Regla de separación

- frontend solo gestiona UI,
- backend solo servicios y HTTP,
- conocimiento agrícola es local y reutilizable,
- inferencia QVAC está aislada en el motor,
- persistencia está separada de la lógica del análisis.

## Regla de complejidad

No introducir capas ni servicios adicionales mientras el MVP siga siendo funcional y demostrable.

## Regla de datos

Los datos del usuario deben quedarse en el equipo del usuario. No se debe introducir una base de datos remota para esta fase.
