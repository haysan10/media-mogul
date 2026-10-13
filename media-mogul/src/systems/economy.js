// economy.js — Lapisan 3: Simulasi Ekonomi, Q_unit, Pop_t, Product-Market Fit, Kontrak, Runway
import { CONFIG } from '../config.js';

export class EconomySystem {
  constructor(callbacks = {}) {
    this.onFloatingText = callbacks.onFloatingText || null;
  }

  /**
   * Hitung Kualitas Konten Q_unit (0-100)
   * Terpisah dari performa finansial / profitabilitas!
   */
  calculateQuality(unit, gameState) {
    const weights = CONFIG.QUALITY_WEIGHTS;

    // 1. Fit (Product-Market Fit)
    let fitValue = 0.85;
    if (unit.type === 'majalah-kantor' && unit.segment) {
      fitValue = CONFIG.MARKET_SEGMENTS[unit.segment]?.baseFit || 0.8;
    }
    // Sinergi teknologi era meningkatkan fit
    if (gameState.researchedNodes.includes('photojournalism') && unit.type === 'majalah-kantor') {
      fitValue = Math.min(1.0, fitValue + 0.15);
    }

    // 2. TechLevel (0..1)
    let techScore = 0.5;
    if (unit.type === 'koran-percetakan' && gameState.researchedNodes.includes('rotary_press')) techScore += 0.35;
    if (unit.type === 'radio-menara' && gameState.researchedNodes.includes('sound_recording')) techScore += 0.35;
    if (unit.type === 'tv-studio' && gameState.researchedNodes.includes('color_broadcast')) techScore += 0.35;
    if (unit.type === 'kreator-kantor' && gameState.researchedNodes.includes('world_wide_web')) techScore += 0.35;
    if (unit.type === 'sosmed-gedung' && gameState.researchedNodes.includes('mobile_algorithms')) techScore += 0.35;
    techScore = Math.min(1.0, techScore + (unit.level - 1) * 0.1);

    // 3. Quality Allocation Share (0..1)
    const allocScore = (unit.budget.quality || 40) / 100;

    // 4. Staff Skill & Coordination Cost (diminishing return jika staf melebihi optimal)
    let totalStaff = 0;
    let totalSkill = 0;
    for (const [stype, count] of Object.entries(unit.staff)) {
      if (count > 0) {
        totalStaff += count;
        totalSkill += count * (CONFIG.STAFF_TYPES[stype]?.skillValue || 20);
      }
    }

    const optimalStaff = CONFIG.OPTIMAL_STAFF_PER_LEVEL * unit.level;
    let coordinationPenalty = 0;
    if (totalStaff > optimalStaff) {
      coordinationPenalty = (totalStaff - optimalStaff) * CONFIG.COORDINATION_PENALTY_PER_EXTRA_STAFF;
    }

    const avgSkill = totalStaff > 0 ? (totalSkill / (totalStaff * 35)) * Math.max(0.4, 1 - coordinationPenalty) : 0.3;

    // 5. Scandal / Reputation Penalty
    let scandalPenalty = 0;
    if (gameState.reputation < 45) {
      scandalPenalty = (45 - gameState.reputation) / 45;
    }

    const q = (
      weights.wFit * fitValue +
      weights.wTech * techScore +
      weights.wAlloc * allocScore +
      weights.wStaff * avgSkill -
      weights.wPenalty * scandalPenalty
    );

    return Math.max(5, Math.min(100, Math.round(q)));
  }

  /**
   * Hitung Sinergi Lintas Media (Koran + Radio + TV dsb.)
   */
  calculateSynergyBonus(units) {
    if (!units || units.length === 0) return 0;
    const distinctEras = new Set(units.filter((u) => u.isOperational).map((u) => u.eraIndex));
    const count = distinctEras.size;
    if (count <= 1) return 0;
    return (count - 1) * CONFIG.SYNERGY_BONUS_PER_EXTRA_ERA;
  }

