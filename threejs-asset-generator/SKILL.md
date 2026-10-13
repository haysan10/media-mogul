---
name: threejs-asset-generator
description: Generate complete, game-ready 3D game assets as procedural three.js code — characters, enemies, weapons, props, trees, rocks, buildings, vehicles, terrain, VFX/particles, pickups and whole asset packs — with a live browser viewer, automatic validation (poly budget, pivot, determinism) and GLB export. Use this skill whenever the user wants game assets, 3D models, low-poly art, props, sprites-as-3D, environment or level pieces, an "asset pack", or procedural/generated art for a three.js, web or indie game, even if they never say "three.js" or "procedural". Also trigger on Indonesian requests such as "buat asset game", "bikin aset 3D", "generate model karakter/pohon/senjata", "aset low poly", "asset untuk game browser", or "export ke GLB".
compatibility: Node.js >= 18 and npm (installs three@0.160.0). Viewer needs a browser and internet access for the three.js CDN.
---

# Three.js Game Asset Generator

Turns a text request ("a low-poly knight", "a forest pack with 5 trees and 3 rocks") into **runnable three.js modules** plus a viewer and optional GLB files. Everything is generated as code — no image files, no binary models written by hand.

## What the user receives
```
<project>/
├── library/<category>/<id>.js   one module per asset:  export meta + create(options) => THREE.Group
├── registry.js (+ .json)        index of all assets:   create('knight', { armorColor: '#335588' })
├── viewer/index.html            live preview: orbit, sliders for every option, wireframe, PNG, GLB
├── exports/*.glb                (when requested) via `npm run export`
├── lib/                         seeded RNG, helpers, textures, noise, animation framework
└── tools/                       new / validate / export / serve scripts
```
Be honest about limits: organic, photoreal, or heavily rigged models are not realistic as code. Stylised low-poly, blocky and faceted assets are. If the user asks for something outside that, say so in one sentence and deliver the closest stylised version.

## Workflow

### 1. Understand the request (don't over-ask)
Infer from the prompt; ask **at most one** short question, and only if essential. Otherwise state assumptions in the final summary.
Settle: asset list · category per asset · style/palette (default: stylised low-poly, flat shaded) · whether animation is needed · export needed? (GLB) · existing project folder?

### 2. Set up the project (once)
If the user has no project yet:
```bash
node <skill-dir>/scripts/init-project.mjs ./game-assets --examples   # examples optional; omit for a clean library
cd game-assets && npm install
```
Re-running `init-project.mjs` on an existing project upgrades `lib/`, `viewer/`, `tools/` and never touches `library/`.
If a project already exists, work inside it and do not re-init unless asked to upgrade.

