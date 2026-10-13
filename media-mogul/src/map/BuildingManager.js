// BuildingManager.js — Penempatan bangunan 3D via registry.js, animasi frame, dan raycasting
import * as THREE from 'three';
import { create as createAsset } from '../../registry.js';

export class BuildingManager {
  constructor(scene) {
    this.scene = scene;
    this.buildingsByPlot = new Map(); // plotId -> THREE.Group
    this.animatedBuildings = [];
    this.raycaster = new THREE.Raycaster();
  }

  /**
   * Bangun atau perbarui bangunan pada kavling tertentu
   * @param {number} plotId ID petak (0..35)
   * @param {string} buildingAssetId ID aset dari registry (mis. 'koran-percetakan')
   * @param {number} level Level bangunan (1..5)
   * @param {{worldX: number, worldZ: number}} coords Posisi dunia
   */
  spawnBuilding(plotId, buildingAssetId, level, coords) {
    // Hapus bangunan lama jika sudah ada (saat upgrade/ganti)
    this.removeBuilding(plotId);

    try {
      const buildingMesh = createAsset(buildingAssetId, {
        seed: plotId * 13 + 7,
        level: level,
        scale: 0.92,
      });

      buildingMesh.position.set(coords.worldX, 0, coords.worldZ);
      buildingMesh.userData.plotId = plotId;
      buildingMesh.userData.assetId = buildingAssetId;

      this.scene.add(buildingMesh);
      this.buildingsByPlot.set(plotId, buildingMesh);
      this.animatedBuildings.push(buildingMesh);

      return buildingMesh;
    } catch (err) {
      console.error('Gagal membuat bangunan 3D dari registry:', err);
      return null;
    }
  }

  /**
   * Hapus bangunan dari kavling (demolish / sebelum re-spawn)
   */
  removeBuilding(plotId) {
    const existing = this.buildingsByPlot.get(plotId);
    if (!existing) return;

    this.scene.remove(existing);
    if (typeof existing.userData.dispose === 'function') {
      existing.userData.dispose();
    }

    const animIdx = this.animatedBuildings.indexOf(existing);
    if (animIdx !== -1) {
      this.animatedBuildings.splice(animIdx, 1);
    }

    this.buildingsByPlot.delete(plotId);
  }

  /**
   * Ambil posisi dunia bangunan pada petak
   */
  getBuildingPosition(plotId) {
    const b = this.buildingsByPlot.get(plotId);
    return b ? b.position : null;
  }

  /**
   * Update semua animasi bangunan setiap frame
   */
  update(elapsedTime, dt) {
    for (let i = 0; i < this.animatedBuildings.length; i++) {
      const b = this.animatedBuildings[i];
      if (b.userData && typeof b.userData.update === 'function') {
        b.userData.update(elapsedTime, dt);
      }
    }
  }

  /**
   * Raycast pointer mouse/touch ke kavling
   */
  raycastPlots(clientX, clientY, camera, plotMeshes) {
    const rect = camera.aspect; // ensure camera exists
    const mouse = new THREE.Vector2(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, camera);
    const intersects = this.raycaster.intersectObjects(plotMeshes, false);

    if (intersects.length > 0) {
      return intersects[0].object.userData;
    }
    return null;
  }

  /**
   * Bersihkan seluruh bangunan saat reset game
   */
  clearAll() {
    for (const [plotId] of this.buildingsByPlot) {
      this.removeBuilding(plotId);
    }
    this.buildingsByPlot.clear();
    this.animatedBuildings = [];
  }
}
