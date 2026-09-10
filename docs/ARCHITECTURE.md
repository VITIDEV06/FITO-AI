# Arquitectura de FITOAI

## Visión general

FITOAI sigue una arquitectura local-first simple y directa. La lógica crítica se ejecuta en el dispositivo del usuario y no depende de servicios cloud para tomar decisiones de diagnóstico.

## Flujo principal

```text
Usuario
  ↓
Frontend web
  ↓
Backend local (Node.js + HTTP)
  ↓
Base de conocimiento agrícola local
  ↓
Motor QVAC local
  ↓
Análisis estructurado
  ↓
Almacenamiento local del historial
```

## Componentes actuales

### 1. Frontend

- interfaz HTML/CSS/JS,
- pantallas de inicio, análisis e historial,
- experiencia responsive para móvil,
- navegación basada en pantallas y modal de detalle.

### 2. Backend local

- servidor HTTP en `src/ui/servidor.js`,
- endpoints de estado, cultivos, análisis e historial,
- no usa framework externo,
- sirve la app estática y expone la API.

### 3. Base de conocimiento local

- archivo JSON en `data/conocimiento_agricola.json`,
- acceso centralizado en `src/core/knowledge/conocimientoAgricola.js`,
- sirve como contexto agronómico local para reforzar la inferencia.

### 4. Motor QVAC

- encapsulado en `src/core/inference/motorQvac.js`,
- carga el modelo localmente,
- parséa la respuesta de forma defensiva,
- combina la salida del modelo con contexto local cuando la respuesta es incompleta.

### 5. Persistencia local

- almacenamiento en JSON local en `data/observaciones.json`,
- gestión en `src/features/observation/almacen.js`,
- guarda observaciones, historial y detalle de análisis.

## Qué no forma parte de la arquitectura actual

- base de datos remota,
- autenticación,
- backend multinivel,
- microservicios,
- llamadas cloud para inferencia,
- capas de sincronización complejas.

## Principio de mantenimiento

La arquitectura debe mantenerse simple: MVP real, sin sobreingeniería. El objetivo es claridad y funcionalidad, no una estructura de gran escala.
