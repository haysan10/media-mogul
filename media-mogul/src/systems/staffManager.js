// staffManager.js — Manajemen rekrutmen dan perampingan staf unit media
import { CONFIG } from '../config.js';

export class StaffManager {
  /**
   * Rekrut staf baru ke dalam unit
   */
  static hireStaff(unitId, staffType, gameState) {
    const unit = gameState.units.find((u) => u.id === unitId);
    if (!unit) return { success: false, reason: 'Unit tidak ditemukan' };

    const staffConfig = CONFIG.STAFF_TYPES[staffType];
    if (!staffConfig) return { success: false, reason: 'Tipe staf tidak valid' };

    // Maksimal staf berdasarkan level unit (mis. level 1 max 5, level 5 max 25)
    const maxStaffPerType = unit.level * 4;
    const curCount = unit.staff[staffType] || 0;
    if (curCount >= maxStaffPerType) {
      return { success: false, reason: `Maksimal ${maxStaffPerType} staf untuk level unit saat ini.` };
    }

    unit.staff[staffType] = curCount + 1;
    gameState.logs.unshift({
      text: `Merekrut 1 ${staffConfig.name} baru untuk ${unit.name} (Gaji: $${staffConfig.salary}/bln).`,
      type: 'info',
    });

    return { success: true };
  }

  /**
   * Berhentikan staf dari unit
   */
  static fireStaff(unitId, staffType, gameState) {
    const unit = gameState.units.find((u) => u.id === unitId);
    if (!unit) return { success: false, reason: 'Unit tidak ditemukan' };

    const curCount = unit.staff[staffType] || 0;
    if (curCount <= 0) {
      return { success: false, reason: 'Tidak ada staf jenis ini untuk diberhentikan.' };
    }

    unit.staff[staffType] = curCount - 1;
    gameState.logs.unshift({
      text: `Memberhentikan 1 ${CONFIG.STAFF_TYPES[staffType]?.name || staffType} dari ${unit.name}.`,
      type: 'info',
    });

    return { success: true };
  }
}
