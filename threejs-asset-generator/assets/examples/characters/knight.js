// Knight — blocky humanoid with a simple joint rig (hips, torso, head, arms, legs).
// Rig = nested Groups whose origin is the joint, so rotating the group rotates the limb.
// States: idle, walk, attack.  Front faces +Z.  Natural height ≈ 2.1 m, default scale 0.85 ≈ 1.8 m.
import * as THREE from 'three';
import { easeInOutQuad, easeInQuad, easeOutQuad } from '../../lib/animation.js';
import { std, box, cyl, tint, lerp, finalize } from '../../lib/helpers.js';

export const meta = {
  id: 'knight',
  name: 'Knight',
  category: 'characters',
  tags: ['character', 'humanoid', 'knight', 'rigged', 'animated', 'npc'],
  description: 'Armoured knight with sword and optional shield. Procedural idle / walk / attack animations.',
  triangleBudget: 1500,
  defaultState: 'idle',
  defaults: {
    armorColor: '#9aa3ad', clothColor: '#b3262e', plumeColor: '#b3262e',
    sword: true, shield: true, scale: 0.85,
  },
  options: {
    armorColor: { type: 'color' },
    clothColor: { type: 'color' },
    plumeColor: { type: 'color' },
    sword: { type: 'boolean' },
    shield: { type: 'boolean' },
    scale: { type: 'number', min: 0.3, max: 2, step: 0.05 },
  },
};

export function create(options = {}) {
  const o = { ...meta.defaults, ...options };
  const armor = std(o.armorColor, { metalness: 0.55, roughness: 0.45 });
  const trim = std(tint(o.armorColor, { l: 0.14 }), { metalness: 0.6, roughness: 0.4 });
  const cloth = std(o.clothColor);
  const leather = std('#5a3d28');
  const dark = std('#1d1d22');
  const gold = std('#d4a82a', { metalness: 0.7, roughness: 0.35 });

  const root = new THREE.Group();
  const body = new THREE.Group(); // bobs up and down
  root.add(body);

  body.add(box(0.46, 0.22, 0.3, leather, 0, 0.95, 0)); // hips

  // torso (pivot at the waist)
  const torso = new THREE.Group();
  torso.position.set(0, 1.05, 0);
  body.add(torso);
  torso.add(box(0.56, 0.62, 0.34, armor, 0, 0.31, 0));
  torso.add(box(0.34, 0.66, 0.03, cloth, 0, 0.16, 0.19)); // tabard
  torso.add(box(0.5, 0.06, 0.38, leather, 0, 0.02, 0)); // belt

  // head (pivot at the neck)
  const head = new THREE.Group();
  head.position.set(0, 0.66, 0);
  torso.add(head);
  head.add(box(0.36, 0.38, 0.36, armor, 0, 0.2, 0)); // helmet
  head.add(box(0.3, 0.05, 0.02, dark, 0, 0.22, 0.185)); // visor slit
  head.add(box(0.04, 0.2, 0.02, trim, 0, 0.16, 0.19)); // nose guard
  head.add(box(0.06, 0.16, 0.34, std(o.plumeColor), 0, 0.46, -0.02)); // plume

  // arms (pivot at the shoulder)
  const makeArm = (side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.4, 0.56, 0);
    arm.add(box(0.26, 0.14, 0.28, trim, side * 0.02, 0.02, 0)); // pauldron
    arm.add(box(0.15, 0.4, 0.15, cloth, 0, -0.22, 0));
    arm.add(box(0.17, 0.24, 0.17, trim, 0, -0.5, 0)); // gauntlet
    torso.add(arm);
    return arm;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  if (o.sword) {
    const sw = new THREE.Group();
    sw.position.set(0, -0.64, 0.04);
    sw.rotation.x = 0.35; // blade tilts forward
    sw.add(cyl(0.025, 0.025, 0.18, 6, leather, 0, 0.0, 0));
    sw.add(box(0.26, 0.04, 0.06, gold, 0, 0.1, 0));
    sw.add(box(0.06, 0.8, 0.02, std('#d8dee6', { metalness: 0.75, roughness: 0.3 }), 0, 0.52, 0));
    sw.add(box(0.06, 0.1, 0.02, std('#d8dee6', { metalness: 0.75, roughness: 0.3 }), 0, 0.97, 0)); // tip
    armR.add(sw);
  }
  if (o.shield) {
    const sh = new THREE.Group();
    sh.position.set(-0.14, -0.34, 0.04);
    const disc = cyl(0.3, 0.3, 0.06, 8, std(o.clothColor), 0, 0, 0);
    disc.rotation.z = Math.PI / 2;
    sh.add(disc);
    const rim = cyl(0.32, 0.32, 0.04, 8, trim, -0.015, 0, 0);
    rim.rotation.z = Math.PI / 2;
    sh.add(rim);
    sh.add(box(0.05, 0.22, 0.08, gold, -0.05, 0, 0)); // emblem
    armL.add(sh);
  }

  // legs (pivot at the hip)
  const makeLeg = (side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.14, 0.92, 0);
    leg.add(box(0.2, 0.46, 0.22, cloth, 0, -0.23, 0)); // thigh
    leg.add(box(0.19, 0.4, 0.2, armor, 0, -0.66, 0)); // greave
    leg.add(box(0.22, 0.12, 0.32, leather, 0, -0.86, 0.04)); // boot
    body.add(leg);
    return leg;
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  const states = {
    idle(t, dt, ctx) {
      const b = Math.sin(t * 1.6);
      ctx.move(body, 0, b * 0.008, 0);
      ctx.rot(torso, b * 0.012, 0, 0);
      ctx.rot(head, -b * 0.01, Math.sin(t * 0.5) * 0.08, 0);
      ctx.rot(armL, b * 0.03, 0, 0.04);
      ctx.rot(armR, -b * 0.03, 0, -0.04);
      ctx.rot(legL, 0);
      ctx.rot(legR, 0);
    },
    walk(t, dt, ctx) {
      const w = t * 6;
      const s = Math.sin(w);
      ctx.rot(legL, s * 0.7);
      ctx.rot(legR, -s * 0.7);
      ctx.rot(armL, -s * 0.6);
      ctx.rot(armR, s * 0.3);
      ctx.move(body, 0, Math.abs(Math.cos(w)) * 0.045, 0);
      ctx.rot(torso, 0, s * 0.07, 0);
      ctx.rot(head, 0, -s * 0.05, 0);
    },
    attack(t, dt, ctx) {
      const p = (t % 1.4) / 1.4;
      let a;
      if (p < 0.4) a = -2.5 * easeInOutQuad(p / 0.4); // wind-up
      else if (p < 0.55) a = lerp(-2.5, 0.3, easeInQuad((p - 0.4) / 0.15)); // strike
      else a = lerp(0.3, 0, easeOutQuad((p - 0.55) / 0.45)); // recover
      ctx.rot(armR, a);
      ctx.rot(armL, -0.7, 0, 0.1);
      ctx.rot(torso, 0, -a * 0.12, 0);
      ctx.rot(legL, 0.25);
      ctx.rot(legR, -0.35);
      ctx.move(body, 0, 0, 0);
    },
  };

  return finalize(root, meta, o, states);
}