### 3. Read what you need (progressive disclosure)
Always read `references/style-guide.md` first. Then only the files relevant to the request:
| If the asset involves… | Read |
|---|---|
| any asset | `references/style-guide.md` |
| shapes, which primitive to use, per-type recipes | `references/geometry-recipes.md` |
| colours, vertex colours, textures, toon, glow | `references/materials-textures.md` |
| movement, states, particles | `references/animation.md` |
| fire, water, sky, terrain, weather, dungeons | `references/vfx-environment.md` |
| using in a game, GLB, performance, errors | `references/integration-export.md` |
Then open the **closest example** in `assets/examples/` (or in the project's `library/`) and imitate its structure: `pine-tree` (organic + sway), `rock` (vertex colours), `house` (extrude + textures), `knight` (rig + 3 animations), `sword` (extrude blade), `treasure-chest` (hinge + damping), `campfire` (particles + light), `terrain-chunk` (noise terrain).

### 4. Scaffold, then write each asset
```bash
npm run new -- <category> <id> "Display Name"    # e.g. npm run new -- props magic-potion "Magic Potion"
```
Categories: `characters environment props buildings terrain vehicles vfx ui`. Edit the generated `library/<category>/<id>.js`.
For a pack, create every asset first with a shared palette, then iterate.

### 5. Validate and fix until clean
```bash
npm run validate          # rebuilds registry, then checks every asset
```
Fix every ✗ (errors) and, preferably, ⚠ (warnings). The validator checks: contract, kebab-case id, category, triangle budget, pivot at base, size plausibility, X/Z centring, determinism, seed effect, `dispose()`, animation without NaN, option extremes. Do not report an asset as done while validation fails.

### 6. Preview and deliver
- Tell the user: `npm run serve` → open `http://localhost:5173/viewer/` (must be served over http, **not** `file://`).
- GLB: `npm run export` (all) or `npm run export -- knight rock` → `exports/`. Textured GLB: the viewer's **⬇ GLB** button.
- If a file-delivery tool is available (e.g. `present_files`), zip the project **without `node_modules`** and present it:
  `cd <parent> && zip -r game-assets.zip game-assets -x "game-assets/node_modules/*"`
- Final message (short): list the assets with triangle count and states, how to run the viewer, how to use one in code (3 lines), and any assumptions or limits.

## The asset contract (non-negotiable)
```js
export const meta = { id, name, category, tags, description, triangleBudget?, pivot?, defaultState?,
                      defaults: { seed, scale, ... }, options: { key: { type, min, max, step } ... } };
export function create(options = {}) { ...; return finalize(root, meta, o, states?); }
```
1. **Units**: 1 unit = 1 metre · Y up · front = +Z · origin = base centre (`finalize` does the shifting).
2. **Deterministic**: `createRng(o.seed)` only. Never `Math.random()`, `Date.now()`, `performance.now()`.
3. **No external files**: no images, fonts, models, `fetch`. Textures are procedural and optional (`null` in Node).
4. **Always end with `finalize(root, meta, o, states)`** — pivot, scale, shadows, stats, `dispose()`, animator.
5. **Options**: every key in `meta.options` also exists in `meta.defaults`. Types: `number` (min,max,step), `color`, `boolean`, `select` (values). Include `seed` only if randomness exists, and `scale` always.
6. **Budget**: stay under the category triangle budget; reuse one material per colour.
7. **Animation** via states `(t, dt, ctx)` using `ctx.rot / ctx.move` — never mutate transforms directly. Characters need `idle` + `walk`.
8. **Imports**: `import * as THREE from 'three'` and relative `../../lib/*.js`. Nothing else.

## lib cheat-sheet (no need to read the source)
```js
import { createRng } from '../../lib/rng.js';          // rng.next() .range(a,b) .int(a,b) .pick(arr) .chance(p) .sign() .gauss() .fork(label)
import { createNoise2D } from '../../lib/noise.js';    // { noise2(x,y), fbm(x,y,{octaves,gain,lacunarity}) }  → [-1,1]
import { easeInOutQuad, damp, cycle, pingPong } from '../../lib/animation.js';
import { speckleTexture, planksTexture, checkerTexture, stripesTexture, canvasTexture, toonRamp } from '../../lib/textures.js';
import {
  std, glow,                         // std(color, params) flat-shaded standard material · glow(color, intensity)
  box, cyl, cone, sphere, ico,       // box(w,h,d,mat,x,y,z) cyl(rTop,rBot,h,seg,mat,x,y,z) cone(r,h,seg,mat,x,y,z) sphere(r,seg,mat,x,y,z) ico(r,detail,mat,x,y,z)
  meshOf,                            // meshOf(geometry, material, x, y, z) → shadow-enabled Mesh
  jitter, paintFaces,                // jitter(geo, rng, amount) · paintFaces(geo, ({normal,centroid,index}) => colour) → non-indexed geo; use vertexColors: true
  tint, lerp, clamp, smoothstep,     // tint(color, {h,s,l}) → THREE.Color
  measure, disposeObject, finalize,
} from '../../lib/helpers.js';
```

## Quality bar (check before saying "done")
- Strong **silhouette**; chunky, slightly exaggerated proportions; ≤ 5 base hues + 1 accent.
- Imperfection: `jitter` organic shapes, vary rotation/scale of repeated parts.
- Details on top/front, contrasting trim colour on edges, lighter tops / darker bottoms.
- Named child groups for anything a game would grab (`'door'`, `'lid'`, `'hand-right'`).
- Variants through options instead of copy-pasted assets.
- A pack shares palette, proportions and detail level.

## Common mistakes
- Forgetting `finalize()` → pivot/dispose errors.
- Using `Math.random()` for "just a little variation".
- Dark `canvasTexture` × dark colour → black. Keep textures near-white.
- Mutating `rotation` in `update` instead of `ctx.rot`.
- Opening `viewer/index.html` by double-click (ES modules need http).
- Putting `node_modules` in the delivered zip.
- Spheres with 32 segments "to look smooth" — this skill's look is faceted.
