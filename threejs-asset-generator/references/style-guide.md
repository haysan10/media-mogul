# Style guide — the rules that keep every asset consistent

Read this before writing any asset. Every rule here is checked by `npm run validate` or by eye in the viewer.

## Contents
- Coordinate system & units
- Poly budgets
- Colour & material rules
- Proportions & scale table
- Naming
- Determinism
- Look & feel (the "house style")

## Coordinate system & units
| Rule | Value |
|---|---|
| Units | **1 unit = 1 metre** |
| Up axis | **+Y** |
| Front of the asset | **+Z** (door, face, muzzle point to +Z) |
| Origin / pivot | **centre of the base**, lowest point at `y = 0` (`finalize()` enforces this) |
| Floating things (orbs, pickups, clouds) | set `meta.pivot = 'center'` |
| Handedness | right-handed (three.js default) |

Never offset the whole asset to "place" it — placement is the game's job.

## Poly budgets (triangles, defaults; override with `meta.triangleBudget`)
| Category | Budget | Notes |
|---|---|---|
| props | 1 500 | chests, weapons, furniture, crates |
| environment | 1 500 | trees, rocks, plants — they get instanced hundreds of times, aim for < 600 |
| characters | 4 000 | humanoid blockout is ~400, stylised hero ≤ 2 500 |
| buildings | 3 000 | |
| vehicles | 3 000 | |
| terrain | 8 000 | per chunk |
| vfx | 1 000 | plus particles (Points) — keep ≤ 500 points per effect |
| ui | 500 | |

Cheap forms: `BoxGeometry` 12 tris · `CylinderGeometry(…, 6)` 24 · `ConeGeometry(…, 7)` 14 · `IcosahedronGeometry(r, 0)` 20 · `IcosahedronGeometry(r, 1)` 80 · `SphereGeometry(r, 8, 6)` 80.
Avoid `SphereGeometry` ≥ 16 segments and `IcosahedronGeometry(r, ≥ 3)` unless the asset is a hero.

## Colour & material rules
- Use `std(color)` (flat-shaded `MeshStandardMaterial`) for everything by default.
- **Palette discipline**: ≤ 5 base hues per asset + 1 accent. Vary lightness (`tint(color, { l: ±0.06 })`), not hue, for natural variation.
- Avoid pure `#000000` and pure `#ffffff`. Darkest ≈ `#1d1d22`, lightest ≈ `#f4f8ff`.
- Metals: `metalness 0.5–0.75`, `roughness 0.3–0.45`. Everything else: `metalness 0`, `roughness ≥ 0.8`.
- Emissive only for light sources (`glow()`): windows at night, gems, lava, lamps, magic.
- **One material per colour per asset.** Create the material once and reuse it for many meshes.
- No image files. Textures are procedural (`lib/textures.js`) and always optional (`map: null` in Node).
- Transparent materials: set `depthWrite: false` and use sparingly (sorting problems).

Suggested base palettes (hex):
| Mood | Colours |
|---|---|
| Fantasy forest | `#2f6b3a #4f8a3a #6b4a2e #7d7f86 #d9c58a` |
| Medieval | `#9aa3ad #b3262e #d4a82a #5a3d28 #d9c7a0` |
| Desert | `#d9b26f #b5793c #8a4b2a #5b3a22 #3d6b6b` |
| Sci-fi | `#2b3445 #6ea8ff #e0314b #9aa3b5 #11151d` |
| Winter | `#f4f8ff #bcd4e6 #5d7a99 #2f6b3a #6b4a2e` |

## Proportions & scale table (metres)
| Thing | Size |
|---|---|
| Human / knight | 1.7 – 1.9 tall |
| Door | 0.9 × 2.0 |
| Chair seat | 0.45 high · table 0.75 high |
| Chest / crate | 0.5 – 1.0 wide |
| Sword | 0.9 – 1.2 long |
| Tree | 4 – 12 tall (pine 6, oak 8) |
| Boulder | 0.6 – 2.5 |
| House (1 floor) | 4 × 5 footprint, wall 2.4 high |
| Car | 4.2 × 1.8 × 1.5 |
| Terrain chunk | 16 – 64 per side |

## Naming
- `meta.id`: kebab-case, equals the file name (`magic-potion` ↔ `library/props/magic-potion.js`).
- Name important child groups so game code can find them: `group.name = 'hand-right'`, `'door'`, `'lid'`.
- Options: camelCase (`foliageColor`). Every option appears in **both** `meta.defaults` and `meta.options`.
- Always provide `seed` (if the asset has any randomness) and `scale`.

## Determinism
- **Never** `Math.random()`, `Date.now()`, `performance.now()` or `crypto` inside `create()`.
- Use `createRng(o.seed)`; use `rng.fork('name')` to give independent parts their own stream so adding a part doesn't re-shuffle the others.
- `create(opts)` called twice with the same `opts` must produce the same geometry (validator checks this).
- Animation may use the `t` passed to `update(t, dt)` — never wall-clock time.

## Look & feel (the house style)
1. **Flat-shaded, faceted, chunky.** Slightly exaggerated proportions beat realism (big head, thick limbs, fat tree crowns).
2. **Strong silhouette first.** If the shape is unreadable as a black shape, adding detail won't save it.
3. **Imperfection**: `jitter()` rocks and foliage by 4–16 % of their size; rotate repeated parts by random angles; vary scales ± 8 %.
4. **Detail budget goes where the eye looks**: faces, hands, tops of objects, edges with contrasting trim colour.
5. **Value contrast**: darker bottoms, lighter tops (`tint` with `l` increasing with height).
6. **Consistency beats quality**: a whole set in one palette and one level of detail looks better than one beautiful asset among rough ones.