  /**
   * Simulasi Harian Ekonomi
   */
  tickDaily(gameState) {
    const synergy = this.calculateSynergyBonus(gameState.units);
    let totalDailyIncome = 0;
    let totalAudience = 0;

    for (const unit of gameState.units) {
      const bConfig = CONFIG.BUILDINGS[unit.type];
      if (!bConfig) continue;

      // Hitung kualitas konten unit
      unit.qualityScore = this.calculateQuality(unit, gameState);

      // Status ramp-up operasional (belum 100% jika masih masa konstruksi)
      const operationalFactor = unit.isOperational ? 1.0 : 0.25;

      // Popularitas dinamis (Pop_t)
      const pop = unit.popularity || 1.0;

      // Over-Ad Penalty jika porsi iklan > 50%
      const adsPct = unit.budget.ads || 30;
      const overAdPenalty = adsPct > 50 ? ((adsPct - 50) / 100) * 0.35 : 0;

      // Base Daily Revenue
      const baseDailyRate = (unit.audience / 100) * bConfig.baseAdRate * (unit.level * 0.7 + 0.3);
      const qualityFactor = unit.qualityScore / 100;
      const salesBoost = (unit.staff.sales || 0) * CONFIG.STAFF_TYPES.sales.adRevenueBoost;

      const dailyRevenue = baseDailyRate * qualityFactor * pop * (1 - overAdPenalty) * (1 + salesBoost) * (1 + synergy) * operationalFactor;

      unit.lastDailyRevenue = dailyRevenue;
      totalDailyIncome += dailyRevenue;

      // Pertumbuhan / Pengurangan Audiens Harian
      const baseGrowth = (bConfig.growthRate - 1.0) * (0.6 + 0.8 * qualityFactor);
      const adsLoss = adsPct > 55 ? ((adsPct - 55) / 100) * 0.04 : 0;
      const creatorBoost = (unit.staff.creator || 0) * CONFIG.STAFF_TYPES.creator.audienceGrowthBoost;

      const netGrowth = Math.max(0.97, 1.0 + baseGrowth + creatorBoost - adsLoss);
      unit.audience = Math.round(unit.audience * netGrowth);
      totalAudience += unit.audience;

      // Efek Reputasi Harian
      if (unit.budget.quality > 60) {
        gameState.reputation = Math.min(100, gameState.reputation + 0.02);
      }
      if (adsPct > 65) {
        gameState.reputation = Math.max(0, gameState.reputation - 0.04);
      }

      // Visual floating text tiap 5 hari per unit
      if (gameState.day % 5 === (unit.plotId % 5) && this.onFloatingText && unit.isOperational) {
        this.onFloatingText(Math.round(dailyRevenue * 5), unit.plotId, 'income');
      }
    }

    gameState.totalAudience = totalAudience;
    if (totalAudience > (gameState.stats.peakAudience || 0)) {
      gameState.stats.peakAudience = totalAudience;
    }

    // Update tren audiens (6 titik historis)
    if (gameState.day === 1 || gameState.day === 15) {
      gameState.audienceHistory.shift();
      gameState.audienceHistory.push(totalAudience);
    }

    gameState.money += totalDailyIncome;
    gameState.stats.totalLifetimeEarnings += totalDailyIncome;
  }

