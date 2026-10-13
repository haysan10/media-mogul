// eraManager.js — Transisi dan syarat pembukaan era media baru
import { CONFIG } from '../config.js';

export class EraManager {
  /**
   * Cek kelayakan membuka era tertentu
   */
  static checkEligibility(eraIndex, gameState) {
    if (eraIndex <= gameState.currentEraIndex) {
      return { eligible: false, reason: 'Era ini sudah aktif' };
    }
    if (eraIndex > gameState.currentEraIndex + 1) {
      return { eligible: false, reason: 'Harus membuka era sebelumnya terlebih dahulu' };
    }

    const era = CONFIG.ERAS[eraIndex];
    if (!era) return { eligible: false, reason: 'Era tidak valid' };

    // Cek riset wajib
    if (era.requiredResearch && !gameState.researchedNodes.includes(era.requiredResearch)) {
      const node = CONFIG.RESEARCH_NODES.find((n) => n.id === era.requiredResearch);
      return { eligible: false, reason: `Butuh riset "${node?.title || era.requiredResearch}"` };
    }

    // Cek reputasi minimum
    if (gameState.reputation < era.unlockReputation) {
      return { eligible: false, reason: `Butuh reputasi minimal ${era.unlockReputation} (sekarang: ${Math.round(gameState.reputation)})` };
    }

    // Cek uang investasi era
    if (gameState.money < era.unlockCost) {
      return { eligible: false, reason: `Butuh dana modal $${era.unlockCost.toLocaleString()}` };
    }

    return { eligible: true };
  }

  /**
   * Maju ke era berikutnya
   */
  static advanceEra(eraIndex, gameState, world) {
    const check = this.checkEligibility(eraIndex, gameState);
    if (!check.eligible) return { success: false, reason: check.reason };

    const era = CONFIG.ERAS[eraIndex];
    gameState.money -= era.unlockCost;
    gameState.currentEraIndex = eraIndex;

    // Picu transisi warna langit, fog, dan pencahayaan diorama 3D
    if (world) {
      world.applyEraColors(eraIndex, true);
    }

    gameState.logs.unshift({
      text: `TRANSISI ERA: Selamat datang di ${era.name.toUpperCase()} (${era.year})! Gedung baru "${era.buildingName}" kini dapat dibangun.`,
      type: 'success',
    });

    return { success: true };
  }
}
