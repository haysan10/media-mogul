// Pine Tree — layered low-poly conifer with optional snow and a gentle wind sway.
import * as THREE from 'three';
import { createRng } from '../../lib/rng.js';
import { std, cyl, tint, jitter, finalize } from '../../lib/helpers.js';

export const meta = {
  id: 'pine-tree',
  name: 'Pine Tree',
  category: 'environment',
  tags: ['tree', 'nature', 'forest', 'low-poly', 'animated'],
  description: 'Low-poly pine tree with layered foliage cones, optional snow and wind sway.',
  triangleBudget: 1500,
  defaults: { seed: 1, height: 6, layers: 4, foliageColor: '#2f6b3a', trunkColor: '#6b4a2e', snow: false, scale: 1 },
  options: {
    seed: { type: 'number', min: 0, max: 9999, step: 1 },
    height: { type: 'number', min: 2, max: 14, step: 0.1 },
    layers: { type: 'number', min: 2, max: 7, step: 1 },
    foliageColor: { type: 'color' },
    trunkColor: { type: 'color' },
    snow: { type: 'boolean' },
    scale: { type: 'number', min: 0.2, max: 3, step: 0.05 },
  },
};

export function create(options = {}) {
  const o = { ...meta.defaults, ...options };
  const rng = createRng(o.seed);
  const root = new THREE.Group();

  const trunkH = o.height * 0.22;
  root.add(cyl(o.height * 0.03, o.height * 0.045, trunkH, 6, std(o.trunkColor), 0, trunkH / 2, 0));

  const layers = Math.max(2, Math.round(o.layers));
  const foliageH = o.height - trunkH * 0.6;
  const layerH = (foliageH / layers) * 1.6;
  const snowMat = std('#f4f8ff');
  const crowns = [];

  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1); // 0 = bottom, 1 = top
    const radius = THREE.MathUtils.lerp(o.height * 0.28, o.height * 0.09, t) * rng.range(0.92, 1.08);
    const y = trunkH * 0.6 + t * (foliageH - layerH) + layerH / 2;
    const mat = std(tint(o.foliageColor, { l: (t - 0.5) * 0.12 + rng.range(-0.02, 0.02) }));

    const crown = new THREE.Group();
    crown.position.y = y;
    crown.rotation.y = rng.range(0, Math.PI * 2);
    const geo = jitter(new THREE.ConeGeometry(radius, layerH, 7, 1), rng, radius * 0.06);
    crown.add(new THREE.Mesh(geo, mat));

    if (o.snow) {
      // cap covering the upper ~45% of the cone; radius at that height = radius * 0.55
      const cap = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.6, layerH * 0.45, 7, 1), snowMat);
      cap.position.y = layerH * 0.275;
      crown.add(cap);
    }
    root.add(crown);
    crowns.push(crown);
  }

  const states = {
    sway(t, dt, ctx) {
      crowns.forEach((c, i) => {
        const k = (i + 1) / crowns.length; // top moves more
        ctx.rot(c, Math.sin(t * 1.3 + i) * 0.012 * k, 0, Math.sin(t * 1.1 + i * 0.7) * 0.025 * k);
      });
    },
    still() {},
  };

  return finalize(root, meta, o, states);
}
