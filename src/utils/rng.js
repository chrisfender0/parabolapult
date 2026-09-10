// Seedable RNG (mulberry32) so equation generation, and any other randomness
// that wants reproducible bugs, can be pinned to a fixed seed.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {number} [seed] - defaults to a time-based seed for non-deterministic play.
 * @returns {{
 *   seed: number,
 *   next: () => number,
 *   float: (min?: number, max?: number) => number,
 *   int: (min: number, max: number) => number,
 *   pick: <T>(array: T[]) => T,
 * }}
 */
export function createRng(seed = Date.now()) {
  const next = mulberry32(seed);

  return {
    seed,
    next,
    float(min = 0, max = 1) {
      return min + next() * (max - min);
    },
    // Inclusive of both min and max.
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick(array) {
      return array[Math.floor(next() * array.length)];
    },
  };
}

if (import.meta.env?.DEV) {
  const rng = createRng(12345);
  const rngSame = createRng(12345);
  for (let i = 0; i < 50; i += 1) {
    console.assert(rng.next() === rngSame.next(), 'same seed should produce the same sequence');
  }

  const spread = createRng(1);
  for (let i = 0; i < 500; i += 1) {
    const n = spread.int(3, 20);
    console.assert(Number.isInteger(n) && n >= 3 && n <= 20, 'int(3, 20) should stay in range', n);
  }

  const options = ['a', 'b', 'c'];
  for (let i = 0; i < 100; i += 1) {
    console.assert(options.includes(spread.pick(options)), 'pick() should only return array members');
  }

  console.log('[rng.js] self-test assertions ran — check above for any failures');
}
