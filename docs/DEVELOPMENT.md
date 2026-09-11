# Guía de desarrollo de FitoIA

## Stack actual

- Monorepo con **npm workspaces** (`packages/*`, `apps/*`)
- `packages/core`: TypeScript puro, sin dependencias de runtime
- `apps/mobile`: React Native + Expo (Expo Router) + TypeScript
- `expo-sqlite` para persistencia local
- `@qvac/sdk` para inferencia local (opcional, ver `docs/QVAC.md`)
- `packages/qvac-desktop`: prototipo de escritorio, **congelado**, no se ejecuta
  dentro de React Native y no se migra

## Estructura del proyecto

```text
.
├── apps/
│   └── mobile/          la app real (Expo Router, TypeScript)
│       ├── app/         rutas
│       ├── src/         componentes, inferencia, storage, servicios
│       └── android/     generado por `expo prebuild`, no se versiona
├── packages/
│   ├── core/             lógica pura: parser, filtro de seguridad, KB, niveles
│   └── qvac-desktop/      prototipo de escritorio, congelado
├── data/                 semilla de conocimiento agrícola (demostración)
├── docs/                 esta documentación
├── scripts/               generar-seed.mjs
├── package.json           raíz del workspace
└── README.md
```

## Arranque

Desde la raíz del repositorio:

```bash
npm install
npm start            # expo start --dev-client, en apps/mobile
```

**No hay Expo Go.** La app usa módulos nativos (SQLite, cámara, audio y,
cuando se instala, QVAC), así que necesita un Development Build instalado en
el teléfono. Ver `apps/mobile/README.md` para el flujo completo con
`expo prebuild` + `expo run:android`.

## Pruebas

```bash
npm test          # 130 tests de packages/core (node --test sobre .ts)
npm run typecheck # tsc --noEmit sobre packages/core
```

Para el typecheck de la app móvil:

```bash
cd apps/mobile && npx tsc --noEmit
```

## Lógica principal

- `packages/core/src/inference/MotorInferencia.ts`: contrato único de
  inferencia, implementado por `MotorKB` (nivel 0) y `MotorQvacMobile`
  (niveles 1-3, en `apps/mobile`).
- `packages/core/src/knowledge/enrich.ts`: combina modelo → base de
  conocimiento → texto genérico, en ese orden.
- `packages/core/src/safety/filter.ts`: filtro de contenido inseguro,
  aplicado tanto a la salida del modelo como al contenido de la KB.
- `apps/mobile/src/inference/registro.ts`: elige el motor disponible y
  garantiza que siempre hay uno.
- `apps/mobile/src/storage/`: SQLite — observaciones, aportes, conocimiento,
  registro de modelos.

## Reglas de desarrollo

- mantener la arquitectura simple: UI → `MotorInferencia` → SQLite/modelos,
- no introducir backend remoto ni sincronización en la nube,
- no comprar complejidad innecesaria,
- documentar cualquier cambio funcional que afecte al modelo de datos
  (`docs/DATA_MODEL.md`) o a la arquitectura (`docs/ARCHITECTURE.md`),
- priorizar el funcionamiento offline por encima de la estética.

## Observaciones importantes

- La aplicación no debe depender de Internet para la inferencia. El único
  tráfico de red permitido es la descarga explícita de modelos de QVAC.
- Si cambia la estructura de `Analisis`, hay que actualizar el parser
  (`packages/core/src/parser/parseAnalysis.ts`) y `docs/DATA_MODEL.md`.
- El worker de QVAC (Bare) requiere `useLegacyPackaging: true` en Android —
  ver «Detalles de compilación que importan» en el README.
