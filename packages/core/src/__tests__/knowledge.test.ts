import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { analizarSalidaModelo, MotorKB } from '../index.ts';
import { construirAnalisis } from '../knowledge/enrich.ts';
import { parsearRespuestaModelo } from '../parser/parseAnalysis.ts';
import { InMemoryKnowledgeRepository } from '../knowledge/KnowledgeRepository.ts';
import { MENSAJES } from '../messages.ts';
import { cargarSeed, repositorioSeed, repositorioLegacy, registro } from './helpers.ts';

describe('Seed sintético', () => {
  test('tiene 6 registros y está marcado como sintético', () => {
    const col = cargarSeed();
    assert.equal(col.registros.length, 6);
    assert.equal(col.defaultStatus, 'synthetic');
    for (const r of col.registros) {
      assert.equal(r.status, 'synthetic', `${r.crop} debería ser sintético`);
      assert.equal(r.source, null, 'un registro sintético no puede declarar fuente');
      assert.ok(r.confidence <= 0.3, 'la confianza sintética debe ser baja');
    }
  });

  test('ningún registro del seed contiene contenido inseguro', () => {
    for (const r of cargarSeed().registros) {
      const texto = JSON.stringify([r.symptoms, r.causes, r.management, r.prevention]);
      assert.ok(!/fungicida|pesticida|herbicida|dosis/i.test(texto), `${r.crop} contiene químicos`);
    }
  });

  test('la conversión desde el JSON legacy da el mismo resultado', () => {
    assert.deepEqual(
      repositorioLegacy().listarCultivos(),
      repositorioSeed().listarCultivos(),
    );
  });
});

describe('Repositorio de conocimiento', () => {
  const repo = repositorioSeed();

  test('busca por nombre exacto', () => {
    assert.equal(repo.buscarPorCultivo('tomate')[0]?.crop, 'tomate');
  });
  test('busca por alias', () => {
    assert.equal(repo.buscarPorCultivo('jitomate')[0]?.crop, 'tomate');
  });
  test('ignora acentos y mayúsculas', () => {
    assert.equal(repo.buscarPorCultivo('MAÍZ')[0]?.crop, 'maíz');
    assert.equal(repo.buscarPorCultivo('maiz')[0]?.crop, 'maíz');
  });
  test('detecta el cultivo en texto libre', () => {
    const r = repo.detectarCultivo('las hojas de mis tomates están amarillas');
    assert.equal(r[0]?.crop, 'tomate');
  });
  test('sin coincidencia -> vacío', () => {
    assert.deepEqual(repo.detectarCultivo('no sé qué planta es esto'), []);
  });
  test('lista los cultivos ordenados', () => {
    const cultivos = repo.listarCultivos();
    assert.equal(cultivos.length, 6);
    assert.deepEqual(cultivos, [...cultivos].sort((a, b) => a.localeCompare(b, 'es')));
  });

  test('con varios problemas del mismo cultivo, gana el que comparte más síntomas', () => {
    const multi = new InMemoryKnowledgeRepository([
      registro({ id: 'a', crop: 'cafe', problem: 'roya', symptoms: ['manchas amarillas en el envés'] }),
      registro({ id: 'b', crop: 'cafe', problem: 'broca', symptoms: ['perforaciones en el grano'] }),
    ]);
    const r = multi.mejorCoincidencia('mi cafe tiene manchas amarillas', null);
    assert.equal(r?.id, 'a');
  });
});

