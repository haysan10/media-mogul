// noise.js — seeded 2D value noise + fBm. Pure JS, no DOM, safe in Node.
import { createRng } from './rng.js';

export function createNoise2D(seed = 1) {
  const rng = createRng(seed);
  const perm = new Uint16Array(512);
  const vals = new Float32Array(256);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) vals[i] = rng.next() * 2 - 1;

  const smooth = (t) => t * t * (3 - 2 * t);
  const corner = (ix, iy) => vals[perm[perm[ix & 255] + (iy & 255)]];

  /** value noise in [-1, 1] */
  function noise2(x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = smooth(x - x0);
    const ty = smooth(y - y0);
    const a = corner(x0, y0);
    const b = corner(x0 + 1, y0);
    const c = corner(x0, y0 + 1);
    const d = corner(x0 + 1, y0 + 1);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }

  /** fractal Brownian motion, roughly in [-1, 1] */
  function fbm(x, y, { octaves = 4, lacunarity = 2, gain = 0.5 } = {}) {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += noise2(x * freq, y * freq) * amp;
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }

  return { noise2, fbm };
}
