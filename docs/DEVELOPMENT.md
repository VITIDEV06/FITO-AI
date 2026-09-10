# Guía de desarrollo de FITOAI

## Stack actual

- Node.js
- CommonJS
- HTTP nativo
- QVAC SDK
- archivos JSON locales para conocimiento y historial

## Estructura del proyecto

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
│       └── publico/
├── data/
├── docs/
├── tests/
├── README.md
├── package.json
├── requirements.txt
└── LICENSE
```

## Arranque

```bash
npm install
npm start
```

La app escucha en:

```text
http://localhost:7860
```

## Pruebas

```bash
npm test
```

## Lógica principal

- `src/main.js`: punto de entrada y arranque del motor QVAC.
- `src/ui/servidor.js`: backend local y API REST.
- `src/core/inference/motorQvac.js`: inferencia local.
- `src/core/knowledge/conocimientoAgricola.js`: conocimiento local del cultivo.
- `src/features/observation/almacen.js`: historial y persistencia.

## Reglas de desarrollo

- mantener la arquitectura simple,
- no introducir backend remoto,
- no comprar complejidad innecesaria,
- documentar cualquier cambio funcional que afecte al MVP,
- priorizar el funcionamiento local por encima de la estética.

## Observaciones importantes

- La aplicación no debe depender de Internet para la inferencia.
- Si cambia la estructura del modelo de salida, hay que actualizar tanto el parser como la documentación del modelo de datos.
- El worker de QVAC requiere tratamiento especial en rutas con caracteres especiales en Windows.
