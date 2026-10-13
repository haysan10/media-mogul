// unitManager.js — Lapisan 3: Logika Unit, Alur Validasi, Masa Ramp-up, Upgrade & Segmen Pasar
import { CONFIG } from '../config.js';

export class UnitManager {
  constructor(callbacks = {}) {
    this.onSpawnVisual = callbacks.onSpawnVisual || null;
    this.onRemoveVisual = callbacks.onRemoveVisual || null;
    this.onFloatingText = callbacks.onFloatingText || null;
  }

  /**
   * Bangun unit media baru dengan validasi ketat & masa ramp-up
   */
  buildUnit(plotId, buildingAssetId, gameState) {
    // 1. Validasi Kavling
    const plot = gameState.plots[plotId];
    if (!plot) return { success: false, reason: 'Kavling tidak valid' };
    if (plot.unit) return { success: false, reason: 'Kavling sudah terisi bangunan lain' };

    // 2. Validasi Tipe Bangunan & Era
    const bConfig = CONFIG.BUILDINGS[buildingAssetId];
    if (!bConfig) return { success: false, reason: 'Tipe bangunan tidak dikenal' };

    if (bConfig.eraIndex > gameState.currentEraIndex) {
      const targetEra = CONFIG.ERAS[bConfig.eraIndex];
      return { success: false, reason: `Terkunci: Membutuhkan ${targetEra?.name || 'Era Berikutnya'}` };
    }

    // 3. Validasi Keuangan
    if (gameState.money < bConfig.buildCost) {
      return { success: false, reason: `Dana tidak mencukupi (Butuh $${bConfig.buildCost.toLocaleString()})` };
    }

    // 4. Eksekusi Pembelian
    gameState.money -= bConfig.buildCost;

    const newUnit = {
      id: gameState.nextUnitId++,
      plotId: plotId,
      type: buildingAssetId,
      name: bConfig.name,
      eraIndex: bConfig.eraIndex,
      level: 1,
      isOperational: false, // Masa ramp-up (5-10 hari)
      audience: bConfig.baseAudience,
      popularity: 1.0,
      qualityScore: 50,
      segment: buildingAssetId === 'majalah-kantor' ? 'lifestyle' : null,
      staff: {
        reporter: 1,
        editor: 1,
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

    // Masukkan ke antrean ramp-up konstruksi
    gameState.rampUpQueue.push({
      unitId: newUnit.id,
      remainingDays: CONFIG.RAMP_UP_DAYS,
      totalDays: CONFIG.RAMP_UP_DAYS,
    });

    // Panggil presentasi visual (scaffolding/bangunan)
    if (this.onSpawnVisual) {
      this.onSpawnVisual(plotId, buildingAssetId, 1, false);
    }

    if (this.onFloatingText) {
      this.onFloatingText(-bConfig.buildCost, plotId, 'expense');
    }

    gameState.logs.unshift({
      text: `Membangun ${bConfig.name} di Kavling #${plotId + 1}! Masa konstruksi & onboarding ${CONFIG.RAMP_UP_DAYS} hari.`,
      type: 'info',
    });

    return { success: true, unit: newUnit };
  }

  /**
   * Tingkatkan level unit media
   */
  upgradeUnit(unitId, gameState) {
    const unit = gameState.units.find((u) => u.id === unitId);
    if (!unit) return { success: false, reason: 'Unit tidak ditemukan' };

    const bConfig = CONFIG.BUILDINGS[unit.type];
    if (!bConfig) return { success: false, reason: 'Konfigurasi unit tidak valid' };

    if (unit.level >= bConfig.maxLevel) {
      return { success: false, reason: 'Unit sudah mencapai level maksimum (Level 5)' };
    }

    // Syarat Staf Minimum untuk Upgrade
    const requiredMinStaff = unit.level * 2;
    const totalStaff = Object.values(unit.staff).reduce((a, b) => a + b, 0);
    if (totalStaff < requiredMinStaff) {
      return { success: false, reason: `Butuh minimal ${requiredMinStaff} staf sebelum ekspansi ke Level ${unit.level + 1} (Saat ini: ${totalStaff})` };
    }

    // Biaya Upgrade
    const upgradeCost = Math.round(bConfig.buildCost * Math.pow(bConfig.upgradeMultiplier, unit.level));
    if (gameState.money < upgradeCost) {
      return { success: false, reason: `Dana tidak cukup untuk upgrade (Butuh $${upgradeCost.toLocaleString()})` };
    }

    gameState.money -= upgradeCost;
    unit.level += 1;
    unit.audience = Math.round(unit.audience * 1.45);
    unit.popularity = Math.min(2.5, (unit.popularity || 1.0) + 0.25);

    if (this.onSpawnVisual) {
      this.onSpawnVisual(unit.plotId, unit.type, unit.level, true);
    }

    if (this.onFloatingText) {
      this.onFloatingText(-upgradeCost, unit.plotId, 'expense');
      this.onFloatingText(`Level ${unit.level}!`, unit.plotId, 'rep');
    }

    gameState.logs.unshift({
      text: `UPGRADE BERHASIL: ${unit.name} naik ke Level ${unit.level}! Biaya operasional rutin bertambah.`,
      type: 'success',
    });

    return { success: true, unit };
  }

  /**
   * Ganti segmen pasar (Product-Market Fit untuk majalah)
   */
  setSegment(unitId, segmentKey, gameState) {
    const unit = gameState.units.find((u) => u.id === unitId);
    if (!unit || unit.type !== 'majalah-kantor') return;

    if (CONFIG.MARKET_SEGMENTS[segmentKey]) {
      unit.segment = segmentKey;
      gameState.logs.unshift({
        text: `${unit.name} mengubah fokus segmen ke: "${CONFIG.MARKET_SEGMENTS[segmentKey].name}".`,
        type: 'info',
      });
    }
  }

  /**
   * Robohkan unit dan dapatkan sebagian nilai besi tua
   */
  demolishUnit(unitId, gameState) {
    const idx = gameState.units.findIndex((u) => u.id === unitId);
    if (idx === -1) return { success: false, reason: 'Unit tidak ditemukan' };

    const unit = gameState.units[idx];
    const bConfig = CONFIG.BUILDINGS[unit.type];
    const scrapRefund = Math.round((bConfig?.buildCost || 1000) * 0.3);

    gameState.money += scrapRefund;

    const plot = gameState.plots[unit.plotId];
    if (plot) plot.unit = null;

    if (this.onRemoveVisual) {
      this.onRemoveVisual(unit.plotId);
    }

    gameState.units.splice(idx, 1);

    // Bersihkan dari antrean ramp-up jika ada
    gameState.rampUpQueue = gameState.rampUpQueue.filter((q) => q.unitId !== unitId);

    gameState.logs.unshift({
      text: `${unit.name} dirobohkan. Nilai pengembalian besi tua: +$${scrapRefund}.`,
      type: 'info',
    });

    return { success: true };
  }

  /**
   * Atur alokasi anggaran Kualitas vs Kuantitas vs Iklan
   */
  setBudgetAllocation(unitId, budget, gameState) {
    const unit = gameState.units.find((u) => u.id === unitId);
    if (!unit) return;

    const total = (budget.quality || 0) + (budget.quantity || 0) + (budget.ads || 0);
    if (total === 0) return;

    unit.budget.quality = Math.round(((budget.quality || 0) / total) * 100);
    unit.budget.quantity = Math.round(((budget.quantity || 0) / total) * 100);
    unit.budget.ads = 100 - unit.budget.quality - unit.budget.quantity;
  }
}
