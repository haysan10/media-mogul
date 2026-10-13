// staffManager.js — Lapisan 3: Human Resource Management, Kapasitas Optimal & Biaya Koordinasi
import { CONFIG } from '../config.js';

export class StaffManager {
  /**
   * Rekrut staf dengan evaluasi kapasitas ruangan & penalti koordinasi
   */
  static hireStaff(unitId, staffType, gameState) {
    const unit = gameState.units.find((u) => u.id === unitId);
    if (!unit) return { success: false, reason: 'Unit tidak ditemukan' };

    const staffCfg = CONFIG.STAFF_TYPES[staffType];
    if (!staffCfg) return { success: false, reason: 'Tipe staf tidak valid' };

    const hiringFee = Math.round(staffCfg.salary * 0.5); // Biaya rekrutmen & onboarding
    if (gameState.money < hiringFee) {
      return { success: false, reason: `Dana tidak cukup untuk biaya rekrutmen (Butuh $${hiringFee})` };
    }

    // Batas absolut staf per unit
    const maxAbsoluteStaff = unit.level * 5;
    const currentTotalStaff = Object.values(unit.staff).reduce((a, b) => a + b, 0);
    if (currentTotalStaff >= maxAbsoluteStaff) {
      return { success: false, reason: `Gedung penuh! Tingkatkan level unit untuk menambah kapasitas meja kerja (Maksimal ${maxAbsoluteStaff} staf).` };
    }

    // Cek apakah melebihi kapasitas optimal (peringatan diminishing return)
    const optimalStaff = CONFIG.OPTIMAL_STAFF_PER_LEVEL * unit.level;
    const willExceedOptimal = currentTotalStaff + 1 > optimalStaff;

    gameState.money -= hiringFee;
    unit.staff[staffType] = (unit.staff[staffType] || 0) + 1;

    let logMsg = `Merekrut 1 ${staffCfg.name} untuk ${unit.name} (Gaji: $${staffCfg.salary}/bln).`;
    if (willExceedOptimal) {
      logMsg += ` Perhatian: Staf melebihi kapasitas optimal (${optimalStaff}), memicu penalti koordinasi tim.`;
    }

    gameState.logs.unshift({
      text: logMsg,
      type: willExceedOptimal ? 'warning' : 'info',
    });

    return { success: true, warnedCoordination: willExceedOptimal };
  }

  /**
   * Berhentikan staf dengan pembayaran pesangon
   */
  static fireStaff(unitId, staffType, gameState) {
    const unit = gameState.units.find((u) => u.id === unitId);
    if (!unit) return { success: false, reason: 'Unit tidak ditemukan' };

    const curCount = unit.staff[staffType] || 0;
    if (curCount <= 0) {
      return { success: false, reason: 'Tidak ada staf tipe ini untuk diberhentikan' };
    }

    const severancePay = 100; // Uang pesangon
    if (gameState.money < severancePay) {
      return { success: false, reason: `Kas tidak cukup untuk membayar uang pesangon ($${severancePay})` };
    }

    gameState.money -= severancePay;
    unit.staff[staffType] = curCount - 1;

    gameState.logs.unshift({
      text: `Memberhentikan 1 ${CONFIG.STAFF_TYPES[staffType]?.name || staffType} dari ${unit.name} (Pesangon: -$${severancePay}).`,
      type: 'info',
    });

    return { success: true };
  }
}
