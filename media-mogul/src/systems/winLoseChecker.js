// winLoseChecker.js — Pemeriksaan berkala kondisi menang atau kalah
import { CONFIG } from '../config.js';

export class WinLoseChecker {
  static check(gameState) {
    if (gameState.gameStatus !== 'playing') return gameState.gameStatus;

    // 1. Kondisi Kalah
    if (gameState.consecutiveDebtMonths >= CONFIG.LOSE_MAX_DEBT_MONTHS) {
      gameState.gameStatus = 'lost';
      gameState.speed = 0;
      gameState.endStats = this.compileStats(gameState, 'Kebangkrutan Finansial: Kas berada di bawah nol selama 2 bulan berturut-turut.');
      return 'lost';
    }

    if (gameState.reputation <= CONFIG.LOSE_MIN_REPUTATION) {
      gameState.gameStatus = 'lost';
      gameState.speed = 0;
      gameState.endStats = this.compileStats(gameState, 'Skandal Reputasi Total: Kredibilitas media Anda mencapai titik nol.');
      return 'lost';
    }

    // 2. Kondisi Menang: Era 6 & Mempertahankan #1 selama 12 bulan berturut-turut
    if (
      gameState.currentEraIndex >= CONFIG.WIN_TARGET_ERA &&
      gameState.consecutiveMonthsAsTop1 >= CONFIG.WIN_CONSECUTIVE_MONTHS_TOP1
    ) {
      gameState.gameStatus = 'won';
      gameState.speed = 0;
      gameState.endStats = this.compileStats(gameState, 'Mogul Media Sejati! Anda menguasai era sosial media dan mendominasi pangsa pasar selama 1 tahun penuh!');
      return 'won';
    }

    return 'playing';
  }

  static compileStats(gameState, summaryReason) {
    return {
      reason: summaryReason,
      finalMoney: Math.round(gameState.money),
      finalReputation: Math.round(gameState.reputation),
      finalAudience: gameState.totalAudience,
      peakAudience: gameState.stats.peakAudience || gameState.totalAudience,
      unitsBuilt: gameState.stats.totalUnitsBuilt,
      eventsResolved: gameState.stats.eventsResolved,
      yearsPlayed: `${gameState.year} (Bulan ${gameState.month})`,
      lifetimeEarnings: Math.round(gameState.stats.totalLifetimeEarnings),
    };
  }
}
