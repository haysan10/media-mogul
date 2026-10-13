// Gedung Media Sosial — Era 6: Kantor pusat raksasa media sosial modern (2015+)
// Pencakar langit futuristik kaca tirai (curtain-wall glass), strip neon RGB bersiklus warna dinamis, dan teras atap bertingkat.
import * as THREE from 'three';
import { createRng } from '../../lib/rng.js';
import { speckleTexture } from '../../lib/textures.js';
import { std, glow, box, cyl, tint, finalize } from '../../lib/helpers.js';

export const meta = {
  id: 'sosmed-gedung',
  name: 'Gedung Media Sosial',
  category: 'buildings',
  tags: ['era-6', 'sosial-media', 'gedung', 'skyscraper', 'neon'],
  description: 'Pencakar langit modern kantor pusat media sosial dengan fasad kaca elegan dan strip neon RGB.',
  triangleBudget: 2800,
  defaultState: 'idle',
  defaults: {
    seed: 1,
    level: 1,
    glassColor: '#1e293b',
    scale: 1,
  },
  options: {
    seed: { type: 'number', min: 0, max: 9999, step: 1 },
    level: { type: 'number', min: 1, max: 5, step: 1 },
    glassColor: { type: 'color' },
    scale: { type: 'number', min: 0.5, max: 2, step: 0.05 },
  },
};

export function create(options = {}) {
  const o = { ...meta.defaults, ...options };
  const rng = createRng(o.seed);
  const root = new THREE.Group();

  const lvl = Math.max(1, Math.min(5, Math.round(o.level)));
  const foundH = 0.3;
  const bW = 4.4 + (lvl - 1) * 0.25;
  const bD = 4.4 + (lvl - 1) * 0.25;
  const totalH = 5.4 + lvl * 0.9;

  // Materials
  const plazaMat = std('#20242c', { map: speckleTexture(rng, { size: 64 }) });
  const darkFrameMat = std('#0f172a', { metalness: 0.8, roughness: 0.2 });
  const glassMat = std(o.glassColor, {
    roughness: 0.12,
    metalness: 0.5,
    flatShading: true,
  });
  const floorSlabMat = std('#334155', { metalness: 0.3, roughness: 0.4 });
  const neonMat = glow('#6366f1', 1.8);
  const accentLightMat = glow('#06b6d4', 1.5);

  // Plaza Base
  root.add(box(bW + 0.6, foundH, bD + 0.6, plazaMat, 0, foundH / 2, 0));

  // Modern Asymmetric Tiered Skyscraper Structure
  const tiers = 2 + Math.min(2, Math.floor(lvl * 0.6));
  let curY = foundH;
  let curW = bW;
  let curD = bD;

  const neonStrips = [];

  for (let t = 0; t < tiers; t++) {
    const tierH = totalH / tiers;
    // Main Glass Volume for tier
    const tierMesh = box(curW, tierH, curD, glassMat, 0, curY + tierH / 2, 0);
    root.add(tierMesh);

    // Dark Structural Corner Mullions
    const cThick = 0.14;
    root.add(box(cThick, tierH, cThick, darkFrameMat, curW / 2, curY + tierH / 2, curD / 2));
    root.add(box(cThick, tierH, cThick, darkFrameMat, -curW / 2, curY + tierH / 2, curD / 2));
    root.add(box(cThick, tierH, cThick, darkFrameMat, curW / 2, curY + tierH / 2, -curD / 2));
    root.add(box(cThick, tierH, cThick, darkFrameMat, -curW / 2, curY + tierH / 2, -curD / 2));

    // Horizontal Floor Division Slabs
    const slabs = 3;
    for (let s = 1; s <= slabs; s++) {
      const sy = curY + (s * tierH) / slabs;
      root.add(box(curW + 0.08, 0.08, curD + 0.08, floorSlabMat, 0, sy, 0));
    }

    // Vertical Vertical Neon Strip along front edge (+Z)
    const stripH = tierH * 0.95;
    const strip = box(0.06, stripH, 0.06, neonMat, -curW / 2 + 0.04, curY + tierH / 2, curD / 2 + 0.02);
    strip.name = 'neon-sign';
    neonStrips.push(strip);
    root.add(strip);

    curY += tierH;
    // Step inward for next tier
    curW = Math.max(2.4, curW - 0.55);
    curD = Math.max(2.4, curD - 0.55);
  }

  // Entrance Lobby Canopy & Glass Revolving Doors at base (+Z)
  const canW = 2.2;
  const canD = 1.0;
  const doorX = rng.range(-0.2, 0.2);
  root.add(box(canW, 0.1, canD, darkFrameMat, doorX, foundH + 1.8, bD / 2 + canD / 2));
  root.add(box(canW * 0.8, 1.6, 0.06, glassMat, doorX, foundH + 0.8, bD / 2 + 0.02));
  root.add(box(canW * 0.9, 0.06, 0.06, accentLightMat, doorX, foundH + 1.85, bD / 2 + canD));

  // Rooftop Crown / Antennas & Communication Spire
  const roofW = curW;
  const roofD = curD;
  const crownH = 0.5;
  root.add(box(roofW, crownH, roofD, darkFrameMat, 0, curY + crownH / 2, 0));

  // Spire Mast on Top
  const spireH = 2.0 + lvl * 0.3;
  const spire = cyl(0.04, 0.08, spireH, 6, darkFrameMat, 0, curY + crownH + spireH / 2, 0);
  root.add(spire);

  // Spire Beacon / Tip
  const tipBeacon = cyl(0.1, 0.1, 0.15, 6, accentLightMat, 0, curY + crownH + spireH + 0.08, 0);
  root.add(tipBeacon);

  // Modern Hexagon / Hash / Logo Signboard on Top Façade
  const logoBox = box(0.9, 0.9, 0.08, neonMat, 0, curY - 0.8, bD / 2 - 0.5);
  logoBox.name = 'logo-neon';
  root.add(logoBox);

  // Color Cycling States for RGB Neon Strips
  const colorA = new THREE.Color('#38bdf8'); // Sky blue
  const colorB = new THREE.Color('#a855f7'); // Purple
  const colorC = new THREE.Color('#ec4899'); // Hot pink

  const states = {
    idle: (t) => {
      // Smooth color cycling through lerp
      const s = (Math.sin(t * 0.8) + 1) / 2;
      const s2 = (Math.cos(t * 0.6) + 1) / 2;
      const targetCol = s > 0.5 ? colorB : colorA;
      neonMat.color.lerpColors(colorA, colorC, s);
      neonMat.emissive.copy(neonMat.color);
      neonMat.emissiveIntensity = 1.4 + 0.5 * Math.sin(t * 2.5);

      accentLightMat.color.lerpColors(colorB, colorA, s2);
      accentLightMat.emissive.copy(accentLightMat.color);
      accentLightMat.emissiveIntensity = 1.2 + 0.4 * Math.cos(t * 3.0);
    },
  };

  return finalize(root, meta, o, states);
}
