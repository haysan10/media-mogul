// BuildingManager.js — Penempatan bangunan 3D, animasi scaffolding ramp-up & raycasting
import * as THREE from 'three';
import { create as createAsset } from '../../registry.js';
import { box, cyl, std } from '../../lib/helpers.js';

export class BuildingManager {
  constructor(scene) {
    this.scene = scene;
    this.buildingsByPlot = new Map(); // plotId -> THREE.Group
    this.animatedBuildings = [];
    this.raycaster = new THREE.Raycaster();
  }

  /**
   * Bangun perancah (scaffolding) selama masa ramp-up 5-10 hari
   */
  spawnScaffolding(plotId, coords) {
    this.removeBuilding(plotId);

    const group = new THREE.Group();
    group.position.set(coords.worldX, 0, coords.worldZ);
    group.userData.plotId = plotId;
    group.userData.isScaffolding = true;

    const woodMat = std('#b8864e', { roughness: 0.8 });
    const metalMat = std('#f59e0b', { metalness: 0.5, roughness: 0.4 });

    // 4 Tiang sudut perancah
    const poleH = 2.8;
    group.add(cyl(0.06, 0.06, poleH, 6, metalMat, -1.8, poleH / 2, -1.8));
    group.add(cyl(0.06, 0.06, poleH, 6, metalMat, 1.8, poleH / 2, -1.8));
    group.add(cyl(0.06, 0.06, poleH, 6, metalMat, -1.8, poleH / 2, 1.8));
    group.add(cyl(0.06, 0.06, poleH, 6, metalMat, 1.8, poleH / 2, 1.8));

    // Palang kayu silang
    group.add(box(3.8, 0.08, 0.08, woodMat, 0, 1.2, 1.8));
    group.add(box(3.8, 0.08, 0.08, woodMat, 0, 1.2, -1.8));
    group.add(box(0.08, 0.08, 3.8, woodMat, 1.8, 1.2, 0));
    group.add(box(0.08, 0.08, 3.8, woodMat, -1.8, 1.2, 0));

    // Platform lantai kerja kayu
    group.add(box(3.6, 0.1, 3.6, woodMat, 0, 1.3, 0));

    // Papan tanda proyek konstruksi
    const signBox = box(1.2, 0.6, 0.06, metalMat, 0, 2.0, 1.85);
    group.add(signBox);

    // Animasi denyut ringan scaffolding
    group.userData.update = (t) => {
      signBox.position.y = 2.0 + Math.sin(t * 3) * 0.04;
    };

    group.userData.dispose = () => {
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
    };

    this.scene.add(group);
    this.buildingsByPlot.set(plotId, group);
    this.animatedBuildings.push(group);

    return group;
  }

  /**
   * Bangun atau perbarui bangunan pada kavling tertentu
   */
  spawnBuilding(plotId, buildingAssetId, level, coords) {
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

  getBuildingPosition(plotId) {
    const b = this.buildingsByPlot.get(plotId);
    return b ? b.position : null;
  }

  update(elapsedTime, dt) {
    for (let i = 0; i < this.animatedBuildings.length; i++) {
      const b = this.animatedBuildings[i];
      if (b.userData && typeof b.userData.update === 'function') {
        b.userData.update(elapsedTime, dt);
      }
    }
  }

  raycastPlots(clientX, clientY, camera, plotMeshes, domElement = null) {
    let ndcX = 0;
    let ndcY = 0;
    if (domElement && domElement.getBoundingClientRect) {
      const rect = domElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
        ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
      } else {
        ndcX = (clientX / window.innerWidth) * 2 - 1;
        ndcY = -(clientY / window.innerHeight) * 2 + 1;
      }
    } else {
      ndcX = (clientX / window.innerWidth) * 2 - 1;
      ndcY = -(clientY / window.innerHeight) * 2 + 1;
    }

    const mouse = new THREE.Vector2(ndcX, ndcY);
    this.raycaster.setFromCamera(mouse, camera);

    // 1. Raycast kavling dasar
    const plotHits = this.raycaster.intersectObjects(plotMeshes, false);

    // 2. Raycast bangunan / perancah di atas kavling
    const buildingList = Array.from(this.buildingsByPlot.values());
    const buildingHits = buildingList.length > 0 ? this.raycaster.intersectObjects(buildingList, true) : [];

    let bestHit = null;
    let minDistance = Infinity;

    if (plotHits.length > 0 && plotHits[0].distance < minDistance) {
      minDistance = plotHits[0].distance;
      bestHit = plotHits[0].object.userData;
    }

    if (buildingHits.length > 0 && buildingHits[0].distance < minDistance) {
      let cur = buildingHits[0].object;
      while (cur && cur.userData.plotId === undefined && cur.parent) {
        cur = cur.parent;
      }
      if (cur && cur.userData.plotId !== undefined) {
        const plotMesh = plotMeshes[cur.userData.plotId];
        bestHit = plotMesh ? plotMesh.userData : { plotId: cur.userData.plotId };
      }
    }

    return bestHit;
  }

  clearAll() {
    for (const [plotId] of this.buildingsByPlot) {
      this.removeBuilding(plotId);
    }
    this.buildingsByPlot.clear();
    this.animatedBuildings = [];
  }
}
