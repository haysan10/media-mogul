// Treasure Chest — wooden chest with banded lid on a hinge. Opens/closes with smooth damping.
import * as THREE from 'three';
import { createRng } from '../../lib/rng.js';
import { damp } from '../../lib/animation.js';
import { std, glow, box, cyl, tint, meshOf, finalize } from '../../lib/helpers.js';

export const meta = {
  id: 'treasure-chest',
  name: 'Treasure Chest',
  category: 'props',
  tags: ['chest', 'loot', 'container', 'interactive', 'animated'],
  description: 'Banded wooden chest with hinged lid and gold coins inside. States: closed, open.',
  triangleBudget: 1000,
  defaultState: 'closed',
  defaults: { seed: 1, woodColor: '#7a4a28', metalColor: '#d4a82a', coins: 10, open: false, scale: 1 },
  options: {
    seed: { type: 'number', min: 0, max: 9999, step: 1 },
    woodColor: { type: 'color' },
    metalColor: { type: 'color' },
    coins: { type: 'number', min: 0, max: 24, step: 1 },
    open: { type: 'boolean' },
    scale: { type: 'number', min: 0.2, max: 3, step: 0.05 },
  },
};

const OPEN_ANGLE = -1.9;

export function create(options = {}) {
  const o = { ...meta.defaults, ...options };
  const rng = createRng(o.seed);
  const root = new THREE.Group();

  const W = 1;
  const D = 0.6;
  const H = 0.45;
  const wood = std(o.woodColor);
  const metal = std(o.metalColor, { metalness: 0.6, roughness: 0.4 });
  const dark = std(tint(o.woodColor, { l: -0.15 }));
  const goldGlow = glow('#ffd34d', 0.9);

  // base + bands + lock
  root.add(box(W, H, D, wood, 0, H / 2, 0));
  for (const x of [-0.32, 0.32]) root.add(box(0.08, H + 0.02, D + 0.02, metal, x, H / 2, 0));
  root.add(box(0.14, 0.16, 0.04, metal, 0, H * 0.82, D / 2 + 0.02));
  root.add(box(W - 0.12, 0.02, D - 0.12, dark, 0, H - 0.01, 0)); // interior floor

  // treasure
  const pile = box(W - 0.2, 0.05, D - 0.2, goldGlow, 0, H + 0.0, 0);
  root.add(pile);
  const coins = Math.round(o.coins);
  for (let i = 0; i < coins; i++) {
    const c = cyl(0.07, 0.07, 0.02, 8, goldGlow, rng.range(-0.38, 0.38), H + 0.04 + rng.range(0, 0.04), rng.range(-0.2, 0.2));
    c.rotation.set(rng.range(-0.4, 0.4), rng.range(0, 3), rng.range(-0.4, 0.4));
    root.add(c);
  }

  // lid on a hinge at the back top edge
  const lid = new THREE.Group();
  lid.position.set(0, H, -D / 2);
  const dome = new THREE.CylinderGeometry(D / 2, D / 2, W, 10, 1, false, 0, Math.PI);
  dome.rotateZ(Math.PI / 2); // axis along X, dome facing +Y
  lid.add(meshOf(dome, wood, 0, 0, D / 2));
  for (const x of [-0.32, 0.32]) {
    const band = new THREE.CylinderGeometry(D / 2 + 0.015, D / 2 + 0.015, 0.08, 10, 1, false, 0, Math.PI);
    band.rotateZ(Math.PI / 2);
    lid.add(meshOf(band, metal, x, 0, D / 2));
  }
  lid.add(box(0.1, 0.12, 0.04, metal, 0, -0.02, D + 0.012)); // latch
  root.add(lid);

  let angle = o.open ? OPEN_ANGLE : 0;
  const makeState = (target) => (t, dt, ctx) => {
    angle = damp(angle, target, 6, dt || 0.016);
    ctx.rot(lid, angle);
    goldGlow.emissiveIntensity = 0.15 + 0.85 * Math.min(1, Math.abs(angle / OPEN_ANGLE));
  };
  const states = { closed: makeState(0), open: makeState(OPEN_ANGLE) };

  return finalize(root, meta, { ...o, state: o.open ? 'open' : 'closed' }, states, { resetOnChange: false });
}
