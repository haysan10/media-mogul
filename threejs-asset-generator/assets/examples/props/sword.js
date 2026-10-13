// Sword — blade extruded from a tapered profile, crossguard, wrapped grip, pommel and gem.
// Stands upright (blade up). Includes a slow "display" spin so it can be shown in menus.
import * as THREE from 'three';
import { std, glow, box, cyl, ico, meshOf, tint, finalize } from '../../lib/helpers.js';

export const meta = {
  id: 'sword',
  name: 'Sword',
  category: 'props',
  tags: ['weapon', 'sword', 'item', 'loot', 'animated'],
  description: 'Stylised longsword with a gem. Upright display pose with optional spin.',
  triangleBudget: 400,
  defaults: { length: 1, bladeColor: '#c9d2dc', guardColor: '#d4a82a', gripColor: '#5a3622', gemColor: '#e0314b', scale: 1 },
  options: {
    length: { type: 'number', min: 0.5, max: 1.6, step: 0.05 },
    bladeColor: { type: 'color' },
    guardColor: { type: 'color' },
    gripColor: { type: 'color' },
    gemColor: { type: 'color' },
    scale: { type: 'number', min: 0.2, max: 3, step: 0.05 },
  },
};

export function create(options = {}) {
  const o = { ...meta.defaults, ...options };
  const root = new THREE.Group();
  const gold = std(o.guardColor, { metalness: 0.7, roughness: 0.35 });
  const steel = std(o.bladeColor, { metalness: 0.75, roughness: 0.3 });

  const gripLen = 0.2;
  const guardY = gripLen + 0.02;
  const bladeLen = 0.9 * o.length;
  const bw = 0.07;
  const tip = bw * 1.6;

  // blade: pointed silhouette extruded 2.5 cm thick
  const prof = new THREE.Shape();
  prof.moveTo(-bw / 2, 0);
  prof.lineTo(bw / 2, 0);
  prof.lineTo(bw / 2, bladeLen - tip);
  prof.lineTo(0, bladeLen);
  prof.lineTo(-bw / 2, bladeLen - tip);
  prof.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(prof, { depth: 0.025, bevelEnabled: false });
  bladeGeo.translate(0, 0, -0.0125);
  root.add(meshOf(bladeGeo, steel, 0, guardY + 0.02, 0));
  // fuller (darker groove) down the middle
  root.add(box(0.018, bladeLen * 0.7, 0.03, std(tint(o.bladeColor, { l: -0.18 }), { metalness: 0.7 }), 0, guardY + 0.02 + bladeLen * 0.4, 0));

  root.add(box(0.34, 0.045, 0.07, gold, 0, guardY, 0)); // crossguard
  root.add(box(0.07, 0.07, 0.085, gold, 0, guardY, 0));
  root.add(cyl(0.022, 0.022, gripLen, 6, std(o.gripColor), 0, gripLen / 2, 0)); // grip
  root.add(ico(0.045, 0, gold, 0, -0.02, 0)); // pommel
  root.add(ico(0.03, 0, glow(o.gemColor, 1.1), 0, guardY, 0.045)); // gem

  const states = {
    display(t, dt, ctx) {
      ctx.rot(root, 0, t * 0.9, 0);
      ctx.move(root, 0, Math.sin(t * 1.6) * 0.03, 0);
    },
    still() {},
  };
  return finalize(root, meta, o, states);
}
