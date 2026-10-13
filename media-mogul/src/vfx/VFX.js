// VFX.js — Lapisan 1: Floating Text (+$ / -$ / Rep) Ber-pool & Efek Bahaya Vignette
import * as THREE from 'three';

const POOL_SIZE = 35;

export class VFXManager {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.activeTexts = [];
    this.dangerVignetteEl = null;

    this.initPool();
    this.initVignetteDOM();
  }

  initPool() {
    for (let i = 0; i < POOL_SIZE; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthTest: false,
      });

      const sprite = new THREE.Sprite(material);
      sprite.scale.set(2.4, 1.2, 1);
      sprite.visible = false;

      this.scene.add(sprite);

      this.pool.push({
        sprite,
        canvas,
        ctx,
        texture,
        material,
        active: false,
        age: 0,
        life: 1.6,
        pos: new THREE.Vector3(),
      });
    }
  }

  initVignetteDOM() {
    let el = document.getElementById('vfx-danger-vignette');
    if (!el) {
      el = document.createElement('div');
      el.id = 'vfx-danger-vignette';
      el.style.cssText = `
        position: fixed; inset: 0; pointer-events: none; z-index: 5;
        box-shadow: inset 0 0 100px rgba(239, 68, 68, 0);
        transition: box-shadow 0.3s ease;
      `;
      document.body.appendChild(el);
    }
    this.dangerVignetteEl = el;
  }

  setDangerVignette(isCritical, isNegativeCash) {
    if (!this.dangerVignetteEl) return;
    if (isNegativeCash) {
      this.dangerVignetteEl.style.boxShadow = 'inset 0 0 120px rgba(239, 68, 68, 0.45)';
    } else if (isCritical) {
      this.dangerVignetteEl.style.boxShadow = 'inset 0 0 80px rgba(245, 158, 11, 0.3)';
    } else {
      this.dangerVignetteEl.style.boxShadow = 'inset 0 0 0 rgba(0, 0, 0, 0)';
    }
  }

  spawnFloatingText(text, worldPosition, type = 'income') {
    const item = this.pool.find((p) => !p.active);
    if (!item) return;

    item.active = true;
    item.age = 0;
    item.pos.set(worldPosition.x, worldPosition.y + 2.0, worldPosition.z);

    let str = typeof text === 'number' ? (text >= 0 ? `+$${Math.round(text)}` : `-$${Math.abs(Math.round(text))}`) : text;
    let col = '#4fd17a';
    if (type === 'expense' || (typeof text === 'number' && text < 0)) col = '#ef4d5e';
    if (type === 'rep') col = '#6ea8ff';

    const ctx = item.ctx;
    ctx.clearRect(0, 0, item.canvas.width, item.canvas.height);

    ctx.font = 'bold 30px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#000000';
    ctx.fillText(str, 64 + 1, 32 + 2);

    ctx.fillStyle = col;
    ctx.fillText(str, 64, 32);

    item.texture.needsUpdate = true;
    item.sprite.position.copy(item.pos);
    item.material.opacity = 1;
    item.sprite.visible = true;

    this.activeTexts.push(item);
  }

  update(dt) {
    for (let i = this.activeTexts.length - 1; i >= 0; i--) {
      const item = this.activeTexts[i];
      item.age += dt;
      const progress = item.age / item.life;

      if (progress >= 1) {
        item.active = false;
        item.sprite.visible = false;
        item.material.opacity = 0;
        this.activeTexts.splice(i, 1);
        continue;
      }

      item.sprite.position.y = item.pos.y + progress * 2.2;
      item.material.opacity = Math.max(0, (1 - progress) * 1.2);
    }
  }

  dispose() {
    for (const item of this.pool) {
      this.scene.remove(item.sprite);
      item.material.dispose();
      item.texture.dispose();
    }
    this.pool = [];
    this.activeTexts = [];
    if (this.dangerVignetteEl) {
      this.dangerVignetteEl.remove();
      this.dangerVignetteEl = null;
    }
  }
}
