# FITOAI

FITOAI es un asistente agrícola local y offline-first para registrar observaciones del campo y obtener análisis estructurados mediante inferencia ejecutada en el dispositivo con QVAC.

## Objetivo

Ayudar a agricultores y técnicos de campo a:

- registrar observaciones en lenguaje natural,
- identificar posibles síntomas y cultivos,
- revisar recomendaciones cautelosas,
- conservar el historial localmente sin depender de Internet.

## Qué funciona en la implementación actual

- frontend web con flujo de observación y historial,
- backend local HTTP sin framework externo,
- motor de inferencia local con QVAC,
- base de conocimiento agronómica local,
- almacenamiento persistente de observaciones en disco,
- validación local de estado y flujo real del MVP.

## Arquitectura actual

Frontend
→ Backend local
→ Base de conocimiento agrícola local
→ Inferencia local QVAC
→ Historial persistente

La aplicación no usa APIs cloud para inferencia. Todo el análisis se intenta realizar en el dispositivo.

## Inicio rápido

```bash
npm install
npm start
```

La app queda disponible en:

```text
http://localhost:7860
```

## Prueba rápida

```bash
npm test
```

## Documentación principal

- [MVP](docs/MVP.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [QVAC](docs/QVAC.md)
- [Modelo de datos](docs/DATA_MODEL.md)
- [Desarrollo](docs/DEVELOPMENT.md)
- [Testing](docs/TESTING.md)

## Repositorio actual

```text
.
├── src/
│   ├── main.js
│   ├── core/
│   │   ├── inference/
│   │   ├── knowledge/
│   │   └── models/
│   ├── features/
│   │   └── observation/
│   └── ui/
├── data/
├── docs/
├── tests/
├── package.json
├── requirements.txt
├── README.md
└── LICENSE
```

## Licencia

MIT.
