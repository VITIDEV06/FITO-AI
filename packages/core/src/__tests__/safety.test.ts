import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { esInseguro, filtrarLista, filtrarTexto } from '../safety/filter.ts';
import { analizarSalidaModelo } from '../index.ts';
import { construirAnalisis } from '../knowledge/enrich.ts';
import { parsearRespuestaModelo } from '../parser/parseAnalysis.ts';
import { DESCARGO_RESPONSABILIDAD } from '../messages.ts';
import { registro } from './helpers.ts';

const PELIGROSOS = [
  'pesticida', 'insecticida', 'fungicida', 'herbicida', 'acaricida',
  'plaguicida', 'nematicida', 'rodenticida', 'agroquímico', 'químico',
  'dosis', 'dosificación', 'fumigar', 'rociar', 'aspersión', 'tóxico',
  'veneno', 'glifosato', 'mancozeb',
];

describe('Detección de términos prohibidos', () => {
  for (const t of PELIGROSOS) {
    test(`detecta "${t}"`, () => assert.ok(esInseguro(`Aplicar ${t} en la planta`)));
  }
  test('no marca texto seguro', () => {
    assert.ok(!esInseguro('Revisa la humedad del suelo y el envés de las hojas'));
  });
});

describe('Filtrado de listas', () => {
  test('elimina lo inseguro y conserva lo seguro', () => {
    const r = filtrarLista(['Aplicar fungicida', 'Revisar la humedad del suelo']);
    assert.deepEqual(r.valores, ['Revisar la humedad del suelo']);
    assert.equal(r.suprimidos, 1);
  });
  test('descarta vacíos sin contarlos como supresión', () => {
    const r = filtrarLista(['ok', '   ', '']);
    assert.deepEqual(r.valores, ['ok']);
    assert.equal(r.suprimidos, 0);
  });
  test('entrada no-array -> vacío', () => {
    assert.deepEqual(filtrarLista('no soy array').valores, []);
  });
});

describe('BUG-2: el filtro cubre el campo cultivo', () => {
  test('cultivo con término prohibido se suprime', () => {
    const r = filtrarTexto('tomate tratado con pesticida');
    assert.deepEqual(r.valores, []);
    assert.equal(r.suprimidos, 1);
  });

  test('el análisis no expone un cultivo inseguro', () => {
    const a = analizarSalidaModelo('{"cultivo":"tomate tratado con pesticida"}', null);
    assert.ok(!a.cultivo.toLowerCase().includes('pesticida'), `cultivo: ${a.cultivo}`);
    assert.equal(a.cultivo, 'Cultivo no identificado');
  });
});

describe('BUG-3: el filtro se aplica al contenido de la knowledge base', () => {
  test('recomendaciones inseguras de la KB no llegan al usuario', () => {
    const contaminado = registro({
      crop: 'cultivo-de-prueba',
      management: ['Aplicar fungicida sistémico', 'Revisar el riego'],
    });
    const a = construirAnalisis(parsearRespuestaModelo('{}'), contaminado);
    const texto = JSON.stringify(a.proximosPasos).toLowerCase();
    assert.ok(!texto.includes('fungicida'), `pasos: ${texto}`);
    assert.ok(a.proximosPasos.includes('Revisar el riego'));
  });

  test('causas inseguras de la KB tampoco', () => {
    const contaminado = registro({ causes: ['Exceso de herbicida', 'Estrés hídrico'] });
    const a = construirAnalisis(parsearRespuestaModelo('{}'), contaminado);
    const texto = JSON.stringify(a.posiblesCausas).toLowerCase();
    assert.ok(!texto.includes('herbicida'));
  });

  test('si la KB queda vacía tras filtrar, cae al genérico y no al contenido inseguro', () => {
    const contaminado = registro({ management: ['Aplicar fungicida', 'Rociar veneno'] });
    const a = construirAnalisis(parsearRespuestaModelo('{}'), contaminado);
    assert.ok(a.proximosPasos.length > 0);
    assert.ok(!JSON.stringify(a.proximosPasos).toLowerCase().includes('fungicida'));
  });
});

describe('BUG-6: la supresión deja rastro', () => {
  test('marca contenidoSuprimido y cuenta por campo', () => {
    const a = analizarSalidaModelo('{"proximos_pasos":["Aplicar pesticida","Revisar riego"]}', null);
    assert.equal(a.seguridad.contenidoSuprimido, true);
    assert.equal(a.seguridad.suprimidosPorCampo.proximosPasos, 1);
    assert.ok(typeof a.seguridad.aviso === 'string' && a.seguridad.aviso.length > 20);
  });

  test('sin supresión, no hay aviso', () => {
    const a = analizarSalidaModelo('{"proximos_pasos":["Revisar riego"]}', null);
    assert.equal(a.seguridad.contenidoSuprimido, false);
    assert.equal(a.seguridad.aviso, undefined);
  });

  test('acumula supresiones de varios campos', () => {
    const a = analizarSalidaModelo(
      '{"cultivo":"maiz con plaguicida","sintomas":["daño por pesticida","manchas"],"proximos_pasos":["fumigar"]}',
      null,
    );
    assert.equal(a.seguridad.suprimidosPorCampo.cultivo, 1);
    assert.equal(a.seguridad.suprimidosPorCampo.sintomas, 1);
    assert.equal(a.seguridad.suprimidosPorCampo.proximosPasos, 1);
    assert.deepEqual(a.sintomas, ['manchas']);
  });
});

describe('BUG-5: no se filtran mensajes técnicos al agricultor', () => {
  const entradas = ['basura', '', '{}', 'no puedo responder', '{"a":'];
  for (const [i, e] of entradas.entries()) {
    test(`entrada #${i} no menciona "modelo" ni jerga interna`, () => {
      const a = analizarSalidaModelo(e, null);
      const visible = JSON.stringify([
        a.sintomas, a.posiblesCausas, a.proximosPasos, a.informacionFaltante, a.preguntasSeguimiento,
      ]).toLowerCase();
      assert.ok(!visible.includes('modelo'), `fuga: ${visible}`);
      assert.ok(!visible.includes('json'));
      assert.ok(!visible.includes('parse'));
      assert.ok(!visible.includes('error'));
    });
  }
});

describe('Propiedad crítica: el descargo siempre está presente', () => {
  const entradas: unknown[] = ['{}', 'basura', '', null, undefined, '{"cultivo":"tomate"}'];
  for (const [i, e] of entradas.entries()) {
    test(`entrada #${i}`, () => {
      const a = analizarSalidaModelo(e, null);
      assert.equal(a.descargoResponsabilidad, DESCARGO_RESPONSABILIDAD);
      assert.ok(a.descargoResponsabilidad.length > 40);
    });
  }
  test('el descargo dice explícitamente que no es diagnóstico definitivo', () => {
    assert.ok(/no es un diagn/i.test(DESCARGO_RESPONSABILIDAD));
  });
});
