// Campfire — logs, stone ring, additive flame + ember particles and a flickering light.
// Particles are STATELESS (position = f(time)), so the effect is deterministic and needs no history.
import * as THREE from 'three';
import { createRng } from '../../lib/rng.js';
import { std, cyl, jitter, finalize } from '../../lib/helpers.js';

export const meta = {
  id: 'campfire',
  name: 'Campfire',
  category: 'vfx',
  tags: ['fire', 'vfx', 'particles', 'light', 'camp', 'animated'],
  description: 'Campfire with logs, stones, particle flames, embers and a flickering point light. States: burning, out.',
  triangleBudget: 900,
  defaultState: 'burning',
  defaults: { seed: 1, size: 1, logs: 5, flames: 90, intensity: 1, scale: 1 },
  options: {
    seed: { type: 'number', min: 0, max: 9999, step: 1 },
    size: { type: 'number', min: 0.5, max: 2, step: 0.05 },
    logs: { type: 'number', min: 3, max: 8, step: 1 },
    flames: { type: 'number', min: 20, max: 240, step: 10 },
    intensity: { type: 'number', min: 0, max: 3, step: 0.1 },
    scale: { type: 'number', min: 0.2, max: 3, step: 0.05 },
  },
};

const lerp = (a, b, t) => a + (b - a) * t;

export function create(options = {}) {
  const o = { ...meta.defaults, ...options };
  const rng = createRng(o.seed);
  const root = new THREE.Group();
  const S = o.size;

  // stones
  const stoneMat = std('#7a7b80');
  const stones = 9;
  for (let i = 0; i < stones; i++) {
    const a = (i / stones) * Math.PI * 2 + rng.range(-0.1, 0.1);
    const s = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(0.15 * S, 0), rng, 0.02 * S), stoneMat);
    s.position.set(Math.cos(a) * 0.55 * S, 0.08 * S, Math.sin(a) * 0.55 * S);
    s.scale.set(rng.range(0.9, 1.3), rng.range(0.7, 1), rng.range(0.9, 1.3));
    s.rotation.y = rng.range(0, 3);
    root.add(s);
  }

  // logs leaning toward the centre
  const logMat = std('#5b3a22');
  const charMat = std('#2a1c14');
  const logs = Math.round(o.logs);
  for (let i = 0; i < logs; i++) {
    const a = (i / logs) * Math.PI * 2 + rng.range(-0.15, 0.15);
    const holder = new THREE.Group();
    holder.rotation.y = a;
    const log = cyl(0.06 * S, 0.07 * S, 0.85 * S, 6, i % 2 ? logMat : charMat, 0, 0, 0);
    log.rotation.z = Math.PI / 2 - 0.5; // lean inward
    log.position.set(0.3 * S, 0.2 * S, 0);
    holder.add(log);
    root.add(holder);
  }

  // flame particles (additive => dark colours vanish, so fading = going dark)
  const N = Math.round(o.flames);
  const flamePos = new Float32Array(N * 3);
  const flameCol = new Float32Array(N * 3);
  const fPhase = new Float32Array(N);
  const fAng = new Float32Array(N);
  const fSpeed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    fPhase[i] = rng.next();
    fAng[i] = rng.range(0, Math.PI * 2);
    fSpeed[i] = rng.range(0.7, 1.3);
  }
  const flameGeo = new THREE.BufferGeometry();
  flameGeo.setAttribute('position', new THREE.BufferAttribute(flamePos, 3));
  flameGeo.setAttribute('color', new THREE.BufferAttribute(flameCol, 3));
  const flames = new THREE.Points(
    flameGeo,
    new THREE.PointsMaterial({
      size: 0.26 * S, vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }),
  );
  flames.frustumCulled = false;
  root.add(flames);

  // embers
  const M = Math.max(8, Math.round(N / 4));
  const emberPos = new Float32Array(M * 3);
  const ePhase = new Float32Array(M);
  const eAng = new Float32Array(M);
  for (let i = 0; i < M; i++) {
    ePhase[i] = rng.next();
    eAng[i] = rng.range(0, Math.PI * 2);
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const embers = new THREE.Points(
    emberGeo,
    new THREE.PointsMaterial({
      size: 0.06 * S, color: '#ffb347', transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }),
  );
  embers.frustumCulled = false;
  root.add(embers);

  const light = new THREE.PointLight('#ff9a3c', 12 * o.intensity, 10 * S, 2);
  light.position.set(0, 0.7 * S, 0);
  root.add(light);

  // colour ramp: pale yellow -> orange -> deep red
  const c0 = [1, 0.89, 0.48];
  const c1 = [1, 0.54, 0.12];
  const c2 = [0.48, 0.11, 0.04];

  function simulate(t) {
    for (let i = 0; i < N; i++) {
      const age = (t * 0.9 * fSpeed[i] + fPhase[i]) % 1;
      const r = (1 - age) * 0.24 * S;
      const a = fAng[i] + t * 0.8;
      flamePos[i * 3] = Math.cos(a) * r + Math.sin(t * 3 + i) * 0.03 * S * age;
      flamePos[i * 3 + 1] = 0.18 * S + age * 1.15 * S;
      flamePos[i * 3 + 2] = Math.sin(a) * r;
      const k = age < 0.5 ? age * 2 : (age - 0.5) * 2;
      const from = age < 0.5 ? c0 : c1;
      const to = age < 0.5 ? c1 : c2;
      const fade = Math.pow(1 - age, 0.6);
      flameCol[i * 3] = lerp(from[0], to[0], k) * fade;
      flameCol[i * 3 + 1] = lerp(from[1], to[1], k) * fade;
      flameCol[i * 3 + 2] = lerp(from[2], to[2], k) * fade;
    }
    for (let i = 0; i < M; i++) {
      const age = (t * 0.35 + ePhase[i]) % 1;
      const r = 0.1 * S + age * 0.7 * S;
      emberPos[i * 3] = Math.cos(eAng[i] + age * 2) * r;
      emberPos[i * 3 + 1] = 0.3 * S + age * 2.4 * S;
      emberPos[i * 3 + 2] = Math.sin(eAng[i] + age * 2) * r;
    }
    flameGeo.attributes.position.needsUpdate = true;
    flameGeo.attributes.color.needsUpdate = true;
    emberGeo.attributes.position.needsUpdate = true;
  }
  simulate(0.37); // fill buffers so the bounding box is correct before finalize()

  const states = {
    burning(t) {
      flames.visible = embers.visible = true;
      simulate(t);
      light.intensity = 12 * o.intensity * (0.85 + 0.1 * Math.sin(t * 13) + 0.05 * Math.sin(t * 29 + 1));
    },
    out() {
      flames.visible = embers.visible = false;
      light.intensity = 0;
    },
  };
  return finalize(root, meta, o, states);
}
