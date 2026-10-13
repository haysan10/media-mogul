# Animation

All animation is **procedural** — functions of time. No keyframe files, no skeleton imports.

## Contents
- The contract
- States & `ctx` helpers
- Recipes (idle, walk, attack, bob/spin, hinge, sway, pulse)
- Easing & damping
- Particles & stateless effects
- Using animations in a game
- Pitfalls

## The contract
```js
return finalize(root, meta, o, states, { resetOnChange: true });
// afterwards:
asset.userData.states          // ['idle', 'walk', 'attack']
asset.userData.setState('walk')
asset.userData.getState()
asset.userData.update(timeSeconds, deltaSeconds)   // call every frame
```
`meta.defaultState` (or `options.state`) picks the initial state; otherwise the first key is used.

## States & `ctx` helpers
A state is `(t, dt, ctx) => void`. **Never write absolute transforms** — express poses relative to the rest pose:
```js
ctx.rot(legL, swing)          // legL.rotation = rest + (swing, 0, 0)
ctx.rot(torso, 0, twist, 0)   // dx, dy, dz
ctx.move(body, 0, bob, 0)     // position = rest + delta
ctx.reset()                   // restore everything touched so far (done automatically on setState)
```
`resetOnChange: false` skips the automatic reset (use it when states share continuous values, like the chest lid angle).

## Recipes
**Idle (breathing)**
```js
const b = Math.sin(t * 1.6);
ctx.move(body, 0, b * 0.008, 0); ctx.rot(torso, b * 0.012); ctx.rot(head, 0, Math.sin(t * 0.5) * 0.08);
```
**Walk cycle** (`w = t * 6` ≈ 1 step per 0.5 s): legs `±sin(w) * 0.7`, arms opposite `∓sin(w) * 0.6`, body bob `abs(cos(w)) * 0.045`, torso twist `sin(w) * 0.07`.
**Attack** (swing): wind-up `easeInOutQuad` 0 → −2.5 rad, strike `easeInQuad` → +0.3 over 15 % of the cycle, recover `easeOutQuad`; loop with `(t % period) / period`.
**Bob + spin pickup**: `ctx.rot(root, 0, t * 1.5, 0); ctx.move(root, 0, Math.sin(t * 2) * 0.1, 0)`.
**Hinge (door, lid, drawer)**: Group at the hinge, `angle = damp(angle, target, 6, dt)`; `ctx.rot(hinge, angle)`.
**Wind sway**: rotate foliage groups about Z/X by `sin(t * 1.2 + phase) * 0.02`, scaled by height.
**Pulse / glow**: `mat.emissiveIntensity = 0.8 + 0.4 * Math.sin(t * 3)`.
**Wheel spin**: `ctx.rot(wheel, t * speed)`.

## Easing & damping
`animation.js` exports `easeInQuad`, `easeOutQuad`, `easeInOutQuad`, `easeOutBack`, `damp(current, target, lambda, dt)`, `cycle(t, period)`, `pingPong(t, period)`.
Use `damp` for anything that chases a target (frame-rate independent). `lambda` 4 = lazy, 8 = snappy, 14 = almost instant.

## Particles & stateless effects
Compute each particle from `age = (t * speed + phase) % 1` — no per-particle state to store, perfectly deterministic, pausable, scrubbable.
`Points` + `PointsMaterial({ vertexColors, blending: AdditiveBlending, depthWrite: false, sizeAttenuation: true })`.
Update the attribute array in place, set `attributes.position.needsUpdate = true`, set `points.frustumCulled = false`, and **run the simulation once before `finalize()`** so the bounding box is realistic (see `campfire.js`).
Budget: ≤ 500 particles per effect.

## Using animations in a game
```js
import { create } from './registry.js';
const knight = create('knight', { armorColor: '#335588' });
scene.add(knight);
knight.userData.setState('walk');
// render loop
knight.userData.update(clock.elapsedTime, delta);
```
Blend between states in game code by calling `setState` and, if you need smoothing, lerping `knight.rotation`/`position` yourself.
The GLB export holds the rest pose only; re-implement animation in the target engine, or bake clips with `AnimationClip` if a project needs them.

## Pitfalls
- Setting `obj.rotation.x = …` directly inside a state fights `ctx.reset()`; always go through `ctx`.
- Don't allocate (`new Vector3`) inside `update` — it runs 60×/s.
- Don't use `Date.now()` / `performance.now()` — use the `t` you are given.
- Animation that moves the whole asset (`root`) is fine for pickups but the validator measures the rest pose; keep amplitudes small.
