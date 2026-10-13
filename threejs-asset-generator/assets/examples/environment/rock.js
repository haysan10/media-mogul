// Rock — faceted boulder cluster with per-face colour and optional moss on top-facing faces.
import * as THREE from 'three';
import { createRng } from '../../lib/rng.js';
import { std, jitter, paintFaces, finalize } from '../../lib/helpers.js';

export const meta = {
  id: 'rock',
  name: 'Rock Cluster',
  category: 'environment',
  tags: ['rock', 'boulder', 'nature', 'low-poly'],
  description: 'Faceted boulder cluster with per-face colour variation and optional moss.',
  triangleBudget: 1200,
  defaults: { seed: 1, size: 1, count: 3, color: '#8b8d92', moss: true, scale: 1 },
  options: {
    seed: { type: 'number', min: 0, max: 9999, step: 1 },
    size: { type: 'number', min: 0.3, max: 4, step: 0.05 },
    count: { type: 'number', min: 1, max: 5, step: 1 },
    color: { type: 'color' },
    moss: { type: 'boolean' },
    scale: { type: 'number', min: 0.2, max: 3, step: 0.05 },
  },
};

export function create(options = {}) {
  const o = { ...meta.defaults, ...options };
  const rng = createRng(o.seed);
  const root = new THREE.Group();
  const mat = std('#ffffff', { vertexColors: true });
  const base = new THREE.Color(o.color);
  const moss = new THREE.Color('#5d8a3c');

  const count = Math.max(1, Math.round(o.count));
  for (let i = 0; i < count; i++) {
    const r = (i === 0 ? 1 : rng.range(0.35, 0.7)) * o.size * 0.6;
    let geo = new THREE.IcosahedronGeometry(r, 1);
    geo.scale(rng.range(0.9, 1.3), rng.range(0.6, 0.95), rng.range(0.9, 1.25));
    jitter(geo, rng, r * 0.16);
    geo = paintFaces(geo, ({ normal }) => {
      if (o.moss && normal.y > 0.65) return moss.clone().offsetHSL(0, 0, rng.range(-0.03, 0.03));
      return base.clone().offsetHSL(0, 0, rng.range(-0.06, 0.04) - (1 - normal.y) * 0.04);
    });
    const m = new THREE.Mesh(geo, mat);
    const ang = rng.range(0, Math.PI * 2);
    const dist = i === 0 ? 0 : o.size * rng.range(0.5, 0.9);
    m.position.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
    m.rotation.y = rng.range(0, Math.PI * 2);
    root.add(m);
  }
  return finalize(root, meta, o);
}
