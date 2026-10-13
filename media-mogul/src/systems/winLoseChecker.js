// winLoseChecker.js — Lapisan 3: Kondisi Menang/Kalah & Penyusunan Post-Mortem
import { CONFIG } from '../config.js';

export class WinLoseChecker {
  static check(gameState) {
    if (gameState.gameStatus !== 'playing') return gameState.gameStatus;

    // 1. Kondisi Kalah: Kebangkrutan Finansial (Kas minus 2 bulan berturut-turut)
    if (gameState.consecutiveDebtMonths >= CONFIG.LOSE_MAX_DEBT_MONTHS) {
      gameState.gameStatus = 'lost';
      gameState.speed = 0;
      gameState.postMortem = this.compilePostMortem(
        gameState,
        'Kebangkrutan Finansial (Kas Negatif 2 Bulan Berturut-turut)',
        'Arus kas rutin Anda berada di zona merah selama 60 hari berturut-turut tanpa likuiditas cadangan untuk membayar gaji dan operasional mesin.'
      );
      return 'lost';
    }

    // 2. Kondisi Kalah: Skandal Reputasi Total (Reputasi 0)
    if (gameState.reputation <= CONFIG.LOSE_MIN_REPUTATION) {
      gameState.gameStatus = 'lost';
      gameState.speed = 0;
      gameState.postMortem = this.compilePostMortem(
        gameState,
        'Kehancuran Kredibilitas Total (Reputasi 0)',
        'Kepercayaan masyarakat dan asosiasi pers terhadap media Anda musnah akibat kompromi redaksi, berita palsu, atau pemerasan iklan berlebihan.'
      );
      return 'lost';
    }

    // 3. Kondisi Menang: Era 6 + Peringkat #1 selama 12 bulan berturut-turut
    if (
      gameState.currentEraIndex >= CONFIG.WIN_TARGET_ERA &&
      gameState.consecutiveMonthsAsTop1 >= CONFIG.WIN_CONSECUTIVE_MONTHS_TOP1
    ) {
      gameState.gameStatus = 'won';
      gameState.speed = 0;
      gameState.postMortem = this.compileVictorySummary(gameState);
      return 'won';
    }

    return 'playing';
  }

  /**
   * Susun data post-mortem mendalam (Screen #12b)
   * Menjawab: (1) Apa yang terjadi, (2) Kenapa, (3) Apa yang bisa dilakukan
   */
  static compilePostMortem(gameState, title, explanation) {
    const report = gameState.lastMonthlyReport;
    const avgExpense = Math.round(gameState.financialHistory3Months.reduce((a, b) => a + b, 0) / 3);

    return {
      isWin: false,
      title,
      explanation,
      // 3 Bulan breakdown
      financialSummary: {
        lastCash: Math.round(gameState.money),
        avgExpenses3M: avgExpense,
        lastIncome: report?.salesIncome + report?.contractIncome || 0,
        lastStaffCost: report?.staffSalaries || 0,
        lastOperCost: report?.operationalCosts || 0,
      },
      riskyDecisions: gameState.stats.riskyDecisionsTaken.slice(-4),
      recommendations: [
        'Pertahankan rasio Runway minimal 3-6 bulan sebelum memutuskan ekspansi atau rekrutmen staf baru.',
        'Jangan pasang kerapatan iklan di atas 50% karena akan memicu peluruhan audiens jangka panjang.',
        'Perhatikan kapasitas optimal staf per gedung untuk menghindari penalti biaya koordinasi yang sia-sia.',
      ],
      yearsPlayed: `${gameState.year} (Bulan ${gameState.month})`,
      peakAudience: gameState.stats.peakAudience || gameState.totalAudience,
    };
  }

  static compileVictorySummary(gameState) {
    return {
      isWin: true,
      title: 'Mogul Media Sejati Abad Ini!',
      explanation: 'Selamat! Kerajaan media Anda berhasil menaklukkan seluruh revolusi informasi dari mesin cetak manual hingga algoritma viral modern, serta memimpin pangsa pasar selama 1 tahun penuh.',
      financialSummary: {
        lastCash: Math.round(gameState.money),
        totalEarnings: Math.round(gameState.stats.totalLifetimeEarnings),
      },
      yearsPlayed: `${gameState.year} (Bulan ${gameState.month})`,
      peakAudience: gameState.stats.peakAudience || gameState.totalAudience,
      unitsBuilt: gameState.stats.totalUnitsBuilt,
    };
  }
}
