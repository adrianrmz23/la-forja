export interface SeededRandom {
  next: () => number;
  integer: (minimum: number, maximum: number) => number;
  pick: <T>(items: readonly T[]) => T;
  shuffle: <T>(items: readonly T[]) => T[];
  chance: (probability: number) => boolean;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;

    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRandom(seed: string): SeededRandom {
  const next = mulberry32(hashSeed(seed));

  return {
    next,

    integer(minimum, maximum) {
      const safeMinimum = Math.ceil(Math.min(minimum, maximum));
      const safeMaximum = Math.floor(Math.max(minimum, maximum));

      return Math.floor(next() * (safeMaximum - safeMinimum + 1)) + safeMinimum;
    },

    pick<T>(items: readonly T[]): T {
      if (items.length === 0) {
        throw new Error("No se puede seleccionar un elemento de una lista vacía.");
      }

      return items[Math.floor(next() * items.length)];
    },

    shuffle<T>(items: readonly T[]): T[] {
      const result = [...items];

      for (let index = result.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(next() * (index + 1));
        [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
      }

      return result;
    },

    chance(probability) {
      return next() < Math.min(1, Math.max(0, probability));
    },
  };
}
