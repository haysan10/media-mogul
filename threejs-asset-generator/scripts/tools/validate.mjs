#!/usr/bin/env node
// validate.mjs — check every asset in library/ against the asset contract.
//   npm run validate            all assets
//   node tools/validate.mjs pine-tree rock     only these ids
//   node tools/validate.mjs --strict           warnings fail the run
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { BUDGETS, CATEGORIES, DEFAULT_BUDGET } from '../lib/budgets.js';
import { measure } from '../lib/helpers.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const strict = args.includes('--strict');
const only = args.filter((a) => !a.startsWith('--'));

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.name.endsWith('.js') ? [p] : [];
  });
}

/** order-independent fingerprint of the geometry: triangle count + weighted vertex sum + bounds */
function fingerprint(obj) {
  obj.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  let sum = 0;
  obj.traverse((o) => {
    const pos = o.geometry?.attributes?.position;
    if (!pos || !(o.isMesh || o.isPoints)) return;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      sum += v.x + v.y * 3 + v.z * 7;
    }
  });
  const m = measure(obj);
  return `${m.triangles}|${sum.toFixed(3)}|${m.size.map((n) => n.toFixed(4)).join(',')}`;
}

const finite = (arr) => arr.every((n) => Number.isFinite(n));
let errors = 0;
let warnings = 0;
let checked = 0;
const ids = new Set();

for (const file of walk(path.join(root, 'library')).sort()) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const errs = [];
  const warns = [];
  let mod;
  let label = rel;
  try {
    mod = await import(pathToFileURL(file).href);
  } catch (e) {
    console.log(`✗ ${rel}\n    import failed: ${e.message}`);
    errors++;
    continue;
  }
  const { meta, create } = mod;
  if (only.length && !only.includes(meta?.id)) continue;
  checked++;

  if (!meta || typeof meta !== 'object') errs.push('missing `export const meta`');
  if (typeof create !== 'function') errs.push('missing `export function create(options)`');
  if (meta) {
    label = `${meta.id ?? '?'}  (${rel})`;
    if (!meta.id || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(meta.id)) errs.push('meta.id must be kebab-case');
    if (ids.has(meta.id)) errs.push(`duplicate meta.id "${meta.id}"`);
    ids.add(meta.id);
    if (!meta.name) errs.push('meta.name missing');
    if (!CATEGORIES.includes(meta.category)) errs.push(`meta.category must be one of: ${CATEGORIES.join(', ')}`);
    if (!rel.includes(`/${meta.category}/`)) warns.push(`file is not inside library/${meta.category}/`);
    if (path.basename(file, '.js') !== meta.id) warns.push('file name should equal meta.id');
    if (!meta.defaults || typeof meta.defaults !== 'object') errs.push('meta.defaults missing');
    if (!meta.options) warns.push('meta.options missing (viewer will have no controls)');
    if (!meta.description) warns.push('meta.description missing');
    if (meta.options && meta.defaults) {
      for (const k of Object.keys(meta.options)) if (!(k in meta.defaults)) warns.push(`option "${k}" has no default`);
    }
  }

  if (!errs.length) {
    let obj;
    try {
      obj = create({});
      const budget = meta.triangleBudget ?? BUDGETS[meta.category] ?? DEFAULT_BUDGET;
      if (!(obj instanceof THREE.Object3D)) throw new Error('create() must return a THREE.Object3D (use THREE.Group)');
      const m = measure(obj);
      if (!finite([...m.size, ...m.min, ...m.max])) errs.push('bounding box contains NaN/Infinity');
      if (m.triangles === 0 && m.points === 0) errs.push('asset has no geometry');
      if (m.triangles > budget) errs.push(`${m.triangles} triangles exceeds budget ${budget}`);
      const maxDim = Math.max(...m.size);
      if (maxDim < 0.02 || maxDim > 100) errs.push(`size ${maxDim.toFixed(2)} m is implausible (1 unit = 1 metre)`);
      if ((meta.pivot ?? 'base') === 'base' && Math.abs(m.min[1]) > 0.02) errs.push(`pivot not at base: lowest point is y=${m.min[1].toFixed(3)} (use finalize())`);
      const cx = (m.min[0] + m.max[0]) / 2;
      const cz = (m.min[2] + m.max[2]) / 2;
      if ((meta.centerXZ ?? true) && (Math.abs(cx) > 0.05 * maxDim + 0.02 || Math.abs(cz) > 0.05 * maxDim + 0.02)) warns.push('asset is not centred on X/Z');
      if (typeof obj.userData.dispose !== 'function') errs.push('userData.dispose missing (use finalize())');
      if (!obj.name) warns.push('root has no name (use finalize())');

      // determinism
      const again = create({});
      if (fingerprint(obj) !== fingerprint(again)) errs.push('NOT deterministic: two create() calls with the same options differ (Math.random()? Date.now()?)');
      again.userData.dispose?.();

      // seed actually changes something
      if (meta.options?.seed) {
        const other = create({ seed: (meta.defaults?.seed ?? 1) + 7919 });
        if (fingerprint(obj) === fingerprint(other)) warns.push('`seed` option has no visible effect');
        other.userData.dispose?.();
      }

      // animation
      if (obj.userData.update) {
        const states = obj.userData.states ?? [null];
        for (const s of states) {
          if (s) obj.userData.setState(s);
          for (const t of [0, 0.5, 1.7, 12.3]) obj.userData.update(t, 0.016);
        }
        if (!finite(measure(obj).size)) errs.push('animation produced NaN');
        if (states.length && states[0] !== null && typeof obj.userData.setState !== 'function') errs.push('states defined without setState');
      }

      // option extremes
      for (const [key, spec] of Object.entries(meta.options ?? {})) {
        const values = spec.type === 'number' ? [spec.min, spec.max] : spec.type === 'boolean' ? [!meta.defaults[key]] : [];
        for (const val of values) {
          if (val === undefined) continue;
          try {
            const v = create({ [key]: val });
            const vm = measure(v);
            if (!finite(vm.size)) errs.push(`option ${key}=${val} produced NaN`);
            else if (vm.triangles > budget * 1.5) warns.push(`option ${key}=${val} → ${vm.triangles} tris (budget ${budget})`);
            v.userData.dispose?.();
          } catch (e) {
            errs.push(`option ${key}=${val} threw: ${e.message}`);
          }
        }
      }

      if (typeof obj.userData.dispose === 'function') obj.userData.dispose();
      if (!errs.length) {
        label += `   ${m.triangles} tris · ${m.size.map((n) => n.toFixed(2)).join('×')} m${m.points ? ` · ${m.points} pts` : ''}${obj.userData.states ? ` · states: ${obj.userData.states.join('/')}` : ''}`;
      }
    } catch (e) {
      errs.push(`create() threw: ${e.message}`);
    }
  }

  if (errs.length) {
    errors += errs.length;
    console.log(`✗ ${label}`);
  } else if (warns.length) {
    console.log(`⚠ ${label}`);
  } else {
    console.log(`✓ ${label}`);
  }
  errs.forEach((e) => console.log(`    ✗ ${e}`));
  warns.forEach((w) => {
    warnings++;
    console.log(`    ⚠ ${w}`);
  });
}

console.log(`\n${checked} asset(s) checked — ${errors} error(s), ${warnings} warning(s)`);
if (!checked) console.log('Nothing to validate. Add assets with: npm run new -- <category> <id>');
process.exit(errors || (strict && warnings) ? 1 : 0);