describe('BUG-1: el enriquecimiento por knowledge base SÍ actúa', () => {
  const repo = repositorioSeed();
  const lechuga = repo.buscarPorCultivo('lechuga')[0]!;
  const tomate = repo.buscarPorCultivo('tomate')[0]!;

  test('modelo sin síntomas -> usa los síntomas de la KB', () => {
    const a = analizarSalidaModelo('{"sintomas":[]}', lechuga);
    assert.deepEqual(a.sintomas, lechuga.symptoms);
    assert.ok(a.sintomas.includes('Hojas marchitas'));
  });

  test('modelo devuelve basura -> usa las causas de la KB', () => {
    const a = analizarSalidaModelo('no puedo responder', tomate);
    assert.deepEqual(a.posiblesCausas.map((c) => c.descripcion), tomate.causes);
  });

  test('el filtro borra todos los pasos -> cae a las recomendaciones seguras de la KB', () => {
    const a = analizarSalidaModelo('{"proximos_pasos":["Aplicar fungicida","Rociar pesticida"]}', tomate);
    assert.deepEqual(a.proximosPasos, [...tomate.management, ...tomate.prevention]);
    assert.equal(a.seguridad.contenidoSuprimido, true);
  });

  test('parcial totalmente vacío -> se puebla desde la KB', () => {
    const a = construirAnalisis(parsearRespuestaModelo('{}'), lechuga);
    assert.ok(a.sintomas.includes('Hojas marchitas'));
    assert.equal(a.origen, 'conocimiento');
  });

  test('el modelo tiene prioridad sobre la KB', () => {
    const a = analizarSalidaModelo('{"sintomas":["síntoma propio del modelo"]}', lechuga);
    assert.deepEqual(a.sintomas, ['síntoma propio del modelo']);
  });

  test('sin KB y sin modelo -> genéricos cautelosos, nunca vacío', () => {
    const a = analizarSalidaModelo('{}', null);
    assert.deepEqual(a.sintomas, MENSAJES.sintomasGenericos);
    assert.deepEqual(a.proximosPasos, MENSAJES.pasosGenericos);
    assert.equal(a.origen, 'fallback');
    for (const campo of [a.sintomas, a.posiblesCausas, a.proximosPasos, a.informacionFaltante, a.preguntasSeguimiento]) {
      assert.ok(campo.length > 0);
    }
  });
});

describe('Trazabilidad del origen', () => {
  const lechuga = repositorioSeed().buscarPorCultivo('lechuga')[0]!;

  test('solo modelo -> "modelo"', () => {
    const a = analizarSalidaModelo(
      '{"sintomas":["a"],"posibles_causas":["b"],"proximos_pasos":["c"],"informacion_faltante":["d"],"preguntas_seguimiento":["e"]}',
      null,
    );
    assert.equal(a.origen, 'modelo');
  });
  test('modelo + KB -> "mixto"', () => {
    const a = analizarSalidaModelo('{"sintomas":["algo raro"]}', lechuga);
    assert.equal(a.origen, 'mixto');
  });
  test('solo KB -> "conocimiento"', () => {
    assert.equal(analizarSalidaModelo('{}', lechuga).origen, 'conocimiento');
  });
  test('nada -> "fallback"', () => {
    assert.equal(analizarSalidaModelo('basura', null).origen, 'fallback');
  });
});

describe('Certidumbre y conocimiento no verificado', () => {
  test('un registro sintético NO sube la certidumbre', () => {
    const lechuga = repositorioSeed().buscarPorCultivo('lechuga')[0]!;
    assert.equal(analizarSalidaModelo('{}', lechuga).nivelCertidumbre, 'bajo');
  });

  test('un registro verificado sí la sube de bajo a medio', () => {
    const verificado = registro({ status: 'verified', symptoms: ['x'] });
    assert.equal(analizarSalidaModelo('{}', verificado).nivelCertidumbre, 'medio');
  });

  test('nunca baja lo que el modelo declaró', () => {
    const lechuga = repositorioSeed().buscarPorCultivo('lechuga')[0]!;
    assert.equal(analizarSalidaModelo('{"nivel_certidumbre":"alto"}', lechuga).nivelCertidumbre, 'alto');
  });
});

describe('MotorKB (nivel 0)', () => {
  const motor = new MotorKB(repositorioSeed());

  test('está disponible siempre y no necesita inicialización', async () => {
    assert.equal(await motor.estaDisponible(), true);
    await motor.inicializar();
    assert.equal(motor.nivel, 0);
  });

  test('declara sus capacidades con honestidad', () => {
    assert.deepEqual(motor.capacidades(), {
      analisisTexto: true, analisisImagen: false, transcripcion: false, sintesisVoz: false,
    });
  });

  test('produce un análisis real desde la KB, sin ningún modelo', async () => {
    const a = await motor.analizar({ descripcion: 'mis tomates tienen manchas en las hojas' });
    assert.equal(a.cultivo, 'tomate');
    assert.equal(a.origen, 'conocimiento');
    assert.ok(a.sintomas.length > 0);
    assert.ok(a.proximosPasos.length > 0);
    assert.ok(a.descargoResponsabilidad.length > 40);
  });

  test('respeta el cultivo indicado explícitamente', async () => {
    const a = await motor.analizar({ descripcion: 'hojas raras', cultivo: 'pepino' });
    assert.equal(a.cultivo, 'pepino');
  });

  test('sin coincidencia devuelve algo útil y cauteloso', async () => {
    const a = await motor.analizar({ descripcion: 'no sé qué le pasa a esta planta' });
    assert.equal(a.cultivo, MENSAJES.sinCultivo);
    assert.equal(a.origen, 'fallback');
    assert.ok(a.preguntasSeguimiento.length > 0);
  });
});
