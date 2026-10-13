// Kantor Majalah — Era 2: Penerbitan majalah gaya hidup, olahraga & bisnis 1950-an
// Gedung kantor bertingkat gaya mid-century dengan fasad jendela grid, kanopi masuk, dan papan nama atap.
import * as THREE from 'three';
import { createRng } from '../../lib/rng.js';
import { speckleTexture, stripesTexture, canvasTexture } from '../../lib/textures.js';
import { std, glow, box, tint, finalize } from '../../lib/helpers.js';

export const meta = {
  id: 'majalah-kantor',
  name: 'Kantor Majalah',
  category: 'buildings',
  tags: ['era-2', 'majalah', 'kantor', 'mid-century'],
  description: 'Kantor penerbit majalah bertingkat dengan fasad jendela grid kaca dan papan reklame atap.',
  triangleBudget: 2400,
  defaultState: 'idle',
  defaults: {
    seed: 1,
    level: 1,
    wallColor: '#bfa888',
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
  const floors = 1 + Math.min(3, Math.floor(lvl * 0.7)); // 1 to 3 floors
  const floorH = 1.9;
  const w = 4.4 + (lvl - 1) * 0.3;
  const d = 4.2 + (lvl - 1) * 0.3;
  const foundH = 0.3;

  // Materials
  const stoneMat = std('#4b4d52', { map: speckleTexture(rng, { size: 64 }) });
  const wallMat = std(o.wallColor, { map: speckleTexture(rng, { size: 128, base: 230 }) });
  const trimMat = std(tint(o.wallColor, { l: -0.2 }));
  const awningMat = std('#264e70', { map: stripesTexture({ stripes: 6, a: 240, b: 180 }) });
  const glassMat = std('#8cc8e8', { roughness: 0.2, metalness: 0.3 });
  const goldMat = std('#d4af37', { metalness: 0.7, roughness: 0.3 });
  const signGlow = glow('#ffe49e', 1.0);

  // Foundation
  root.add(box(w + 0.3, foundH, d + 0.3, stoneMat, 0, foundH / 2, 0));

  // Floors
  let curY = foundH;
  for (let f = 0; f < floors; f++) {
    const fW = w - f * 0.35;
    const fD = d - f * 0.35;
    // Floor block
    root.add(box(fW, floorH, fD, wallMat, 0, curY + floorH / 2, 0));

    // Floor cornice trim
    root.add(box(fW + 0.15, 0.12, fD + 0.15, trimMat, 0, curY + floorH - 0.06, 0));

    // Window grid on front and sides
    const cols = 3 + (lvl > 2 ? 1 : 0);
    const winW = (fW * 0.7) / cols;
    const winH = 0.95;
    for (let c = 0; c < cols; c++) {
      const wx = -fW * 0.35 + winW * (c + 0.5);
      const wy = curY + floorH * 0.52;
      // Front window (+Z)
      if (f > 0 || Math.abs(wx) > 0.6) {
        root.add(box(winW * 0.85, winH, 0.06, trimMat, wx, wy, fD / 2 + 0.02));
        root.add(box(winW * 0.75, winH * 0.85, 0.04, glassMat, wx, wy, fD / 2 + 0.04));
      }
      // Side windows
      const sW = (fD * 0.6) / cols;
      const wz = -fD * 0.3 + sW * (c + 0.5);
      root.add(box(0.06, winH, sW * 0.85, trimMat, fW / 2 + 0.02, wy, wz));
      root.add(box(0.04, winH * 0.85, sW * 0.75, glassMat, fW / 2 + 0.04, wy, wz));

      root.add(box(0.06, winH, sW * 0.85, trimMat, -fW / 2 - 0.02, wy, wz));
      root.add(box(0.04, winH * 0.85, sW * 0.75, glassMat, -fW / 2 - 0.04, wy, wz));
    }

    curY += floorH;
  }

  // Entrance Door on Ground Floor (+Z)
  const doorX = rng.range(-0.15, 0.15);
  root.add(box(1.2, 1.5, 0.08, trimMat, doorX, foundH + 0.75, d / 2 + 0.04));
  root.add(box(0.9, 1.35, 0.06, glassMat, doorX, foundH + 0.75, d / 2 + 0.06));

  // Front Awning / Canopy
  const awnW = 1.8;
  const awnD = 0.8;
  const awnH = 0.35;
  const canopy = box(awnW, awnH, awnD, awningMat, doorX, foundH + 1.65, d / 2 + awnD / 2 + 0.02);
  canopy.rotation.x = 0.12;
  root.add(canopy);

  // Roof Parapet on top floor
  const topW = w - (floors - 1) * 0.35;
  const topD = d - (floors - 1) * 0.35;
  const parapetH = 0.45;
  root.add(box(topW, parapetH, 0.12, trimMat, 0, curY + parapetH / 2, topD / 2 - 0.06));
  root.add(box(topW, parapetH, 0.12, trimMat, 0, curY + parapetH / 2, -topD / 2 + 0.06));
  root.add(box(0.12, parapetH, topD - 0.24, trimMat, topW / 2 - 0.06, curY + parapetH / 2, 0));
  root.add(box(0.12, parapetH, topD - 0.24, trimMat, -topW / 2 + 0.06, curY + parapetH / 2, 0));

  // Rooftop Billboard Signboard ("MAGAZINE PERS")
  const signTex = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#1c2430';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#f4e3b5';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MAGAZINE', s / 2, s / 2 - 4);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#6ea8ff';
    ctx.fillText('PERS & MEDIA', s / 2, s / 2 + 24);
  });
  const signBoardMat = std('#22262e', { map: signTex });

  const signW = topW * 0.75;
  const signH = 0.9;
  const signGroup = new THREE.Group();
  signGroup.name = 'signboard';
  // Metal frame legs
  signGroup.add(box(0.08, 0.6, 0.08, goldMat, -signW * 0.4, curY + 0.3, topD * 0.1));
  signGroup.add(box(0.08, 0.6, 0.08, goldMat, signW * 0.4, curY + 0.3, topD * 0.1));
  // Sign panel
  const signPanel = box(signW, signH, 0.1, signBoardMat, 0, curY + 0.6 + signH / 2, topD * 0.1);
  signGroup.add(signPanel);
  // Gold trim border
  signGroup.add(box(signW + 0.1, signH + 0.1, 0.08, goldMat, 0, curY + 0.6 + signH / 2, topD * 0.1));
  // Little glowing lamp over sign
  const lamp = box(signW * 0.8, 0.08, 0.18, signGlow, 0, curY + 0.6 + signH + 0.08, topD * 0.1 + 0.1);
  lamp.name = 'sign-lamp';
  signGroup.add(lamp);

  root.add(signGroup);

  const states = {
    idle: (t) => {
      signGlow.emissiveIntensity = 0.8 + 0.4 * Math.sin(t * 2.5);
    },
  };

  return finalize(root, meta, o, states);
}
