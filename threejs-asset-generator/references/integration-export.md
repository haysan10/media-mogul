# Using the assets in a game, exporting, performance, troubleshooting

## Contents
- Use in a three.js game
- Export to GLB
- Other engines
- Performance
- Troubleshooting

## Use in a three.js game
Copy `lib/`, `library/`, `registry.js` into the game (or publish the folder as a package).
```js
import * as THREE from 'three';
import { create, registry } from './registry.js';

const tree = create('pine-tree', { seed: 7, height: 8, snow: true });
tree.position.set(10, 0, -4);          // origin is the base: y = ground height
scene.add(tree);

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  for (const a of animated) a.userData.update(clock.elapsedTime, dt);
  renderer.render(scene, camera);
});

// free memory when removing
scene.remove(tree); tree.userData.dispose();
```
- Each `create()` call builds **new** geometry/materials. For many copies use `tree.clone()` (shares geometry/materials) or `InstancedMesh`; dispose the original only when all clones are gone.
- Browse all assets: `registry.forEach(({ meta }) => …)`; filter by `meta.category` or `meta.tags`.
- Lights inside assets (campfire) add to the scene's light count — budget for them.
- three version: the project pins `three@0.160.0`; newer versions usually work, but re-run `npm run validate` after upgrading and watch for removed APIs (e.g. `CapsuleGeometry` needs ≥ r142; `Geometry` was removed long ago).

## Export to GLB
| Where | Command | Textures | Use when |
|---|---|---|---|
| Browser viewer | **⬇ GLB** button | ✓ included | you want canvas textures kept |
| Node | `npm run export` / `npm run export -- knight rock` | ✗ (no canvas) | batch/CI exports, flat-colour & vertex-colour assets |
| Options | `npm run export -- knight --options '{"armorColor":"#335588"}'` | | export a variant |

- GLB has **no procedural animation**; it contains the rest pose.
- `ShaderMaterial` is not exported — give shader assets a plain-material fallback.
- Output goes to `exports/`. Scale: 1 unit = 1 m, Y-up, +Z front; glTF is Y-up, +Z front → most engines import 1:1.

## Other engines
- **Godot 4 / Unity / Unreal / Blender**: import the `.glb` (Unity needs a glTF package such as *glTFast*; Blender: File ▸ Import ▸ glTF).
- **Babylon.js / PlayCanvas / Needle**: load the GLB, or port `create()` code (they are plain JS).
- **Vertex colours**: enable "use vertex colour" in the target material if the model looks white.

## Performance
- Budgets: see `style-guide.md`. `measure(obj)` returns triangles / vertices / meshes / points.
- Draw calls matter more than triangles: 40 tiny meshes = 40 calls. Merge static assets (`mergeGeometries` after `paintFaces`).
- Reuse materials; avoid per-mesh unique materials with the same colour.
- Prefer `flatShading` + vertex colours to textures.
- Shadows: only the main directional light; assets already set `castShadow/receiveShadow` — game decides which lights cast.
- Particles: ≤ 500 per effect; use `Points`, not meshes.
- Dispose: always call `userData.dispose()` for removed assets in long-running games.
- LOD: create the asset with fewer segments through options (e.g. `layers: 2`) and swap by distance (`THREE.LOD`).

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| Viewer shows a red error "Could not load ../registry.js" | open via `npm run serve` (`http://localhost:5173/viewer/`), not by double-clicking the file; run `npm run registry` |
| Viewer blank, console: failed to fetch three | the viewer loads three from jsDelivr — needs internet; or edit the import map to a local `node_modules/three` path |
| `Cannot find package 'three'` | run `npm install` in the project folder |
| Validator: "pivot not at base" | forgot `finalize()` or `meta.pivot = 'center'` for floating assets |
| Validator: "NOT deterministic" | `Math.random()` / `Date.now()` in `create()`; use `createRng` |
| Validator: "exceeds budget" | lower segment counts, merge/cull hidden parts, or justify with `meta.triangleBudget` |
| Asset looks black | no lights in your scene, or a dark texture × dark colour; check normals after custom geometry (`computeVertexNormals()`) |
| Z-fighting (flickering faces) | coplanar boxes: offset details by 1–2 cm |
| Faces invisible from one side | single-sided material on a plane; use `side: THREE.DoubleSide` |
| GLB white / no colour | target engine ignores vertex colours; enable them, or use per-material colours |
| Particles invisible after export | `Points` support varies; render them in-engine with the engine's own particle system |
| Memory grows | forgot `userData.dispose()` on removed assets |
