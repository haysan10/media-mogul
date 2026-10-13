// helpers.js — the building blocks every asset uses.
// Import what you need:  import { std, box, cyl, jitter, finalize } from '../../lib/helpers.js';
import * as THREE from 'three';
import { attachAnimator } from './animation.js';
export { BUDGETS, CATEGORIES, DEFAULT_BUDGET } from './budgets.js';

/* ------------------------------------------------------------------ math */
export const clamp = THREE.MathUtils.clamp;
export const lerp = THREE.MathUtils.lerp;
export const smoothstep = THREE.MathUtils.smoothstep;
export const TAU = Math.PI * 2;

/* ---------------------------------------------------------------- colour */
/** Shift a colour in HSL space. tint('#2f6b3a', { l: 0.1 }) = lighter. Returns THREE.Color. */
export function tint(color, { h = 0, s = 0, l = 0 } = {}) {
  return new THREE.Color(color).offsetHSL(h, s, l);
}

/* -------------------------------------------------------------- materials */
/** Default low-poly material: flat shaded, matte. Pass THREE.MeshStandardMaterial params to override. */
export function std(color = '#888888', params = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...params });
}

/** Self-lit material for lamps, windows, gems, magic. */
export function glow(color = '#ffd27a', intensity = 1.2, params = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.6,
    flatShading: true,
    ...params,
  });
}

/* ------------------------------------------------------------- primitives
   Every primitive returns a Mesh positioned at (x, y, z) with shadows enabled. */
const mesh = (geometry, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

export const box = (w, h, d, material, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z);
export const cyl = (rTop, rBottom, h, segments, material, x, y, z) =>
  mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), material, x, y, z);
export const cone = (r, h, segments, material, x, y, z) => mesh(new THREE.ConeGeometry(r, h, segments), material, x, y, z);
export const sphere = (r, segments, material, x, y, z) =>
  mesh(new THREE.SphereGeometry(r, segments, Math.max(3, Math.round(segments * 0.75))), material, x, y, z);
export const ico = (r, detail, material, x, y, z) => mesh(new THREE.IcosahedronGeometry(r, detail), material, x, y, z);
/** wrap any geometry in a shadow-enabled mesh */
export const meshOf = mesh;

/* ------------------------------------------------------------- geometry fx */
/**
 * Randomly displace vertices for a hand-made look. Vertices sharing a position move
 * together, so the mesh never tears. Mutates and returns the geometry.
 */
export function jitter(geometry, rng, amount = 0.1) {
  const pos = geometry.attributes.position;
  const cache = new Map();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    let o = cache.get(key);
    if (!o) {
      o = [(rng.next() - 0.5) * 2 * amount, (rng.next() - 0.5) * 2 * amount, (rng.next() - 0.5) * 2 * amount];
      cache.set(key, o);
    }
    pos.setXYZ(i, x + o[0], y + o[1], z + o[2]);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Give every triangle its own flat colour (classic low-poly look, no textures).
 * fn({ normal, centroid, index }) => THREE.Color | string. Returns a NON-indexed geometry;
 * use it with a material that has vertexColors: true.
 */
export function paintFaces(geometry, fn) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.computeVertexNormals();
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  const e = new THREE.Vector3();
  const cen = new THREE.Vector3();
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    n.subVectors(b, a).cross(e.subVectors(c, a)).normalize();
    cen.copy(a).add(b).add(c).divideScalar(3);
    const col = tmp.set(fn({ normal: n, centroid: cen, index: i / 3 }));
    for (let k = 0; k < 3; k++) {
      colors[(i + k) * 3] = col.r;
      colors[(i + k) * 3 + 1] = col.g;
      colors[(i + k) * 3 + 2] = col.b;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

/* ----------------------------------------------------------------- stats */
/** Triangles, size and bounds of an object (world space). Used by the viewer and validator. */
export function measure(root) {
  root.updateMatrixWorld(true);
  let triangles = 0;
  let vertices = 0;
  let meshes = 0;
  let points = 0;
  root.traverse((o) => {
    if (o.isMesh && o.geometry) {
      meshes++;
      const g = o.geometry;
      const tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
      triangles += tris * (o.isInstancedMesh ? o.count : 1);
      vertices += g.attributes.position.count;
    } else if (o.isPoints && o.geometry) {
      points += o.geometry.attributes.position.count;
    }
  });
  const box3 = new THREE.Box3().setFromObject(root);
  const size = box3.getSize(new THREE.Vector3());
  return {
    triangles: Math.round(triangles),
    vertices,
    meshes,
    points,
    size: [size.x, size.y, size.z],
    min: box3.min.toArray(),
    max: box3.max.toArray(),
  };
}

/** Free every geometry, material and texture under root. */
export function disposeObject(root) {
  const geos = new Set();
  const mats = new Set();
  root.traverse((o) => {
    if (o.geometry) geos.add(o.geometry);
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m));
  });
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => {
    for (const k of Object.keys(m)) if (m[k] && m[k].isTexture) m[k].dispose();
    m.dispose();
  });
}

/* -------------------------------------------------------------- finalize
   Call as the LAST line of create(). It:
     - moves the pivot (origin) to the base-centre (meta.pivot = 'base', default)
       or the geometric centre (meta.pivot = 'center'); XZ centring can be disabled
       with meta.centerXZ = false
     - applies options.scale
     - enables shadows on every mesh
     - writes root.name and root.userData.{meta, stats, dispose}
     - attaches the animator when `states` is given (see animation.js)           */
export function finalize(root, meta = {}, options = {}, states = null, animOpts = {}) {
  const pivot = meta.pivot ?? 'base';
  const centerXZ = meta.centerXZ ?? true;

  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  if (!bounds.isEmpty()) {
    const c = bounds.getCenter(new THREE.Vector3());
    const shift = new THREE.Vector3(
      centerXZ ? -c.x : 0,
      pivot === 'center' ? -c.y : -bounds.min.y,
      centerXZ ? -c.z : 0,
    );
    for (const child of root.children) child.position.add(shift);
  }

  const scale = Number(options.scale ?? 1);
  if (scale !== 1 && scale > 0) root.scale.setScalar(scale);

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  root.name = meta.id ?? root.name;
  root.userData.meta = { id: meta.id, name: meta.name, category: meta.category };
  root.userData.dispose = () => {
    if (root.userData._animatorCleanup) root.userData._animatorCleanup();
    disposeObject(root);
  };
  if (states) attachAnimator(root, states, options.state ?? meta.defaultState, animOpts);
  root.userData.stats = measure(root);
  return root;
}
