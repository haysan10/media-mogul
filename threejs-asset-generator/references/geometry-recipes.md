# Geometry recipes

Tested patterns for building common game assets from three.js primitives. Copy the idea, not the numbers.
Working code for most of these lives in `assets/examples/` — open the closest example first.

## Contents
- Toolbox: which primitive for what
- Trees & plants
- Rocks & terrain features
- Buildings & structures
- Characters (blocky rig)
- Weapons & held items
- Props & furniture
- Vehicles
- Pickups & UI-in-world
- Merging & instancing

## Toolbox: which primitive for what
| Need | Use |
|---|---|
| Walls, crates, limbs, blocks | `BoxGeometry` |
| Trunks, pillars, barrels, cans, wheels | `CylinderGeometry(rTop, rBottom, h, 6–10)` |
| Cones, roofs (round), pine foliage, spikes | `ConeGeometry(r, h, 5–8)` |
| Boulders, bushes, heads, orbs | `IcosahedronGeometry(r, 0–1)` + `jitter()` |
| Gabled roof, ramps, wedges, blade, any 2-D silhouette made 3-D | `ExtrudeGeometry(Shape, { depth, bevelEnabled: false })` |
| Vases, bottles, goblets, bowls, pawns | `LatheGeometry(points, 8–12)` |
| Rings, tyres, pipes bends | `TorusGeometry(R, r, 6, 12)` |
| Arches, rails, ropes, roots, tentacles | `TubeGeometry(CatmullRomCurve3, 12, r, 5)` |
| Flat decals, water, banners | `PlaneGeometry` (double-sided if needed) |
| Terrain / heightfield | `PlaneGeometry` + displace Y + `paintFaces()` (see `terrain-chunk.js`) |
| Anything custom | `BufferGeometry` with `setAttribute('position', …)` |

Half-cylinder (barrel lid, tunnel, bridge arch): `new CylinderGeometry(r, r, len, 10, 1, false, 0, Math.PI)` then `rotateZ(Math.PI/2)` — see `treasure-chest.js`.

## Trees & plants
- **Pine**: trunk cylinder (6 sides) + 3–5 stacked cones (7 sides), each lower cone wider; rotate each cone randomly; `jitter` 6 %.
- **Oak/round tree**: trunk + 2–4 `IcosahedronGeometry(r, 1)` blobs overlapping, scaled y × 0.85, jittered 10 %.
- **Palm**: bent trunk from 5 stacked tilted cylinders (tilt accumulates), 6–8 flattened cones as fronds, rotated around the top.
- **Bush**: 3–5 jittered icospheres at ground level. **Grass tuft**: 3–5 thin cones (4 sides) fanned out.
- **Flower**: thin cylinder stem + `IcosahedronGeometry(0.06, 0)` head + 5 flattened petals.
- **Dead tree**: trunk + branches as tilted tapered cylinders, no foliage.
- Add wind sway as an animation state (rotate crowns slightly around Z, phase-shifted per layer).

## Rocks & terrain features
- Boulder: `IcosahedronGeometry(1, 1)`, non-uniform `geometry.scale(1.1, 0.7, 1)`, `jitter 16 %`, `paintFaces` with lighter tops (and moss when `normal.y > 0.65`).
- Cliff / pillar: tall cylinder (6–7 sides) with strongly jittered vertices and a darker base.
- Crystal: `ConeGeometry(r, h, 5)` clusters at random tilts, `glow()` material or translucent `std` with `opacity 0.8`.
- Stalagmite: cone, 6 sides, pointing up; stalactite: same, rotated π.
- Water tile: `PlaneGeometry` with `MeshStandardMaterial({ color, transparent: true, opacity: 0.75, roughness: 0.1 })` and vertex waves in `update(t)`.

## Buildings & structures
- Always build **foundation → walls → roof → details**. Details: door, windows, chimney, steps, signs.
- Wall thickness: use one box per wall only if you need openings; otherwise one solid box and "stick on" door/window boxes 2 cm proud of the surface.
- Gabled roof: extruded triangle (see `house.js`). Hip roof: `ConeGeometry(r, h, 4)` rotated 45°, scaled to the footprint. Flat roof: box + parapet.
- Towers: stacked cylinders (8 sides) + cone roof + battlements (`box` ring).
- Fences: posts every 1.2 m + 2 horizontal rails. Walls: boxes with `rng.range(0.9,1.1)` height variation.
- Windows glow at night: `glow('#ffcf70')`; day: bluish `std` with `roughness 0.25`.
- Use `meta.defaults.night` style booleans for variants rather than separate assets.

