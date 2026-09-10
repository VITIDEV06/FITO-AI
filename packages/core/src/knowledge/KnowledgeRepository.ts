import { normalizar, tokenizar } from './normalize.ts';
import type { RegistroConocimiento } from '../types/knowledge.ts';

/**
 * Contrato de acceso al conocimiento. La app móvil lo implementa sobre SQLite;
 * el prototipo de escritorio y los tests, sobre memoria.
 *
 * Corrige G.8 del audit: el prototipo hacía readFileSync + JSON.parse en CADA
 * llamada, y se llamaba hasta 4 veces por análisis. Aquí se indexa una vez.
 */
export interface KnowledgeRepository {
  buscarPorCultivo(nombre: string): RegistroConocimiento[];
  /** Coincidencia por nombre de cultivo mencionado en texto libre. */
  detectarCultivo(texto: string): RegistroConocimiento[];
  /** Mejor registro para un texto + cultivo opcional. null si no hay nada. */
  mejorCoincidencia(texto: string, cultivo?: string | null): RegistroConocimiento | null;
  listarCultivos(): string[];
  todos(): RegistroConocimiento[];
}

export class InMemoryKnowledgeRepository implements KnowledgeRepository {
  private readonly registros: RegistroConocimiento[];
  /** clave normalizada (nombre o alias) -> registros */
  private readonly indicePorNombre = new Map<string, RegistroConocimiento[]>();

  constructor(registros: RegistroConocimiento[]) {
    this.registros = registros;
    for (const registro of registros) {
      for (const clave of [registro.crop, ...(registro.aliases ?? [])]) {
        const k = normalizar(clave);
        if (!k) continue;
        const lista = this.indicePorNombre.get(k) ?? [];
        lista.push(registro);
        this.indicePorNombre.set(k, lista);
      }
    }
  }

  todos(): RegistroConocimiento[] {
    return this.registros;
  }

  listarCultivos(): string[] {
    return [...new Set(this.registros.map((r) => r.crop))].sort((a, b) => a.localeCompare(b, 'es'));
  }

  buscarPorCultivo(nombre: string): RegistroConocimiento[] {
    return this.indicePorNombre.get(normalizar(nombre)) ?? [];
  }

  detectarCultivo(texto: string): RegistroConocimiento[] {
    const normalizado = normalizar(texto);
    if (!normalizado) return [];

    // Preferimos la clave más larga que aparezca: "tomate cherry" antes que "tomate".
    const claves = [...this.indicePorNombre.keys()]
      .filter((clave) => normalizado.includes(clave))
      .sort((a, b) => b.length - a.length);

    return claves.length ? (this.indicePorNombre.get(claves[0]) ?? []) : [];
  }

  mejorCoincidencia(texto: string, cultivo?: string | null): RegistroConocimiento | null {
    const candidatos = cultivo ? this.buscarPorCultivo(cultivo) : [];
    const conjunto = candidatos.length ? candidatos : this.detectarCultivo(texto);
    if (!conjunto.length) return null;
    if (conjunto.length === 1) return conjunto[0];

    // Varios problemas para el mismo cultivo: gana el que más síntomas comparte.
    const palabras = new Set(tokenizar(texto));
    let mejor = conjunto[0];
    let mejorPuntaje = -1;

    for (const registro of conjunto) {
      let puntaje = 0;
      for (const sintoma of registro.symptoms) {
        for (const palabra of tokenizar(sintoma)) {
          if (palabras.has(palabra)) puntaje += 1;
        }
      }
      // A igualdad de síntomas, preferimos conocimiento verificado.
      if (registro.status === 'verified') puntaje += 0.5;
      if (puntaje > mejorPuntaje) {
        mejorPuntaje = puntaje;
        mejor = registro;
      }
    }

    return mejor;
  }
}
