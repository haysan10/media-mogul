// VFX.js — Sistem Floating Text (+$ / -$) ber-pool & partikel konstruksi diorama
import * as THREE from 'three';

const POOL_SIZE = 35;

export class VFXManager {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.activeTexts = [];

    this.initPool();
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

  /**
   * Munculkan teks melayang beranimasi naik & pudar
   * @param {string|number} text Jumlah dolar atau pesan teks
   * @param {THREE.Vector3|{x,y,z}} worldPosition Titik muncul
   * @param {'income'|'expense'|'rep'} type Jenis warna
   */
  spawnFloatingText(text, worldPosition, type = 'income') {
    // Cari sprite dari pool yang idle
    const item = this.pool.find((p) => !p.active);
    if (!item) return; // Pool sedang penuh

    item.active = true;
    item.age = 0;
    item.pos.set(worldPosition.x, worldPosition.y + 2.0, worldPosition.z);

    // Format text
    let str = typeof text === 'number' ? (text >= 0 ? `+$${Math.round(text)}` : `-$${Math.abs(Math.round(text))}`) : text;
    let col = '#22c55e'; // Hijau income
    if (type === 'expense' || (typeof text === 'number' && text < 0)) col = '#ef4444';
    if (type === 'rep') col = '#38bdf8';

    // Gambar teks ke kanvas item
    const ctx = item.ctx;
    ctx.clearRect(0, 0, item.canvas.width, item.canvas.height);

    ctx.font = 'bold 32px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Bayangan tepi untuk keterbacaan tinggi di segala pencahayaan
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
        // Kembalikan ke pool
        item.active = false;
        item.sprite.visible = false;
        item.material.opacity = 0;
        this.activeTexts.splice(i, 1);
        continue;
      }

      // Animasi melayang naik ke atas secara konstan
      item.sprite.position.y = item.pos.y + progress * 2.2;
      // Efek pudar transparan mendekati akhir hidup
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
  }
}
