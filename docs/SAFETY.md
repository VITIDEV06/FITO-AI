# Seguridad agrícola

FitoIA apoya la observación del cultivo y no reemplaza la evaluación
profesional. Esta regla es la que hace cumplir `packages/core/src/safety/filter.ts`
y la que sigue `packages/core/src/messages.ts` al redactar cualquier texto
genérico.

## Nunca

- presentar un resultado como diagnóstico definitivo,
- recomendar productos químicos, dosis o aplicaciones,
- inventar datos agronómicos o fuentes,
- describir un caso como cierto si la información es insuficiente.

## Cómo se aplica en código

`filter.ts` mantiene una lista de términos prohibidos (pesticidas, dosis,
fumigación, tóxicos, nombres de principios activos concretos, etc.) y filtra
con ella **tanto** la salida del modelo **como** el contenido que viene de la
base de conocimiento local — la KB no es de fiar por construcción porque
crece con aportes de usuarios. Cuando se suprime algo, queda registrado en
`ResumenSeguridad` y se muestra al agricultor en vez de ocultarse.

## Lenguaje recomendado

- «posible causa»
- «podría estar asociado con»
- «compatible con»
- «considerar verificar»
- «se requiere más información»
- «próximo paso recomendado»

## Información útil para mejorar un análisis

- tipo de cultivo,
- edad de la planta,
- duración de los síntomas,
- condiciones de riego,
- historial reciente,
- ambiente o clima,
- fotos.
