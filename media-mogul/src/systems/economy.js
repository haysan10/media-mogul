// economy.js — Simulasi pendapatan harian, gaji bulanan, sinergi media, dan laporan keuangan
import { CONFIG } from '../config.js';

export class EconomySystem {
  constructor(vfxManager, buildingManager) {
    this.vfx = vfxManager;
    this.buildings = buildingManager;
    this.dayTimer = 0;
  }

  /**
   * Hitung sinergi media: bonus jika memiliki unit dari berbagai era berbeda
   */
  calculateSynergyBonus(units) {
    if (!units || units.length === 0) return 0;
    const distinctEras = new Set(units.map((u) => u.eraIndex));
    const count = distinctEras.size;
    if (count <= 1) return 0;
    // Misalnya punya Koran + Radio + TV = 3 era -> 2 era ekstra -> +16% bonus
    return (count - 1) * CONFIG.SYNERGY_BONUS_PER_EXTRA_ERA;
  }

  /**
   * Hitung total pendapatan harian seluruh unit
   */
  tickDailyEconomy(gameState) {
    const synergy = this.calculateSynergyBonus(gameState.units);
    let totalDailyIncome = 0;
    let totalAudience = 0;

    for (const unit of gameState.units) {
      const bConfig = CONFIG.BUILDINGS[unit.type];
      if (!bConfig) continue;

      // Efek alokasi anggaran
      const qualityFactor = unit.budget.quality / 50; // 0..2
      const quantityFactor = unit.budget.quantity / 50;
      const adsFactor = unit.budget.ads / 50;

      // Efek Staf
      const reporterBoost = (unit.staff.reporter || 0) * CONFIG.STAFF_TYPES.reporter.qualityBoost;
      const editorBoost = (unit.staff.editor || 0) * CONFIG.STAFF_TYPES.editor.qualityBoost;
      const creatorBoost = (unit.staff.creator || 0) * CONFIG.STAFF_TYPES.creator.audienceGrowthBoost;
      const salesBoost = (unit.staff.sales || 0) * CONFIG.STAFF_TYPES.sales.adRevenueBoost;

      // Efek Riset & Upgrade
      let techBonus = 1.0;
      if (unit.type === 'koran-percetakan' && gameState.researchedNodes.includes('rotary_press')) techBonus += 0.2;
      if (unit.type === 'majalah-kantor' && gameState.researchedNodes.includes('photojournalism')) techBonus += 0.25;
      if (unit.type === 'radio-menara' && gameState.researchedNodes.includes('sound_recording')) techBonus += 0.3;
      if (unit.type === 'tv-studio' && gameState.researchedNodes.includes('color_broadcast')) techBonus += 0.35;
      if (unit.type === 'kreator-kantor' && gameState.researchedNodes.includes('world_wide_web')) techBonus += 0.3;
      if (unit.type === 'sosmed-gedung' && gameState.researchedNodes.includes('mobile_algorithms')) techBonus += 0.4;

      // Pertumbuhan Audiens Harian
      const baseGrowth = (bConfig.growthRate - 1.0) * (0.8 + 0.4 * qualityFactor + creatorBoost);
      const adsPenalty = unit.budget.ads > 45 ? ((unit.budget.ads - 45) / 100) * 0.05 : 0;
      const netDailyGrowthRate = Math.max(0.98, 1.0 + baseGrowth - adsPenalty);

      unit.audience = Math.round(unit.audience * netDailyGrowthRate * (1 + synergy * 0.05));
      totalAudience += unit.audience;

      // Pendapatan Iklan Harian
      const adRate = bConfig.baseAdRate * (1 + salesBoost) * adsFactor * techBonus * (1 + synergy);
      const dailyRevenue = (unit.audience / 100) * adRate * (unit.level * 0.8 + 0.2);

      unit.lastDailyRevenue = dailyRevenue;
      totalDailyIncome += dailyRevenue;

      // Efek Reputasi: kualitas tinggi menaikkan reputasi, iklan berlebihan menurunkan
      if (unit.budget.quality > 55) {
        gameState.reputation = Math.min(100, gameState.reputation + 0.02);
      }
      if (unit.budget.ads > 60) {
        gameState.reputation = Math.max(0, gameState.reputation - 0.03);
      }

      // Visual efek floating text sesekali (setiap 5 hari per unit agar rapi & menyenangkan)
      if (gameState.day % 5 === (unit.plotId % 5) && this.vfx) {
        const pos = this.buildings.getBuildingPosition(unit.plotId);
        if (pos) {
          this.vfx.spawnFloatingText(Math.round(dailyRevenue * 5), pos, 'income');
        }
      }
    }

    gameState.totalAudience = totalAudience;
    if (totalAudience > (gameState.stats.peakAudience || 0)) {
      gameState.stats.peakAudience = totalAudience;
    }

    gameState.money += totalDailyIncome;
    gameState.stats.totalLifetimeEarnings += totalDailyIncome;
  }

  /**
   * Pembukuan akhir bulan: gaji staf, biaya operasional gedung, dan laba bersih
   */
  tickMonthlyAccounting(gameState) {
    let totalMonthlySalaries = 0;
    let totalMonthlyUpkeep = 0;
    let totalMonthlyIncomeEstimate = 0;

    for (const unit of gameState.units) {
      const bConfig = CONFIG.BUILDINGS[unit.type];
      if (!bConfig) continue;

      // Upkeep operasional bangunan (naik sesuai level)
      const upkeep = bConfig.baseUpkeep * (1 + (unit.level - 1) * 0.5);
      totalMonthlyUpkeep += upkeep;

      // Gaji seluruh staf pada unit ini
      let unitSalaries = 0;
      for (const [staffKey, count] of Object.entries(unit.staff)) {
        const staffConfig = CONFIG.STAFF_TYPES[staffKey];
        if (staffConfig && count > 0) {
          unitSalaries += staffConfig.salary * count;
        }
      }
      totalMonthlySalaries += unitSalaries;

      totalMonthlyIncomeEstimate += (unit.lastDailyRevenue || 0) * CONFIG.DAYS_PER_MONTH;
    }

    const totalMonthlyExpenses = totalMonthlySalaries + totalMonthlyUpkeep;
    gameState.money -= totalMonthlyExpenses;

    const netProfit = totalMonthlyIncomeEstimate - totalMonthlyExpenses;

    gameState.monthlyHistory = {
      lastIncome: Math.round(totalMonthlyIncomeEstimate),
      lastExpenses: Math.round(totalMonthlyExpenses),
      lastProfit: Math.round(netProfit),
    };

    // Evaluasi status utang
    if (gameState.money < 0) {
      gameState.consecutiveDebtMonths += 1;
      gameState.logs.unshift({
        text: `PERINGATAN DEFISIT: Kas media minus (-$${Math.abs(Math.round(gameState.money))}). Bulan berturut-turut minus: ${gameState.consecutiveDebtMonths}/2.`,
        type: 'error',
      });
    } else {
      gameState.consecutiveDebtMonths = 0;
      gameState.logs.unshift({
        text: `Laporan Keuangan Bulan ${gameState.month}/${gameState.year}: Laba Bersih +$${Math.round(netProfit)} (Audiens: ${gameState.totalAudience.toLocaleString()}).`,
        type: 'success',
      });
    }

    // Pangkas log agar tidak membengkak
    if (gameState.logs.length > 25) {
      gameState.logs.pop();
    }
  }
}
