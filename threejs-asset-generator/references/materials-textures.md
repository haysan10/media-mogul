# Materials & procedural textures

## Contents
- Default material
- Vertex colours (best option for low-poly)
- Procedural textures (browser only!)
- Toon / cel shading
- Emissive & lights
- Transparency
- Custom shaders
- Node-safe checklist

## Default material
`std(color, params)` → flat-shaded `MeshStandardMaterial`, `roughness 0.85`, `metalness 0`.
Flat shading gives the faceted look with **zero** textures. Override via `params`: `std('#c9d2dc', { metalness: 0.75, roughness: 0.3 })`.

## Vertex colours (best option for low-poly)
`paintFaces(geometry, ({ normal, centroid, index }) => colour)` gives each triangle its own flat colour and returns a non-indexed geometry. Pair it with `std('#ffffff', { vertexColors: true })`.
Great for: terrain (height/slope based), rocks (moss on tops), gradients on tall objects (lighter at the top), hand-painted looks.
Advantages: no UVs, no textures, exports to GLB as `COLOR_0`, merges into one draw call.

## Procedural textures (browser only!)
`lib/textures.js` draws into a `<canvas>` and returns a `CanvasTexture`:
- `speckleTexture(rng, opts)` — stone, dirt, concrete
- `planksTexture(rng, opts)` — wood walls/floors/doors
- `checkerTexture(opts)` — tiles, flags
- `stripesTexture(opts)` — cloth, awnings
- `canvasTexture(size, draw, opts)` — your own: `draw(ctx, size)` using the 2-D canvas API

Rules:
1. They return `null` in Node (validator / CLI export). **Always optional**: `std(color, { map: planksTexture(rng) })` — `map: null` is valid.
2. Make textures **near-white/neutral** (value 180–250); the material `color` tints them. Dark textures + dark colour = black blob.
3. Small (`64–128 px`) and `NearestFilter` (default) for a crisp pixel look.
4. Never reference external image URLs or files.
5. The viewer's **GLB** button exports the textured version; `npm run export` (Node) exports without canvas textures.

## Toon / cel shading
```js
import { toonRamp } from '../../lib/textures.js';
const mat = new THREE.MeshToonMaterial({ color: o.color, gradientMap: toonRamp(3) });
```
`toonRamp` is a `DataTexture` — works in Node too. Add outlines with a back-face mesh: clone the geometry, `material = new MeshBasicMaterial({ color: '#111', side: THREE.BackSide })`, `scale.multiplyScalar(1.04)`.

## Emissive & lights
- `glow(color, intensity)` = emissive standard material for windows, gems, lava, screens.
- Bloom is the *game's* post-processing job; keep `emissiveIntensity` 0.8–1.6 so it blooms nicely.
- Lights inside assets (`PointLight`) are allowed for campfires/lanterns/torches **only**, with `distance` set (cheap falloff) and flicker in `update`. Document it in `meta.description`.

## Transparency
Glass, crystals, water, ghosts: `transparent: true, opacity: 0.6–0.85, depthWrite: false`. Render order problems? Split into one transparent mesh per asset and set `renderOrder = 1`.
Additive effects (fire, magic): `blending: THREE.AdditiveBlending, depthWrite: false` — fading means darkening.
`side: THREE.DoubleSide` for planes (banners, leaves, grass cards).

## Custom shaders
Allowed for: water, force fields, dissolve, wind on foliage, gradients. Constraints:
- Write with `ShaderMaterial` / `onBeforeCompile`, keep GLSL short, expose uniforms through `root.userData.uniforms` and update them in `update(t)`.
- **GLB export does not support `ShaderMaterial`** — provide a plain `std()` fallback mesh via an option (`shader: false`) when the asset must be exported.
- Prefer a vertex-colour or emissive solution first.

## Node-safe checklist
Node runs `create()` for validation and export, so at *call time* an asset must not touch: `document`, `window`, `canvas`, `Image`, `fetch`, `localStorage`. Only `lib/textures.js` helpers may touch the DOM and they already guard for it.