## Characters (blocky rig)
Follow `characters/knight.js`. Rules:
1. **Joint = Group.** Create a `Group` at the joint position (shoulder, hip, neck, waist), add the limb mesh offset *down* from it. Rotating the group rotates the limb.
2. Hierarchy: `root → body → torso → (head, armL, armR)`; `body → (legL, legR)`. Held items are children of the hand/arm.
3. Proportions (heroic): head 1/5 of height, torso 0.6 m, legs 0.9 m, arms 0.6 m. Chibi: head 1/3, short limbs.
4. Face (+Z): two small dark boxes as eyes, optional mouth line; helmets use a dark visor slit.
5. Colour blocking: skin / cloth / armour / leather / accent — five materials is enough.
6. Required animation states: `idle`, `walk`; nice to have: `attack`, `hit`, `die`, `cheer`.
7. Rotation about X swings limbs forward/back; about Z spreads them sideways.
8. Keep a `states` object; do not mutate transforms outside `ctx.rot / ctx.move`.
Animals: same recipe with 4 leg groups, a tail group and a head group; body is a rounded box (`BoxGeometry` + `jitter` 3 %).

## Weapons & held items
- Origin at the grip so the item can be parented to a hand group; stand it upright (blade/barrel +Y) in the standalone asset.
- Sword/axe/spear blades: `ExtrudeGeometry` of a pointed silhouette; guard = box; grip = hexagonal cylinder; pommel = `ico(…, 0)`.
- Bow: `TubeGeometry` along a curved `QuadraticBezierCurve3` + thin string box. Staff: tall cylinder + glowing orb.
- Gun: boxes (receiver, barrel as 8-sided cylinder, grip tilted 15°, magazine). Keep all low-poly and stylised.
- Shield: 8-sided cylinder rotated to face forward + rim + boss.
- Add `meta.tags: ['weapon']` so game code can filter.

## Props & furniture
- Crate: box + 4 corner strips + 2 diagonal planks. Barrel: `LatheGeometry` or 10-sided cylinder + 2 metal rings.
- Chair/table: boxes for seat/top, cylinders (6) for legs. Bed: box frame + thinner box mattress + pillow box.
- Lantern/lamp: cylinder base + `glow()` core + cone roof. Add a `PointLight` only when requested (lights are expensive in games).
- Campfire / torch / candle: see `vfx/campfire.js`.
- Signpost: post + 2 boxes + (optional) `canvasTexture` text — guard for Node (`null`).
- Containers with moving parts (chest, door, drawer): hinge = Group at the hinge axis; animate with `damp()` toward a target angle (see `treasure-chest.js`).

## Vehicles
- Body = 2–3 stacked boxes (chassis, cabin) with slight taper; wheels = `CylinderGeometry(r, r, w, 10)` rotated Z π/2, hub = smaller lighter cylinder.
- Wheels are Groups at the axle so they can spin: `wheel.rotation.x = t * speed`.
- Front along +Z. Provide states `idle`, `drive` (wheel spin + body bob).
- Boats: tapered extruded hull; sails = planes with vertex wobble. Aircraft: fuselage cylinder + wing boxes + propeller group.

## Pickups & UI-in-world
- Coin: cylinder (10 sides, 0.02 thick) rotated to stand upright, `glow`, spin state.
- Heart / gem / star: `ExtrudeGeometry` from a 2-D shape, slight bevel (`bevelSize 0.01, bevelSegments 1`), bob + spin state.
- Health potion: `LatheGeometry` bottle + cork cylinder + coloured liquid cylinder with `glow`.
- Set `meta.pivot = 'center'` for floating pickups.

## Merging & instancing (performance)
- Repeated identical objects (forests, grass, rocks): in the **game**, use `THREE.InstancedMesh` from the asset's meshes — or build the scatter inside a `vfx`/`environment` asset with `InstancedMesh` and count the instances in the budget (`measure()` multiplies by the instance count).
- Static assets with many meshes: merge geometries with `mergeGeometries` (`three/addons/utils/BufferGeometryUtils.js`) after baking colour into a `color` attribute (`paintFaces`). One draw call instead of 40. Do this only for static assets (no animation).
- Share materials: one `std()` per colour, reused across meshes.
