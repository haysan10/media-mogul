// animation.js — tiny procedural animation framework + easing.
//
// Contract used by every animated asset:
//   root.userData.update(time, delta)   call once per frame
//   root.userData.states                list of state names, e.g. ['idle', 'walk']
//   root.userData.setState(name)        switch state
//   root.userData.getState()            current state name
//
// A state is a function (t, dt, ctx) => void. Use ctx helpers so poses are always
// expressed relative to the rest pose and can be reset safely:
//   ctx.rot(obj, dx, dy, dz)   rotation = rest + delta
//   ctx.move(obj, dx, dy, dz)  position = rest + delta
//   ctx.reset()                restore every touched object to its rest pose

export const easeInQuad = (t) => t * t;
export const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** frame-rate independent smoothing: current -> target. lambda ~ 4..12 */
export const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));

/** repeating 0..1 ramp with the given period (seconds) */
export const cycle = (t, period = 1) => ((t % period) + period) % period / period;

/** 0..1..0 triangle wave with the given period */
export const pingPong = (t, period = 1) => 1 - Math.abs(cycle(t, period) * 2 - 1);

export function attachAnimator(root, states = {}, initial, { resetOnChange = true } = {}) {
  const names = Object.keys(states);
  const rests = new Map();
  let current = initial && states[initial] ? initial : names[0];

  const restOf = (obj) => {
    let r = rests.get(obj);
    if (!r) {
      r = { p: obj.position.clone(), r: obj.rotation.clone() };
      rests.set(obj, r);
    }
    return r;
  };

  const ctx = {
    root,
    rest: restOf,
    rot(obj, dx = 0, dy = 0, dz = 0) {
      const r = restOf(obj).r;
      obj.rotation.set(r.x + dx, r.y + dy, r.z + dz);
    },
    move(obj, dx = 0, dy = 0, dz = 0) {
      const p = restOf(obj).p;
      obj.position.set(p.x + dx, p.y + dy, p.z + dz);
    },
    reset() {
      for (const [obj, r] of rests) {
        obj.position.copy(r.p);
        obj.rotation.copy(r.r);
      }
    },
  };

  root.userData.states = names;
  root.userData.getState = () => current;
  root.userData.setState = (name) => {
    if (!states[name] || name === current) return;
    if (resetOnChange) ctx.reset();
    current = name;
  };
  root.userData.update = (t = 0, dt = 0.016) => {
    if (current) states[current](t, dt, ctx);
  };
  root.userData._animatorCleanup = () => rests.clear();
  return root;
}