  /**
   * Penutupan Buku Bulanan:
   * KasAkhir = KasAwal + Penjualan + Kontrak - Operasional - Gaji - Riset
   */
  tickMonthly(gameState) {
    const openingCash = Math.round(gameState.money);
    let totalSalesIncome = 0;
    let totalContractIncome = 0;
    let totalOperationalCost = 0;
    let totalStaffSalaries = 0;

    // Evaluasi Popularitas Unit & Kontrak Bulanan
    for (const unit of gameState.units) {
      const bConfig = CONFIG.BUILDINGS[unit.type];
      if (!bConfig) continue;

      // 1. Peluruhan Popularitas Alami (Pop_t decay)
      const decayRate = CONFIG.ERA_POPULARITY_DECAY[unit.eraIndex] || 0.95;
      const quantityBoost = ((unit.budget.quantity || 30) / 50) * 0.06;
      unit.popularity = Math.max(0.3, Math.min(2.5, Number(((unit.popularity || 1.0) * decayRate + quantityBoost).toFixed(2))));

      // 2. Akumulasi Pendapatan Penjualan Iklan Bulanan
      totalSalesIncome += (unit.lastDailyRevenue || 0) * CONFIG.DAYS_PER_MONTH;

      // 3. Kontrak Sponsor Tetap (Radio & TV)
      if (bConfig.contractMonthlyIncome && unit.isOperational) {
        if (gameState.reputation >= bConfig.contractMinReputation) {
          const contractVal = bConfig.contractMonthlyIncome * unit.level;
          totalContractIncome += contractVal;
        } else {
          gameState.logs.unshift({
            text: `KONTRAK DIBATALKAN: Sponsor program ${unit.name} hengkang karena reputasi di bawah ${bConfig.contractMinReputation}!`,
            type: 'warning',
          });
        }
      }

      // 4. Biaya Operasional Bangunan (selalu naik tiap upgrade level)
      const upkeep = bConfig.baseUpkeep * (1 + (unit.level - 1) * 0.6);
      totalOperationalCost += upkeep;

      // 5. Gaji Seluruh Staf Terpasang
      for (const [stype, count] of Object.entries(unit.staff)) {
        const staffCfg = CONFIG.STAFF_TYPES[stype];
        if (staffCfg && count > 0) {
          totalStaffSalaries += staffCfg.salary * count;
        }
      }
    }

    const totalExpenses = totalOperationalCost + totalStaffSalaries;
    const totalIncome = totalSalesIncome + totalContractIncome;
    const netProfit = totalIncome - totalExpenses;

    // Potong pengeluaran bulanan dari kas
    gameState.money -= totalExpenses;
    const closingCash = Math.round(gameState.money);

    // Update Riwayat 3 Bulan Pengeluaran untuk Hitungan Runway
    gameState.financialHistory3Months.shift();
    gameState.financialHistory3Months.push(Math.round(totalExpenses));

    const avgExpense3M = gameState.financialHistory3Months.reduce((a, b) => a + b, 0) / 3;
    gameState.runwayMonths = Math.max(0, Number((gameState.money / Math.max(1, avgExpense3M)).toFixed(1)));

    // Buat Kalimat Insight Sebab-Akibat Otomatis
    let insight = 'Operasional stabil: Arus kas berjalan seimbang dengan alokasi konten saat ini.';
    if (gameState.runwayMonths < CONFIG.RUNWAY_WARNING_THRESHOLD) {
      insight = `PERINGATAN RUNWAY KRITIS: Dana cadangan kas sisa ${gameState.runwayMonths} bulan! Segera kurangi staf atau naikkan pendapatan iklan.`;
    } else if (netProfit < 0) {
      insight = `Defisit bulanan -$${Math.abs(Math.round(netProfit))}: Biaya rutin operasional & gaji melebihi hasil penjualan.`;
    } else if (totalContractIncome > 0) {
      insight = `Kinerja prima: Kontrak sponsor menyumbang +$${Math.round(totalContractIncome)} penopang likuiditas yang solid.`;
    }

    // Catat Laporan Arus Kas Bulanan Lengkap (Screen #9)
    gameState.lastMonthlyReport = {
      openingCash,
      salesIncome: Math.round(totalSalesIncome),
      contractIncome: Math.round(totalContractIncome),
      operationalCosts: Math.round(totalOperationalCost),
      staffSalaries: Math.round(totalStaffSalaries),
      researchCosts: 0,
      closingCash,
      netProfit: Math.round(netProfit),
      insightText: insight,
      marketShareChange: 0,
    };

    // Evaluasi Status Defisit
    if (gameState.money < 0) {
      gameState.consecutiveDebtMonths += 1;
      gameState.logs.unshift({
        text: `PERINGATAN DEFISIT KAS: Saldo minus ($${Math.round(gameState.money)}). Bulan berturut-turut minus: ${gameState.consecutiveDebtMonths}/2.`,
        type: 'error',
      });
    } else {
      gameState.consecutiveDebtMonths = 0;
      gameState.logs.unshift({
        text: `Laporan Keuangan Bln ${gameState.month}/${gameState.year}: Laba Bersih ${netProfit >= 0 ? '+' : ''}$${Math.round(netProfit)}. Runway: ${gameState.runwayMonths} bulan.`,
        type: netProfit >= 0 ? 'success' : 'warning',
      });
    }

    if (gameState.logs.length > 30) gameState.logs.pop();
  }
}
