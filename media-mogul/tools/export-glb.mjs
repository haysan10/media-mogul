#!/usr/bin/env node
// export-glb.mjs — export assets to .glb for Unity / Godot / Unreal / Blender / any glTF viewer.
//   npm run export                     all assets, default options
//   npm run export -- pine-tree rock   only these ids
//   npm run export -- --out dist --ascii
//   npm run export -- knight --options '{"armorColor":"#335588"}'
//
// Node has no <canvas>, so procedural CanvasTextures are skipped here (flat colours + vertex colours are kept).
// For the textured version, use the "Export GLB" button in the viewer (runs in the browser).
// Animations are procedural code, not clips, so the GLB contains the rest pose.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { registry } from '../registry.js';

// minimal FileReader so GLTFExporter runs in Node
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((r) => {
      this.result = r;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((r) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(r).toString('base64')}`;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    });
  }
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv.splice(i, 2)[1] : undefined;
};
const outDir = path.resolve(root, flag('--out') ?? 'exports');
const extra = JSON.parse(flag('--options') ?? '{}');
const ascii = argv.includes('--ascii');
const ids = argv.filter((a) => !a.startsWith('--'));

const list = ids.length ? registry.filter((a) => ids.includes(a.meta.id)) : registry;
if (!list.length) {
  console.error('No matching assets. Known ids: ' + registry.map((a) => a.meta.id).join(', '));
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

for (const { meta, create } of list) {
  const obj = create({ ...extra });
  const result = await new GLTFExporter().parseAsync(obj, { binary: !ascii, onlyVisible: true });
  const file = path.join(outDir, `${meta.id}.${ascii ? 'gltf' : 'glb'}`);
  if (ascii) fs.writeFileSync(file, JSON.stringify(result));
  else fs.writeFileSync(file, Buffer.from(result));
  console.log(`✓ ${path.relative(root, file)}  (${(fs.statSync(file).size / 1024).toFixed(1)} KB)`);
  obj.userData.dispose?.();
}
