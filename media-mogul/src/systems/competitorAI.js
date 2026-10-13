// competitorAI.js — Simulasi pesaing media AI dan pangsa pasar nasional
import { CONFIG } from '../config.js';

export class CompetitorAISystem {
  /**
   * Simulasi pertumbuhan audiens kompetitor harian
   */
  static tickDailyCompetitors(gameState) {
    const eraIdx = gameState.currentEraIndex;

    for (const comp of gameState.competitors) {
      // Pertumbuhan kompetitor proporsional dengan era yang sedang berlangsung
      const eraMultiplier = 1.0 + eraIdx * 0.15;
      const jitter = (Math.random() - 0.48) * 0.006;
      const dailyRate = 1.0 + (comp.aggressiveness ? (comp.aggressiveness - 1.0) * 0.1 : 0.003) * eraMultiplier + jitter;

      comp.audience = Math.round(comp.audience * dailyRate);
    }

    this.recalculateMarketShare(gameState);
  }

  /**
   * Hitung ulang persentase pangsa pasar pemain vs kompetitor
   */
  static recalculateMarketShare(gameState) {
    let playerAud = 0;
    for (const u of gameState.units) playerAud += u.audience;
    gameState.totalAudience = playerAud;

    let totalMarketAudience = playerAud;
    for (const comp of gameState.competitors) {
      totalMarketAudience += comp.audience;
    }

    if (totalMarketAudience === 0) {
      gameState.playerMarketShare = 0;
      return;
    }

    gameState.playerMarketShare = Number(((playerAud / totalMarketAudience) * 100).toFixed(1));

    for (const comp of gameState.competitors) {
      comp.share = Number(((comp.audience / totalMarketAudience) * 100).toFixed(1));
    }
  }

  /**
   * Evaluasi peringkat pada akhir bulan
   */
  static checkMonthlyLeaderboard(gameState) {
    this.recalculateMarketShare(gameState);

    // Bandingkan audiens pemain dengan kompetitor tertinggi
    let maxCompetitorAudience = 0;
    for (const comp of gameState.competitors) {
      if (comp.audience > maxCompetitorAudience) {
        maxCompetitorAudience = comp.audience;
      }
    }

    if (gameState.totalAudience > maxCompetitorAudience && gameState.totalAudience > 0) {
      gameState.consecutiveMonthsAsTop1 += 1;
      gameState.logs.unshift({
        text: `PRESTASI: Kerajaan mediamu mempertahankan posisi #1 PANGSA PASAR! (${gameState.consecutiveMonthsAsTop1}/${CONFIG.WIN_CONSECUTIVE_MONTHS_TOP1} bulan berturut-turut).`,
        type: 'success',
      });
    } else {
      if (gameState.consecutiveMonthsAsTop1 > 0) {
        gameState.logs.unshift({
          text: `Posisi #1 pangsa pasar tergeser oleh pesaing. Rekor bulan berturut-turut direset ke 0.`,
          type: 'warning',
        });
      }
      gameState.consecutiveMonthsAsTop1 = 0;
    }
  }
}
