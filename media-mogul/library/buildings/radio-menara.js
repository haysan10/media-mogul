// Menara Radio — Era 3: Stasiun radio penyiaran 1960-an
// Gedung transmisi stasiun dengan menara baja kisi-kisi (lattice tower) dan beacon peringatan merah berkedip.
import * as THREE from 'three';
import { createRng } from '../../lib/rng.js';
import { speckleTexture } from '../../lib/textures.js';
import { std, glow, box, cyl, sphere, tint, finalize } from '../../lib/helpers.js';

export const meta = {
  id: 'radio-menara',
  name: 'Menara Radio',
  category: 'buildings',
  tags: ['era-3', 'radio', 'menara', 'broadcasting'],
  description: 'Menara pemancar siaran radio dengan menara kisi baja berundak dan lampu suar berkedip.',
  triangleBudget: 2200,
  defaultState: 'idle',
  defaults: {
    seed: 1,
    level: 1,
    metalColor: '#cc3b3b',
    scale: 1,
  },
  options: {
    seed: { type: 'number', min: 0, max: 9999, step: 1 },
    level: { type: 'number', min: 1, max: 5, step: 1 },
    metalColor: { type: 'color' },
    scale: { type: 'number', min: 0.5, max: 2, step: 0.05 },
  },
};

export function create(options = {}) {
  const o = { ...meta.defaults, ...options };
  const rng = createRng(o.seed);
  const root = new THREE.Group();

  const lvl = Math.max(1, Math.min(5, Math.round(o.level)));
  const foundH = 0.3;

  // Station base dimensions
  const bW = 3.6 + (lvl - 1) * 0.2;
  const bD = 3.4 + (lvl - 1) * 0.2;
  const bH = 1.8;

  // Materials
  const stoneMat = std('#4b4d52', { map: speckleTexture(rng, { size: 64 }) });
  const stationMat = std('#8c929a', { map: speckleTexture(rng, { size: 64, base: 220 }) });
  const steelRed = std(o.metalColor, { metalness: 0.5, roughness: 0.4 });
  const steelWhite = std(tint('#f0f2f5', { l: -0.05 }), { metalness: 0.4, roughness: 0.5 });
  const beaconMat = glow('#ff2222', 1.4);
  const darkMetal = std('#2a2d32', { metalness: 0.6, roughness: 0.4 });

  // Concrete Foundation
  root.add(box(bW + 0.4, foundH, bD + 0.4, stoneMat, 0, foundH / 2, 0));

  // Transmitter Station Building
  root.add(box(bW, bH, bD, stationMat, 0, foundH + bH / 2, 0));

  // Station Door & Ventilation Louvers (+Z)
  const doorX = rng.range(-0.4, 0.4);
  root.add(box(0.9, 1.4, 0.08, darkMetal, doorX, foundH + 0.7, bD / 2 + 0.02));
  root.add(box(1.0, 0.5, 0.06, darkMetal, doorX > 0 ? -0.8 : 0.8, foundH + bH * 0.65, bD / 2 + 0.02));

  // Generator / Equipment Box beside station
  root.add(box(0.8, 0.9, 1.2, darkMetal, -bW / 2 - 0.45, foundH + 0.45, 0.2));

  // Lattice Tower Stack (3 to 5 tiers based on level)
  const tiers = 3 + Math.min(2, Math.floor(lvl * 0.6));
  const baseRadius = 0.95;
  const topRadius = 0.22;
  const tierH = 1.3 + lvl * 0.15;
  let curY = foundH + bH;

  const towerGroup = new THREE.Group();
  towerGroup.name = 'tower';

  for (let t = 0; t < tiers; t++) {
    const rBot = baseRadius - (t / tiers) * (baseRadius - topRadius);
    const rTop = baseRadius - ((t + 1) / tiers) * (baseRadius - topRadius);
    const col = t % 2 === 0 ? steelRed : steelWhite;

    // 4 Corner Legs for lattice tower
    const legThick = 0.07;
    for (let c = 0; c < 4; c++) {
      const ang = (c * Math.PI) / 2 + Math.PI / 4;
      const xBot = Math.cos(ang) * rBot;
      const zBot = Math.sin(ang) * rBot;
      const xTop = Math.cos(ang) * rTop;
      const zTop = Math.sin(ang) * rTop;

      const leg = cyl(legThick * 0.85, legThick, tierH, 6, col, (xBot + xTop) / 2, curY + tierH / 2, (zBot + zTop) / 2);
      // Slight slant towards center
      leg.lookAt(new THREE.Vector3(xTop, curY + tierH, zTop));
      leg.rotateX(Math.PI / 2);
      towerGroup.add(leg);
    }

    // Horizontal Ring Braces
    const ringMat = t % 2 === 0 ? steelRed : steelWhite;
    for (let side = 0; side < 4; side++) {
      const a1 = (side * Math.PI) / 2 + Math.PI / 4;
      const a2 = ((side + 1) * Math.PI) / 2 + Math.PI / 4;
      const midX = (Math.cos(a1) + Math.cos(a2)) * 0.5 * rTop;
      const midZ = (Math.sin(a1) + Math.sin(a2)) * 0.5 * rTop;
      const span = Math.hypot(Math.cos(a1) * rTop - Math.cos(a2) * rTop, Math.sin(a1) * rTop - Math.sin(a2) * rTop);
      const beam = box(span, 0.06, 0.06, ringMat, midX, curY + tierH - 0.03, midZ);
      beam.rotation.y = -(side * Math.PI) / 2;
      towerGroup.add(beam);
    }

    // Diagonal Cross Bars on front & back
    const crossSpan = Math.hypot(rBot * 1.4, tierH);
    const cross1 = box(crossSpan, 0.04, 0.04, col, 0, curY + tierH / 2, rBot * 0.65);
    cross1.rotation.z = 0.55;
    towerGroup.add(cross1);

    const cross2 = box(crossSpan, 0.04, 0.04, col, 0, curY + tierH / 2, rBot * 0.65);
    cross2.rotation.z = -0.55;
    towerGroup.add(cross2);

    curY += tierH;
  }

  // Antenna Mast on top
  const mastH = 1.4 + lvl * 0.2;
  const mast = cyl(0.04, 0.07, mastH, 6, darkMetal, 0, curY + mastH / 2, 0);
  mast.name = 'antenna';
  towerGroup.add(mast);

  // Dipole Antennas branching from mast
  const dipole = box(1.0, 0.04, 0.04, darkMetal, 0, curY + mastH * 0.6, 0);
  towerGroup.add(dipole);

  // Warning Beacon Sphere on very peak
  const beacon = sphere(0.14, 8, beaconMat, 0, curY + mastH + 0.1, 0);
  beacon.name = 'beacon';
  towerGroup.add(beacon);

  root.add(towerGroup);

  const states = {
    idle: (t) => {
      beaconMat.emissiveIntensity = 0.6 + 0.8 * Math.abs(Math.sin(t * 3.5));
    },
  };

  return finalize(root, meta, o, states);
}
