# Testing de FitoIA

```bash
npm test          # 130 tests sobre packages/core
npm run typecheck # tsc --strict
```

Los tests corren con el runner de Node sobre TypeScript directamente
(Node ≥ 22 ejecuta `.ts` sin transpilar). Cero dependencias de test.

## Qué se prueba

`packages/core/src/__tests__/`

| Fichero | Cubre |
|---|---|
| `parser.test.ts` | Extracción de JSON, entradas degeneradas, normalización de campos, certidumbre, causas con confianza |
| `safety.test.ts` | Filtro de términos peligrosos, cobertura del cultivo, filtrado del contenido de la KB, rastro de supresión, fuga de mensajes técnicos, presencia del descargo |
| `knowledge.test.ts` | Seed sintético, repositorio, enriquecimiento, trazabilidad del origen, certidumbre según procedencia, `MotorKB` |
| `contribuciones.test.ts` | Máquina de estados de los aportes, separación verificado/no verificado, niveles de servicio |

## Dos propiedades invariantes

Cubiertas explícitamente porque romperlas tiene consecuencias en el campo:

1. **El parser nunca lanza.** Se prueba con 15 entradas degeneradas: `null`,
   `undefined`, números, símbolos, JSON truncado, llaves sueltas.
2. **El descargo de responsabilidad siempre está presente**, sea cual sea la
   entrada.

## Defectos del prototipo, ahora cubiertos

Los seis defectos detectados en la auditoría tienen test de regresión:

| | Defecto | Dónde se prueba |
|---|---|---|
| BUG-1 | El enriquecimiento por knowledge base era código muerto | `knowledge.test.ts` |
| BUG-2 | El filtro de seguridad no cubría el campo `cultivo` | `safety.test.ts` |
| BUG-3 | El filtro no se aplicaba al contenido de la KB | `safety.test.ts` |
| BUG-4 | Regex codicioso rompía con dos objetos JSON | `parser.test.ts` |
| BUG-5 | Mensajes técnicos visibles para el agricultor | `safety.test.ts` |
| BUG-6 | El filtrado era silencioso | `safety.test.ts` |

## Verificación manual en dispositivo

La lógica está cubierta por tests; lo que hay que probar a mano es el
comportamiento nativo.

1. Instalar en un **dispositivo físico** con Android 12+ arm64.
2. Primer arranque: onboarding, siembra del conocimiento, permisos.
3. Nueva observación con foto de la cámara nativa → análisis → guardado.
4. Historial: buscar, filtrar por cultivo, abrir detalle, repetir análisis.
5. Aporte de conocimiento: comprobar que queda en `pending`.
6. Estado: nivel activo correcto y motivo de degradación si lo hay.
7. **Modo avión desde la instalación.** Todo lo anterior debe seguir
   funcionando. Es el criterio de aceptación de "offline real".
8. Con QVAC instalado: descargar el modelo de voz, dictar, comprobar que la
   transcripción y la respuesta ocurren sin conexión.

## Lo que todavía no tiene test

- Las pantallas (no hay tests de componentes de React Native).
- La capa SQLite: requiere un dispositivo o `expo-sqlite` en Node.
- El adaptador QVAC real: requiere el SDK instalado y un teléfono físico.
