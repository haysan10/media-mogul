// eraManager.js — Lapisan 3: Transisi Era & Evaluasi Kelayakan
import { CONFIG } from '../config.js';

export class EraManager {
  static checkEligibility(eraIndex, gameState) {
    if (eraIndex <= gameState.currentEraIndex) {
      return { eligible: false, reason: 'Era ini sudah aktif' };
    }
    if (eraIndex > gameState.currentEraIndex + 1) {
      return { eligible: false, reason: 'Harus membuka era sebelumnya terlebih dahulu' };
    }

    const era = CONFIG.ERAS[eraIndex];
    if (!era) return { eligible: false, reason: 'Era tidak valid' };

    // Validasi Riset
    if (era.requiredResearch && !gameState.researchedNodes.includes(era.requiredResearch)) {
      const node = CONFIG.RESEARCH_NODES.find((n) => n.id === era.requiredResearch);
      return { eligible: false, reason: `Wajib menguasai riset "${node?.title || era.requiredResearch}"` };
    }

    // Validasi Reputasi
    if (gameState.reputation < era.unlockReputation) {
      return { eligible: false, reason: `Membutuhkan reputasi minimal ${era.unlockReputation} (Saat ini: ${Math.round(gameState.reputation)})` };
    }

    // Validasi Dana
    if (gameState.money < era.unlockCost) {
      return { eligible: false, reason: `Dana ekspansi tidak cukup (Butuh $${era.unlockCost.toLocaleString()})` };
    }

    return { eligible: true };
  }

  static advanceEra(eraIndex, gameState, onEraColorChange = null) {
    const check = this.checkEligibility(eraIndex, gameState);
    if (!check.eligible) return { success: false, reason: check.reason };

    const era = CONFIG.ERAS[eraIndex];
    gameState.money -= era.unlockCost;
    gameState.currentEraIndex = eraIndex;

    if (typeof onEraColorChange === 'function') {
      onEraColorChange(eraIndex);
    }

    gameState.logs.unshift({
      text: `REVOLUSI MEDIA: Masuk ke ${era.name.toUpperCase()} (${era.year})! Kemampuan baru: ${era.newCapability}. Tanggung jawab baru: ${era.newResponsibility}.`,
      type: 'success',
    });

    return { success: true, era };
  }
}
