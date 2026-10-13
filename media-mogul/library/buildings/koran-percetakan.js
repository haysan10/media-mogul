// Percetakan Koran — Era 1: Percetakan koran awal abad 20
// Gudang cetak bata/kayu, cerobong asap industri, atap pelana, dan partikel asap.
import * as THREE from 'three';
import { createRng } from '../../lib/rng.js';
import { planksTexture, speckleTexture, canvasTexture } from '../../lib/textures.js';
import { std, glow, box, cyl, tint, meshOf, finalize } from '../../lib/helpers.js';

export const meta = {
  id: 'koran-percetakan',
  name: 'Percetakan Koran',
  category: 'buildings',
  tags: ['era-1', 'koran', 'percetakan', 'industri'],
  description: 'Gudang percetakan koran era awal dengan cerobong asap dan tumpukan kertas koran.',
  triangleBudget: 2200,
  defaultState: 'idle',
  defaults: {
    seed: 1,
    level: 1,
    wallColor: '#b08d5b',
    scale: 1,
  },
  options: {
    seed: { type: 'number', min: 0, max: 9999, step: 1 },
    level: { type: 'number', min: 1, max: 5, step: 1 },
    wallColor: { type: 'color' },
    scale: { type: 'number', min: 0.5, max: 2, step: 0.05 },
  },
};

export function create(options = {}) {
  const o = { ...meta.defaults, ...options };
  const rng = createRng(o.seed);
  const root = new THREE.Group();

  const lvl = Math.max(1, Math.min(5, Math.round(o.level)));
  const w = 4.2 + (lvl - 1) * 0.4;
  const d = 5.0 + (lvl - 1) * 0.5;
  const h = 2.6 + (lvl - 1) * 0.25;
  const foundH = 0.35;

  // Materials
  const stoneMat = std('#5a5c61', { map: speckleTexture(rng, { size: 64 }) });
  const wallMat = std(o.wallColor, { map: planksTexture(rng, { planks: 6 }) });
  const trimMat = std(tint(o.wallColor, { l: -0.15 }));
  const roofColor = tint('#8a3c2a', { l: rng.range(-0.04, 0.04) });
  const roofMat = std(roofColor);
  const ironMat = std('#393b40', { metalness: 0.6, roughness: 0.4 });
  const glassMat = std('#7ca6cf', { roughness: 0.2, metalness: 0.1 });
  const paperMat = std('#e8e4d8', { roughness: 0.9 });

  // Foundation
  root.add(box(w + 0.3, foundH, d + 0.3, stoneMat, 0, foundH / 2, 0));

  // Main Warehouse Box
  root.add(box(w, h, d, wallMat, 0, foundH + h / 2, 0));

  // Gabled Roof
  const over = 0.3;
  const roofH = w * 0.4;
  const prof = new THREE.Shape();
  prof.moveTo(-(w / 2 + over), 0);
  prof.lineTo(w / 2 + over, 0);
  prof.lineTo(0, roofH);
  prof.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(prof, { depth: d + over * 2, bevelEnabled: false });
  roofGeo.translate(0, 0, -(d + over * 2) / 2);
  root.add(meshOf(roofGeo, roofMat, 0, foundH + h, 0));

  // Industrial Chimney (name: chimney)
  const chimH = 2.2 + lvl * 0.4;
  const chimR = 0.3 + (lvl > 2 ? 0.05 : 0);
  const chimX = rng.sign() * (w * 0.26 + rng.range(-0.1, 0.1));
  const chimZ = -d * 0.25 + rng.range(-0.1, 0.1);
  const chimney = cyl(chimR * 0.85, chimR, chimH, 8, ironMat, chimX, foundH + h + chimH / 2, chimZ);
  chimney.name = 'chimney';
  root.add(chimney);

  // Chimney cap ring
  root.add(cyl(chimR * 1.05, chimR * 0.95, 0.15, 8, ironMat, chimX, foundH + h + chimH - 0.05, chimZ));

  // Main Wooden Loading Doors (+Z front)
  const doorW = 1.3;
  const doorH = 1.9;
  const doorX = rng.range(-0.3, 0.3);
  root.add(box(doorW + 0.15, doorH + 0.1, 0.1, trimMat, doorX, foundH + doorH / 2 + 0.05, d / 2 + 0.02));
  root.add(box(doorW, doorH, 0.08, trimMat, doorX, foundH + doorH / 2, d / 2 + 0.04));

  // Warehouse industrial windows (side & front)
  const winCount = 2 + Math.floor(lvl / 2);
  for (let i = 0; i < winCount; i++) {
    const sideZ = -d * 0.35 + (i * d * 0.7) / (winCount - 1 || 1);
    root.add(box(0.08, 0.8, 1.0, trimMat, w / 2 + 0.02, foundH + h * 0.6, sideZ));
    root.add(box(0.04, 0.7, 0.9, glassMat, w / 2 + 0.04, foundH + h * 0.6, sideZ));

    root.add(box(0.08, 0.8, 1.0, trimMat, -w / 2 - 0.02, foundH + h * 0.6, sideZ));
    root.add(box(0.04, 0.7, 0.9, glassMat, -w / 2 - 0.04, foundH + h * 0.6, sideZ));
  }

  // Newspaper rolls / cargo props (seed & level dependent)
  if (lvl >= 2) {
    const rollCount = Math.min(6, 2 + lvl);
    for (let i = 0; i < rollCount; i++) {
      const rx = -w / 2 - 0.35 + (i % 2) * 0.3;
      const rz = d * 0.2 - Math.floor(i / 2) * 0.45;
      const roll = cyl(0.18, 0.18, 0.45, 8, paperMat, rx, foundH + 0.18, rz);
      roll.rotation.x = Math.PI / 2;
      root.add(roll);
    }
  }

  // Second chimney for level 4-5
  if (lvl >= 4) {
    const chim2 = cyl(chimR * 0.7, chimR * 0.85, chimH * 0.8, 8, ironMat, -chimX, foundH + h + chimH * 0.4, chimZ);
    root.add(chim2);
  }

  // Smoke particles group
  const smokeGroup = new THREE.Group();
  smokeGroup.name = 'smoke';
  const smokeCount = 6;
  const smokeSprites = [];
  const smokeTex = canvasTexture(64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(235, 235, 235, 0.85)');
    g.addColorStop(0.4, 'rgba(200, 200, 200, 0.45)');
    g.addColorStop(1, 'rgba(180, 180, 180, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });

  const phases = [];
  const speeds = [];
  for (let i = 0; i < smokeCount; i++) {
    const mat = new THREE.SpriteMaterial({
      map: smokeTex,
      color: 0xcccccc,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(0.4, 0.4, 0.4);
    smokeSprites.push(sp);
    smokeGroup.add(sp);
    phases.push(rng.next());
    speeds.push(rng.range(0.6, 1.2));
  }
  root.add(smokeGroup);

  const chimTopY = foundH + h + chimH;

  const states = {
    idle: (t) => {
      for (let i = 0; i < smokeCount; i++) {
        const sp = smokeSprites[i];
        const age = (t * 0.7 * speeds[i] + phases[i]) % 1;
        const drift = Math.sin(t * 1.5 + i) * 0.25 * age;
        sp.position.set(chimX + drift, chimTopY + age * 1.6, chimZ + Math.cos(t * 1.2 + i) * 0.15 * age);
        const sc = 0.25 + age * 0.55;
        sp.scale.set(sc, sc, sc);
        sp.material.opacity = Math.max(0, (1 - age) * 0.55);
      }
    },
  };

  return finalize(root, meta, o, states);
}
