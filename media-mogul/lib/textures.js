// textures.js — procedural textures. NO image files, ever.
//
// Canvas-based textures only exist in the browser. In Node (validation, CLI export)
// they return `null`, so ALWAYS pass them as optional maps: std(color, { map: tex }).
// Textures should be light/neutral (near-white) and let the material `color` tint them.
import * as THREE from 'three';

const hasDOM = typeof document !== 'undefined';

export function canvasTexture(size, draw, { repeat = [1, 1], pixelated = true } = {}) {
  if (!hasDOM) return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  if (pixelated) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
  }
  return tex;
}

const gray = (v) => {
  const c = Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${c},${c},${c})`;
};

/** subtle noise speckle (stone, dirt, concrete) */
export function speckleTexture(rng, { size = 64, base = 225, variance = 22, dots = 600 } = {}) {
  return canvasTexture(size, (ctx, s) => {
    ctx.fillStyle = gray(base);
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < dots; i++) {
      ctx.fillStyle = gray(base + rng.range(-variance, variance));
      ctx.fillRect(Math.floor(rng.range(0, s)), Math.floor(rng.range(0, s)), 2, 2);
    }
  });
}

/** vertical wooden planks with dark gaps */
export function planksTexture(rng, { size = 128, planks = 6 } = {}) {
  return canvasTexture(size, (ctx, s) => {
    const w = s / planks;
    for (let i = 0; i < planks; i++) {
      ctx.fillStyle = gray(rng.range(205, 245));
      ctx.fillRect(i * w, 0, w, s);
      ctx.fillStyle = gray(150);
      ctx.fillRect(i * w, 0, 2, s);
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = gray(rng.range(180, 215));
        ctx.fillRect(i * w + rng.range(3, w - 6), rng.range(0, s), 2, rng.range(8, 28));
      }
    }
  });
}

/** checker / tile pattern */
export function checkerTexture({ size = 64, cells = 8, a = 240, b = 200 } = {}) {
  return canvasTexture(size, (ctx, s) => {
    const c = s / cells;
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        ctx.fillStyle = gray((x + y) % 2 ? a : b);
        ctx.fillRect(x * c, y * c, c, c);
      }
    }
  });
}

/** horizontal stripes (cloth, banners) */
export function stripesTexture({ size = 64, stripes = 8, a = 245, b = 200 } = {}) {
  return canvasTexture(size, (ctx, s) => {
    const h = s / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = gray(i % 2 ? a : b);
      ctx.fillRect(0, i * h, s, h);
    }
  });
}

/** Works in Node too (no canvas). 3-4 steps gives a clean cel-shaded look with MeshToonMaterial. */
export function toonRamp(steps = 3) {
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) data[i] = Math.round(((i + 1) / steps) * 255);
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
