import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ESTADO_APORTE_INICIAL,
  ESTADOS_APORTE,
  puedeTransicionar,
  type EstadoAporte,
} from '../types/contribution.ts';
import { esConocimientoOficial } from '../types/knowledge.ts';
import { NIVEL, REQUISITOS, nivelMaximoSoportado } from '../inference/levels.ts';
import { registro } from './helpers.ts';

describe('Estados de un aporte', () => {
  test('el estado inicial es "pending", siempre', () => {
    assert.equal(ESTADO_APORTE_INICIAL, 'pending');
  });

  test('un aporte NUNCA nace validado', () => {
    assert.notEqual(ESTADO_APORTE_INICIAL, 'validated');
  });

  test('desde pending se puede validar, rechazar o archivar', () => {
    assert.ok(puedeTransicionar('pending', 'validated'));
    assert.ok(puedeTransicionar('pending', 'rejected'));
    assert.ok(puedeTransicionar('pending', 'archived'));
  });

  test('un aporte validado no puede volver a pendiente sin más', () => {
    assert.ok(!puedeTransicionar('validated', 'pending'));
  });

  test('un archivado no salta directo a validado: vuelve a revisión', () => {
    assert.ok(!puedeTransicionar('archived', 'validated'));
    assert.ok(puedeTransicionar('archived', 'pending'));
  });

  test('un rechazado puede reabrirse a revisión', () => {
    assert.ok(puedeTransicionar('rejected', 'pending'));
  });

  test('ningún estado puede transicionar a sí mismo', () => {
    for (const e of ESTADOS_APORTE) {
      assert.ok(!puedeTransicionar(e, e), `${e} -> ${e} no debería permitirse`);
    }
  });

  test('un estado desconocido no permite nada', () => {
    assert.ok(!puedeTransicionar('inventado' as EstadoAporte, 'validated'));
  });
});

describe('Separación entre conocimiento verificado y no verificado', () => {
  test('solo "verified" es conocimiento oficial', () => {
    assert.ok(esConocimientoOficial('verified'));
    assert.ok(!esConocimientoOficial('unverified'));
    assert.ok(!esConocimientoOficial('synthetic'));
    assert.ok(!esConocimientoOficial('demo'));
  });

  test('un registro sintético no puede pasar por oficial', () => {
    assert.ok(!esConocimientoOficial(registro({ status: 'synthetic' }).status));
  });
});

describe('Niveles de servicio', () => {
  const base = { discoLibreMb: 20000, arquitecturaSoportada: true, versionSoSoportada: true };

  test('el nivel 0 no exige nada', () => {
    assert.equal(REQUISITOS[NIVEL.KB].ramMinimaMb, 0);
    assert.equal(REQUISITOS[NIVEL.KB].descargaMb, 0);
  });

  test('un teléfono sin soporte de arquitectura cae a nivel 0', () => {
    assert.equal(
      nivelMaximoSoportado({ ...base, ramTotalMb: 8192, arquitecturaSoportada: false }),
      NIVEL.KB,
    );
  });

  test('un Android antiguo cae a nivel 0 aunque tenga RAM de sobra', () => {
    assert.equal(
      nivelMaximoSoportado({ ...base, ramTotalMb: 8192, versionSoSoportada: false }),
      NIVEL.KB,
    );
  });

  test('2 GB de RAM -> solo voz', () => {
    assert.equal(nivelMaximoSoportado({ ...base, ramTotalMb: 2048 }), NIVEL.VOZ);
  });

  test('4 GB -> LLM', () => {
    assert.equal(nivelMaximoSoportado({ ...base, ramTotalMb: 4096 }), NIVEL.LLM);
  });

  test('6 GB -> completo', () => {
    assert.equal(nivelMaximoSoportado({ ...base, ramTotalMb: 6144 }), NIVEL.COMPLETO);
  });

  test('1 GB -> nivel 0, pero la app sigue siendo utilizable', () => {
    assert.equal(nivelMaximoSoportado({ ...base, ramTotalMb: 1024 }), NIVEL.KB);
  });

  test('nunca devuelve un nivel por debajo de 0', () => {
    const n = nivelMaximoSoportado({ ...base, ramTotalMb: 0, discoLibreMb: 0 });
    assert.ok(n >= NIVEL.KB);
  });
});
