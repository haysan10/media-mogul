// unitManager.js — Pembelian unit baru, upgrade level, dan alokasi anggaran
import { CONFIG } from '../config.js';

export class UnitManager {
  constructor(buildingManager, vfxManager) {
    this.buildings = buildingManager;
    this.vfx = vfxManager;
  }

  /**
   * Bangun unit media baru di kavling kosong
   */
  buildUnit(plotId, buildingAssetId, gameState, world) {
    const plot = gameState.plots[plotId];
    if (!plot) return { success: false, reason: 'Kavling tidak valid' };
    if (plot.unit) return { success: false, reason: 'Kavling sudah terisi bangunan' };

    const bConfig = CONFIG.BUILDINGS[buildingAssetId];
    if (!bConfig) return { success: false, reason: 'Tipe bangunan tidak dikenal' };

    if (gameState.money < bConfig.buildCost) {
      return { success: false, reason: `Uang tidak cukup (butuh $${bConfig.buildCost.toLocaleString()})` };
    }

    // Potong biaya pembangunan
    gameState.money -= bConfig.buildCost;

    const newUnit = {
      id: gameState.nextUnitId++,
      plotId: plotId,
      type: buildingAssetId,
      name: bConfig.name,
      eraIndex: bConfig.eraIndex,
      level: 1,
      audience: bConfig.baseAudience,
      staff: {
        reporter: 1,
        editor: 0,
        creator: 0,
        sales: 1,
      },
      budget: {
        quality: 40,
        quantity: 30,
        ads: 30,
      },
      lastDailyRevenue: 0,
    };

    plot.unit = newUnit;
    gameState.units.push(newUnit);
    gameState.stats.totalUnitsBuilt += 1;

    // Cari koordinat petak untuk penempatan 3D
    const hitMesh = world.plotMeshes[plotId];
    const coords = hitMesh
      ? { worldX: hitMesh.userData.worldX, worldZ: hitMesh.userData.worldZ }
      : { worldX: 0, worldZ: 0 };

    this.buildings.spawnBuilding(plotId, buildingAssetId, 1, coords);

    // Efek floating text dan log
    if (this.vfx) {
      this.vfx.spawnFloatingText(-bConfig.buildCost, coords, 'expense');
    }

    gameState.logs.unshift({
      text: `Unit baru dibangun: ${bConfig.name} di Kavling #${plotId + 1}!`,
      type: 'success',
    });

    return { success: true, unit: newUnit };
  }

  /**
   * Tingkatkan level bangunan unit
   */
  upgradeUnit(unitId, gameState, world) {
    const unit = gameState.units.find((u) => u.id === unitId);
    if (!unit) return { success: false, reason: 'Unit tidak ditemukan' };

    const bConfig = CONFIG.BUILDINGS[unit.type];
    if (!bConfig) return { success: false, reason: 'Konfigurasi unit tidak valid' };

    if (unit.level >= bConfig.maxLevel) {
      return { success: false, reason: 'Unit sudah mencapai level maksimum' };
    }

    const upgradeCost = Math.round(bConfig.buildCost * Math.pow(bConfig.upgradeMultiplier, unit.level));
    if (gameState.money < upgradeCost) {
      return { success: false, reason: `Uang tidak cukup (butuh $${upgradeCost.toLocaleString()})` };
    }

    gameState.money -= upgradeCost;
    unit.level += 1;
    unit.audience = Math.round(unit.audience * 1.5); // Lompatan audiens saat upgrade

    const hitMesh = world.plotMeshes[unit.plotId];
    const coords = hitMesh
      ? { worldX: hitMesh.userData.worldX, worldZ: hitMesh.userData.worldZ }
      : { worldX: 0, worldZ: 0 };

    // Re-spawn mesh 3D dengan level baru
    this.buildings.spawnBuilding(unit.plotId, unit.type, unit.level, coords);

    if (this.vfx) {
      this.vfx.spawnFloatingText(-upgradeCost, coords, 'expense');
      this.vfx.spawnFloatingText(`LVL ${unit.level}!`, { ...coords, y: coords.worldY || 2 }, 'rep');
    }

    gameState.logs.unshift({
      text: `${unit.name} naik ke Level ${unit.level}! Kapasitas & detail bertambah.`,
      type: 'success',
    });

    return { success: true, unit };
  }

  /**
   * Hancurkan atau jual unit
   */
  demolishUnit(unitId, gameState) {
    const idx = gameState.units.findIndex((u) => u.id === unitId);
    if (idx === -1) return { success: false, reason: 'Unit tidak ditemukan' };

    const unit = gameState.units[idx];
    const bConfig = CONFIG.BUILDINGS[unit.type];
    const scrapRefund = Math.round((bConfig?.buildCost || 1000) * 0.35);

    gameState.money += scrapRefund;

    const plot = gameState.plots[unit.plotId];
    if (plot) plot.unit = null;

    this.buildings.removeBuilding(unit.plotId);
    gameState.units.splice(idx, 1);

    gameState.logs.unshift({
      text: `${unit.name} dirobohkan. Nilai besi tua dikembalikan: +$${scrapRefund}.`,
      type: 'info',
    });

    return { success: true };
  }

  /**
   * Sesuaikan alokasi anggaran Kualitas vs Kuantitas vs Iklan
   */
  setBudgetAllocation(unitId, budget, gameState) {
    const unit = gameState.units.find((u) => u.id === unitId);
    if (!unit) return;

    // Normalisasi total agar tetap 100%
    const total = (budget.quality || 0) + (budget.quantity || 0) + (budget.ads || 0);
    if (total === 0) return;

    unit.budget.quality = Math.round(((budget.quality || 0) / total) * 100);
    unit.budget.quantity = Math.round(((budget.quantity || 0) / total) * 100);
    unit.budget.ads = 100 - unit.budget.quality - unit.budget.quantity;
  }
}
