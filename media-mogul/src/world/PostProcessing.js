// PostProcessing.js — UnrealBloomPass opsional untuk glow neon era 5 & 6 pada tier grafis tinggi
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class PostProcessingManager {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = null;
    this.bloomPass = null;
    this.enabled = false;

    this.initComposer();
  }

  initComposer() {
    try {
      const size = this.renderer.getSize(new THREE.Vector2());
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      // UnrealBloomPass: resolution, strength, radius, threshold
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(size.x, size.y),
        0.75, // strength
        0.4,  // radius
        0.85  // threshold (hanya emissive tinggi yang mekar/glow)
      );
      this.composer.addPass(this.bloomPass);
    } catch (e) {
      console.warn('PostProcessing init fallback to standard render:', e);
      this.composer = null;
    }
  }

  setSize(width, height) {
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  update(currentEraIndex, qualityTier) {
    // Bloom HANYA untuk era 5 & 6 (index 4 & 5) dan tier 'high'
    const isModernEra = currentEraIndex >= 4;
    this.enabled = isModernEra && qualityTier === 'high' && !!this.composer;
  }

  render() {
    if (this.enabled && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    if (this.composer) {
      this.composer = null;
    }
  }
}
