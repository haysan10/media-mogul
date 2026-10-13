// Kantor Kreator — Era 5: Kantor pembuat konten & studio video online (YouTube era 2000-an)
// Bangunan studio kreatif modern minimalis dengan ring light ikonik bercahaya dan panel aksen kayu & kaca.
import * as THREE from 'three';
import { createRng } from '../../lib/rng.js';
import { planksTexture, speckleTexture } from '../../lib/textures.js';
import { std, glow, box, cyl, tint, meshOf, finalize } from '../../lib/helpers.js';

export const meta = {
  id: 'kreator-kantor',
  name: 'Kantor Kreator',
  category: 'buildings',
  tags: ['era-5', 'kreator', 'youtube', 'video-online', 'modern'],
  description: 'Studio kantor kreator konten online dengan ring light neon ikonik dan kaca fasad besar.',
  triangleBudget: 2200,
  defaultState: 'idle',
  defaults: {
    seed: 1,
    level: 1,
    wallColor: '#2b2d35',
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
  const foundH = 0.25;
  const bW = 4.2 + (lvl - 1) * 0.3;
  const bD = 4.0 + (lvl - 1) * 0.3;
  const bH = 2.6 + (lvl - 1) * 0.2;

  // Materials
  const deckMat = std('#3f434a', { map: speckleTexture(rng, { size: 64 }) });
  const modernDarkMat = std(o.wallColor, { roughness: 0.5, metalness: 0.1 });
  const warmWoodMat = std('#996a43', { map: planksTexture(rng, { planks: 8 }) });
  const glassMat = std('#9bc5e2', { roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85, depthWrite: false });
  const metalTrim = std('#181a20', { roughness: 0.3, metalness: 0.7 });
  const ringLightMat = glow('#ff0055', 1.6);
  const accentNeonMat = glow('#00e5ff', 1.4);

  // Foundation deck
  root.add(box(bW + 0.4, foundH, bD + 0.4, deckMat, 0, foundH / 2, 0));

  // Main Studio Block (offset loft shape)
  root.add(box(bW, bH, bD, modernDarkMat, 0, foundH + bH / 2, 0));

  // Wood Accent Slat Wall on one half of front
  const slatW = bW * 0.42;
  const slatH = bH * 0.9;
  const slatX = -bW * 0.25;
  root.add(box(slatW, slatH, 0.08, warmWoodMat, slatX, foundH + slatH / 2, bD / 2 + 0.04));

  // Large Picture Window Studio Area on the other half (+Z)
  const winW = bW * 0.48;
  const winH = bH * 0.75;
  const winX = bW * 0.22;
  // Window frame
  root.add(box(winW, winH, 0.1, metalTrim, winX, foundH + winH / 2 + 0.2, bD / 2 + 0.02));
  // Glass pane
  root.add(box(winW - 0.1, winH - 0.1, 0.04, glassMat, winX, foundH + winH / 2 + 0.2, bD / 2 + 0.04));

  // Iconic Ring Light mounted on the wooden accent wall (+Z)
  // TorusGeometry(R, r, radialSeg, tubularSeg) - low poly
  const ringR = 0.5 + lvl * 0.05;
  const ringTube = 0.06;
  const ringGeo = new THREE.TorusGeometry(ringR, ringTube, 6, 12);
  const ringLight = meshOf(ringGeo, ringLightMat, slatX, foundH + bH * 0.62, bD / 2 + 0.12);
  ringLight.name = 'ring-light';
  root.add(ringLight);

  // Ring light mounting stand
  root.add(cyl(0.025, 0.025, 0.5, 6, metalTrim, slatX, foundH + bH * 0.62 - ringR - 0.25, bD / 2 + 0.1));

  // Modern entrance door under picture window (+Z)
  root.add(box(0.9, 1.6, 0.06, metalTrim, winX + rng.range(-0.1, 0.1), foundH + 0.8, bD / 2 + 0.06));

  // Sleek Neon Accent Line along top roof edge
  const roofNeon = box(bW * 0.95, 0.06, 0.06, accentNeonMat, 0, foundH + bH + 0.03, bD / 2);
  roofNeon.name = 'roof-neon';
  root.add(roofNeon);

  // Rooftop Patio / Solar Panel / Pergola details
  const pergolaW = bW * 0.55;
  const pergolaD = bD * 0.6;
  const pergolaH = 1.0;
  // 4 thin posts
  root.add(cyl(0.04, 0.04, pergolaH, 6, metalTrim, -pergolaW / 2 + 0.2, foundH + bH + pergolaH / 2, pergolaD / 2 - 0.2));
  root.add(cyl(0.04, 0.04, pergolaH, 6, metalTrim, pergolaW / 2 - 0.2, foundH + bH + pergolaH / 2, pergolaD / 2 - 0.2));
  root.add(cyl(0.04, 0.04, pergolaH, 6, metalTrim, -pergolaW / 2 + 0.2, foundH + bH + pergolaH / 2, -pergolaD / 2 + 0.2));
  root.add(cyl(0.04, 0.04, pergolaH, 6, metalTrim, pergolaW / 2 - 0.2, foundH + bH + pergolaH / 2, -pergolaD / 2 + 0.2));
  // Pergola roof slats
  for (let s = 0; s < 5; s++) {
    const sz = -pergolaD / 2 + 0.2 + (s * (pergolaD - 0.4)) / 4;
    root.add(box(pergolaW, 0.04, 0.08, warmWoodMat, 0, foundH + bH + pergolaH, sz));
  }

  // Creator Play Button Billboard or studio prop for higher levels
  if (lvl >= 3) {
    const signGold = std('#ffd700', { metalness: 0.85, roughness: 0.25 });
    const playBtn = box(0.5, 0.4, 0.08, signGold, winX, foundH + bH + 0.35, 0);
    playBtn.rotation.y = 0.2;
    root.add(playBtn);
  }

  const states = {
    idle: (t) => {
      ringLightMat.emissiveIntensity = 1.2 + 0.6 * Math.sin(t * 3.2);
      accentNeonMat.emissiveIntensity = 1.0 + 0.4 * Math.sin(t * 2.0);
    },
  };

  return finalize(root, meta, o, states);
}
