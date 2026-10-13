// House — small cottage: stone foundation, plank walls, gabled roof, chimney, door and windows.
// Windows can glow (night: true). Front faces +Z.
import * as THREE from 'three';
import { createRng } from '../../lib/rng.js';
import { planksTexture } from '../../lib/textures.js';
import { std, glow, box, tint, meshOf, finalize } from '../../lib/helpers.js';

export const meta = {
  id: 'house',
  name: 'Cottage House',
  category: 'buildings',
  tags: ['house', 'building', 'village', 'cottage', 'low-poly'],
  description: 'Gabled cottage with chimney, door and windows. Optional lit windows for night scenes.',
  triangleBudget: 1200,
  defaults: {
    seed: 1, width: 4, depth: 5, floors: 1,
    wallColor: '#d9c7a0', roofColor: '#a8442f', doorColor: '#6b4428', night: false, scale: 1,
  },
  options: {
    seed: { type: 'number', min: 0, max: 9999, step: 1 },
    width: { type: 'number', min: 3, max: 8, step: 0.1 },
    depth: { type: 'number', min: 3, max: 10, step: 0.1 },
    floors: { type: 'number', min: 1, max: 3, step: 1 },
    wallColor: { type: 'color' },
    roofColor: { type: 'color' },
    doorColor: { type: 'color' },
    night: { type: 'boolean' },
    scale: { type: 'number', min: 0.2, max: 3, step: 0.05 },
  },
};

export function create(options = {}) {
  const o = { ...meta.defaults, ...options };
  const rng = createRng(o.seed);
  const root = new THREE.Group();

  const w = o.width;
  const d = o.depth;
  const floors = Math.max(1, Math.round(o.floors));
  const floorH = 2.4;
  const wallsH = floorH * floors;
  const foundH = 0.3;

  const stone = std('#7f7f84');
  const walls = std(o.wallColor, { map: planksTexture(rng, { planks: 5 }) });
  const roofMat = std(tint(o.roofColor, { l: rng.range(-0.04, 0.04) }));
  const wood = std(o.doorColor);
  const frame = std(tint(o.doorColor, { l: -0.12 }));
  const glass = o.night ? glow('#ffcf70', 1.4) : std('#8fb8d8', { roughness: 0.25, metalness: 0.1 });

  // foundation + walls
  root.add(box(w + 0.2, foundH, d + 0.2, stone, 0, foundH / 2, 0));
  root.add(box(w, wallsH, d, walls, 0, foundH + wallsH / 2, 0));

  // gabled roof: triangle profile extruded along the depth
  const over = 0.35;
  const roofH = w * 0.45;
  const prof = new THREE.Shape();
  prof.moveTo(-(w / 2 + over), 0);
  prof.lineTo(w / 2 + over, 0);
  prof.lineTo(0, roofH);
  prof.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(prof, { depth: d + over * 2, bevelEnabled: false });
  roofGeo.translate(0, 0, -(d + over * 2) / 2);
  root.add(meshOf(roofGeo, roofMat, 0, foundH + wallsH, 0));

  // chimney
  const cx = rng.sign() * w * 0.25;
  root.add(box(0.55, roofH + 0.9, 0.55, stone, cx, foundH + wallsH + (roofH + 0.9) / 2 - 0.1, -d * 0.2));

  // door (front, +Z) with frame and step
  const doorX = rng.range(-w * 0.18, w * 0.18);
  root.add(box(1.1, 1.9, 0.08, frame, doorX, foundH + 0.95, d / 2 + 0.02));
  root.add(box(0.9, 1.75, 0.1, wood, doorX, foundH + 0.875, d / 2 + 0.04));
  root.add(box(1.4, 0.12, 0.5, stone, doorX, 0.06, d / 2 + 0.3));

  // windows
  const addWindow = (x, y, z, onSide) => {
    const sx = onSide ? 0.1 : 0.9;
    const sz = onSide ? 0.9 : 0.1;
    root.add(box(onSide ? 0.08 : 1.0, 1.0, onSide ? 1.0 : 0.08, frame, x, y, z));
    root.add(box(sx, 0.8, sz, glass, x + (onSide ? Math.sign(x) * 0.02 : 0), y, z + (onSide ? 0 : 0.02)));
  };
  for (let f = 0; f < floors; f++) {
    const y = foundH + f * floorH + 1.4;
    const frontX = Math.max(w * 0.3, Math.abs(doorX) + 1.3);
    if (f > 0) addWindow(doorX, y, d / 2 + 0.02, false);
    if (frontX < w / 2 - 0.6) addWindow(doorX > 0 ? -frontX : frontX, y, d / 2 + 0.02, false);
    addWindow(w / 2 + 0.02, y, 0, true);
    addWindow(-w / 2 - 0.02, y, 0, true);
  }

  return finalize(root, meta, o);
}
