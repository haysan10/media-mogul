# VFX & environment recipes

## Contents
- Particle effects
- Light sources
- Sky, fog & atmosphere
- Water
- Terrain & scatter
- Weather
- Level generation (dungeons)

## Particle effects
Pattern: stateless `Points` (see `vfx/campfire.js`, `references/animation.md`).
| Effect | Recipe |
|---|---|
| Fire | additive, yellow→orange→red-dark ramp, rise 1 m, radius shrinks with age |
| Embers/sparks | tiny additive points, rise with lateral drift |
| Smoke | normal-blend greys; per-particle alpha needs a shader — cheap alternative: 5–8 large soft `Sprite`s with a radial-gradient `canvasTexture`, opacity fading with age |
| Magic/aura | additive points on a spiral: `angle = a0 + age * 6`, `radius = 0.5 * (1 - age)`, rising |
| Explosion | ico-sphere flash (additive, scale up, fade) + 30 debris points flying out `v * age − g * age²` |
| Rain | 300 thin line segments or points, fall speed 12 m/s, wrap with `%` |
| Snow | 300 points, fall 1 m/s + sine drift |
| Healing | green plus-shaped extrude pieces rising and fading |

## Light sources
`PointLight(color, intensity, distance, decay = 2)` — with three ≥ r155 intensities are physical: ~8–15 for a campfire at `distance 8–10`. Always pass `distance`. Flicker with 2–3 sines of different frequency. Don't enable `castShadow` on lights inside assets.

## Sky, fog & atmosphere
- Sky dome: large `SphereGeometry(100, 16, 12)` with `side: BackSide` and **vertex colours** from a vertical gradient (horizon `#bfd8ff` → zenith `#4f7fd0`). `pivot: 'center'`.
- Clouds: 3–6 jittered icospheres merged, white, `flatShading`, drifting in `update`.
- Sun/moon: `glow` sphere + additive halo plane.
- Stars: 300 points on a sphere.
- Fog is a *scene* setting — document the suggested `scene.fog = new THREE.Fog(color, near, far)` in the README or `meta.description`.

## Water
- Ground-plane water: `PlaneGeometry(size, size, 24, 24)` rotated −π/2, `MeshStandardMaterial({ color:'#3b8fd6', transparent:true, opacity:0.78, roughness:0.15, flatShading:true })`.
- Waves in `update(t)`: set each vertex `y = sin(x*0.8 + t*1.4)*0.08 + sin(z*1.1 + t*1.1)*0.06`, then `computeVertexNormals()` (cheap enough for ≤ 25×25).
- Foam/shore: white vertex-colour on vertices where `y` is near the max.
- Waterfall: stacked thin boxes with scrolling stripes (`texture.offset.y -= dt`) — browser only.

## Terrain & scatter
- Heightfield: `createNoise2D(seed).fbm(x*f, z*f)` → see `terrain/terrain-chunk.js`. Sample in **world coordinates** (`pos + offset`) so neighbouring chunks stitch seamlessly.
- Biomes by height & slope with `paintFaces`.
- Rivers/paths: carve by subtracting `smoothstep` of the distance to a polyline from the height.
- Scatter (trees/rocks) in the game: use `createRng(seed)`, reject points on steep faces (`normal.y < 0.8`), use `InstancedMesh`.
- Island: multiply height by a radial falloff `1 - smoothstep(0.5, 1, dist/halfSize)`.

## Weather
Provide as `vfx` assets that follow the camera in the game: a box volume of particles that wraps (`position = ((p + t*v) mod size) − size/2`).

## Level generation (dungeons)
Pure-JS generators belong in `environment`/`terrain` assets that **return meshes**:
1. Grid `W×H` of walls; carve rooms (random rects via `rng`), connect with L-shaped corridors.
2. Instance a floor tile + wall boxes per cell (InstancedMesh or merged geometry).
3. Place doors/torches (`glow`) at corridor junctions; keep the layout also available in `root.userData.map` for game logic.
4. Same seed → same dungeon (this is a feature: share seeds).
