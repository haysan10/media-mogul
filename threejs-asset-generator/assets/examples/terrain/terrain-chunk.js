// Terrain Chunk — noise heightfield with per-face biome colours (sand → grass → forest → rock → snow).
import * as THREE from 'three';
import { createNoise2D } from '../../lib/noise.js';
import { std, paintFaces, meshOf, finalize } from '../../lib/helpers.js';

export const meta = {
  id: 'terrain-chunk',
  name: 'Terrain Chunk',
  category: 'terrain',
  tags: ['terrain', 'heightmap', 'procedural', 'level'],
  description: 'Seeded noise terrain tile. Neighbouring tiles line up when you use the same seed and different offsets.',
  triangleBudget: 8000,
  defaults: { seed: 1, size: 24, segments: 32, height: 4, frequency: 0.09, offsetX: 0, offsetZ: 0, scale: 1 },
  options: {
    seed: { type: 'number', min: 0, max: 9999, step: 1 },
    size: { type: 'number', min: 8, max: 64, step: 1 },
    segments: { type: 'number', min: 8, max: 48, step: 4 },
    height: { type: 'number', min: 0.5, max: 12, step: 0.1 },
    frequency: { type: 'number', min: 0.03, max: 0.3, step: 0.01 },
    offsetX: { type: 'number', min: -200, max: 200, step: 1 },
    offsetZ: { type: 'number', min: -200, max: 200, step: 1 },
    scale: { type: 'number', min: 0.2, max: 3, step: 0.05 },
  },
};

const PALETTE = ['#d9c58a', '#6aa84f', '#4f8a3a', '#7d7f86', '#f2f5fa']; // sand, grass, forest, rock, snow

export function create(options = {}) {
  const o = { ...meta.defaults, ...options };
  const { fbm } = createNoise2D(o.seed);
  const seg = Math.max(4, Math.round(o.segments));

  const geo = new THREE.PlaneGeometry(o.size, o.size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    // world-space sampling => neighbouring chunks (offsetX/Z) line up seamlessly
    const wx = pos.getX(i) + o.offsetX;
    const wz = pos.getZ(i) + o.offsetZ;
    const h = (fbm(wx * o.frequency, wz * o.frequency, { octaves: 4 }) * 0.5 + 0.5) * o.height;
    pos.setY(i, h);
    lo = Math.min(lo, h);
    hi = Math.max(hi, h);
  }
  const colors = PALETTE.map((c) => new THREE.Color(c));
  const painted = paintFaces(geo, ({ centroid, normal }) => {
    const t = (centroid.y - lo) / Math.max(0.0001, hi - lo);
    if (normal.y < 0.72 && t > 0.25) return colors[3]; // steep = rock
    if (t < 0.18) return colors[0];
    if (t < 0.45) return colors[1];
    if (t < 0.75) return colors[2];
    return colors[4];
  });

  const root = new THREE.Group();
  root.add(meshOf(painted, std('#ffffff', { vertexColors: true })));
  return finalize(root, meta, o);
}
