// __NAME__ — __CATEGORY__ asset.
// Contract: export `meta` + `create(options)`; return a THREE.Group built with finalize().
// Units: 1 = 1 metre · Y up · origin at base centre · front faces +Z · no Math.random() · no image files.
import * as THREE from 'three';
import { createRng } from '../../lib/rng.js';
// other helpers you will likely need: cyl, cone, sphere, ico, glow, tint, jitter, paintFaces, meshOf
import { std, box, finalize } from '../../lib/helpers.js';

export const meta = {
  id: '__ID__',
  name: '__NAME__',
  category: '__CATEGORY__',
  tags: [],
  description: 'TODO: one sentence describing the asset.',
  // triangleBudget: 1500,           // optional override of the category budget
  // pivot: 'base',                  // 'base' (default) | 'center' (for floating things)
  defaults: {
    seed: 1,
    scale: 1,
    color: '#8a8f98',
  },
  // Drives the viewer's control panel. types: number | color | boolean | select
  options: {
    seed: { type: 'number', min: 0, max: 9999, step: 1 },
    scale: { type: 'number', min: 0.2, max: 3, step: 0.05 },
    color: { type: 'color' },
  },
};

export function create(options = {}) {
  const o = { ...meta.defaults, ...options };
  const rng = createRng(o.seed);
  const root = new THREE.Group();

  // --- build the asset here: root.add(mesh) ---------------------------------
  const mat = std(o.color);
  const h = rng.range(0.8, 1.2); // example of seeded variation — replace with your own design
  root.add(box(1, h, 1, mat, 0, h / 2, 0));

  // Optional animation: pass a states object as the 4th argument of finalize().
  // const states = { idle: (t, dt, ctx) => ctx.rot(root.children[0], 0, Math.sin(t) * 0.1, 0) };
  return finalize(root, meta, o /*, states */);
}
