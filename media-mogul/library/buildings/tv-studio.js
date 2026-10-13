// Studio TV — Era 4: Studio penyiaran televisi 1980-an
// Studio kedap suara berpanel akustik, ruang kendali siaran, parabola satelit berputar, dan lampu ON AIR.
import * as THREE from 'three';
import { createRng } from '../../lib/rng.js';
import { checkerTexture, speckleTexture } from '../../lib/textures.js';
import { std, glow, box, cyl, tint, finalize } from '../../lib/helpers.js';

export const meta = {
  id: 'tv-studio',
  name: 'Studio TV',
  category: 'buildings',
  tags: ['era-4', 'tv', 'studio', 'broadcast'],
  description: 'Studio televisi berpanel akustik dengan antena parabola satelit berputar dan lampu ON AIR.',
  triangleBudget: 2400,
  defaultState: 'idle',
  defaults: {
    seed: 1,
    level: 1,
    studioColor: '#3d4451',
    scale: 1,
  },
  options: {
    seed: { type: 'number', min: 0, max: 9999, step: 1 },
    level: { type: 'number', min: 1, max: 5, step: 1 },
    studioColor: { type: 'color' },
    scale: { type: 'number', min: 0.5, max: 2, step: 0.05 },
  },
};

export function create(options = {}) {
  const o = { ...meta.defaults, ...options };
  const rng = createRng(o.seed);
  const root = new THREE.Group();

  const lvl = Math.max(1, Math.min(5, Math.round(o.level)));
  const foundH = 0.35;
  const sW = 4.8 + (lvl - 1) * 0.4;
  const sD = 4.8 + (lvl - 1) * 0.4;
  const sH = 2.8 + (lvl - 1) * 0.2;

  // Materials
  const concreteMat = std('#4f5259', { map: speckleTexture(rng, { size: 64 }) });
  const panelMat = std(o.studioColor, { map: checkerTexture({ cells: 6, a: 240, b: 200 }) });
  const trimMat = std(tint(o.studioColor, { l: -0.15 }));
  const dishMat = std('#d8dde6', { metalness: 0.4, roughness: 0.4 });
  const metalMat = std('#2b2f36', { metalness: 0.7, roughness: 0.3 });
  const onAirMat = glow('#ff2233', 1.5);
  const glassMat = std('#304455', { roughness: 0.2, metalness: 0.4 });

  // Concrete Foundation
  root.add(box(sW + 0.3, foundH, sD + 0.3, concreteMat, 0, foundH / 2, 0));

  // Soundstage Main Cube
  root.add(box(sW, sH, sD, panelMat, 0, foundH + sH / 2, 0));

  // Parapet Wall around roof
  const parapetH = 0.4;
  root.add(box(sW, parapetH, 0.12, trimMat, 0, foundH + sH + parapetH / 2, sD / 2 - 0.06));
  root.add(box(sW, parapetH, 0.12, trimMat, 0, foundH + sH + parapetH / 2, -sD / 2 + 0.06));
  root.add(box(0.12, parapetH, sD - 0.24, trimMat, sW / 2 - 0.06, foundH + sH + parapetH / 2, 0));
  root.add(box(0.12, parapetH, sD - 0.24, trimMat, -sW / 2 + 0.06, foundH + sH + parapetH / 2, 0));

  // Entrance Lobby (+Z)
  const lobbyW = 2.0;
  const lobbyH = 1.8;
  const lobbyD = 0.9;
  const lobbyX = rng.range(-0.4, 0.4);
  root.add(box(lobbyW, lobbyH, lobbyD, trimMat, lobbyX, foundH + lobbyH / 2, sD / 2 + lobbyD / 2));
  // Double Glass Doors
  root.add(box(1.2, 1.4, 0.06, glassMat, lobbyX, foundH + 0.7, sD / 2 + lobbyD + 0.02));
  // Door frames
  root.add(box(1.3, 1.5, 0.04, metalMat, lobbyX, foundH + 0.75, sD / 2 + lobbyD + 0.01));

  // Glowing "ON AIR" Sign Box over lobby
  const signBox = box(0.9, 0.35, 0.14, metalMat, lobbyX, foundH + lobbyH + 0.22, sD / 2 + lobbyD / 2);
  const onAirLight = box(0.75, 0.22, 0.04, onAirMat, lobbyX, foundH + lobbyH + 0.22, sD / 2 + lobbyD / 2 + 0.08);
  onAirLight.name = 'on-air-sign';
  root.add(signBox);
  root.add(onAirLight);

  // Industrial HVAC Rooftop Chiller Unit
  root.add(box(1.4, 0.8, 1.1, metalMat, -sW * 0.25, foundH + sH + 0.4, -sD * 0.2));

  // Satellite Dish Mount & Dish Group (name: dish)
  const dishMountX = sW * 0.22;
  const dishMountZ = sD * 0.15;
  const dishBaseY = foundH + sH;

  // Base stand
  root.add(box(0.8, 0.2, 0.8, metalMat, dishMountX, dishBaseY + 0.1, dishMountZ));
  root.add(cyl(0.08, 0.1, 1.2, 6, metalMat, dishMountX, dishBaseY + 0.7, dishMountZ));

  // Rotating Dish Holder
  const dishHolder = new THREE.Group();
  dishHolder.name = 'dish';
  dishHolder.position.set(dishMountX, dishBaseY + 1.3, dishMountZ);

  // Parabolic Bowl: half SphereGeometry (phiLength = PI, thetaLength = PI/2.2)
  const bowlGeo = new THREE.SphereGeometry(0.85, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.6);
  // Invert/turn so open face points forward
  const bowl = new THREE.Mesh(bowlGeo, dishMat);
  bowl.rotation.x = 0.55; // tilted upwards to sky
  bowl.castShadow = true;
  bowl.receiveShadow = true;
  dishHolder.add(bowl);

  // Dish receiver feed horn tip
  const feedArm = cyl(0.03, 0.03, 0.65, 6, metalMat, 0, 0.35, -0.3);
  feedArm.rotation.x = 0.55;
  dishHolder.add(feedArm);

  const horn = cyl(0.08, 0.03, 0.14, 6, metalMat, 0, 0.6, -0.55);
  horn.rotation.x = 0.55;
  dishHolder.add(horn);

  root.add(dishHolder);

  // Secondary antenna mast for higher levels
  if (lvl >= 3) {
    const mast = cyl(0.04, 0.06, 1.8, 6, metalMat, -sW * 0.28, foundH + sH + 0.9, sD * 0.25);
    root.add(mast);
    const topSphere = cyl(0.12, 0.12, 0.08, 6, glow('#ffaa22', 1.0), -sW * 0.28, foundH + sH + 1.8, sD * 0.25);
    root.add(topSphere);
  }

  const states = {
    idle: (t, dt, ctx) => {
      ctx.rot(dishHolder, 0, t * 0.4, 0);
      onAirMat.emissiveIntensity = 1.0 + 0.6 * Math.sin(t * 4);
    },
  };

  return finalize(root, meta, o, states);
}
