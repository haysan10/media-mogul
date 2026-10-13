// rng.js — deterministic seeded PRNG (mulberry32).
// RULE: assets must NEVER call Math.random(). Same seed => identical asset, always.

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(seed = 1) {
  let s = (typeof seed === 'string' ? hashString(seed) : Math.floor(Number(seed) || 0)) >>> 0;

  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    /** float in [0, 1) */
    next,
    /** float in [min, max) */
    range: (min, max) => min + (max - min) * next(),
    /** integer in [min, max] (inclusive) */
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    /** random element of an array */
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    /** true with probability p */
    chance: (p = 0.5) => next() < p,
    /** -1 or 1 */
    sign: () => (next() < 0.5 ? -1 : 1),
    /** normally distributed number (mean 0, sd 1) */
    gauss: () => {
      let u = 0;
      let v = 0;
      while (u === 0) u = next();
      while (v === 0) v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    /** independent child generator, so adding parts doesn't change other parts */
    fork: (label = '') => createRng(hashString(String(label)) ^ Math.floor(next() * 4294967296)),
  };
}
