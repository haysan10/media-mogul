// competitorAI.js — Lapisan 3: Simulasi Media Pesaing AI & Pangsa Pasar
import { CONFIG } from '../config.js';

export class CompetitorAISystem {
  static tickDaily(gameState) {
    const eraIdx = gameState.currentEraIndex;

    for (const comp of gameState.competitors) {
      const eraFactor = 1.0 + eraIdx * 0.12;
      const noise = (Math.random() - 0.49) * 0.005;
      const rate = 1.0 + (comp.aggressiveness ? (comp.aggressiveness - 1.0) * 0.08 : 0.002) * eraFactor + noise;
      comp.audience = Math.round(comp.audience * rate);
    }

    this.updateMarketShare(gameState);
  }

  static updateMarketShare(gameState) {
    let playerAud = 0;
    for (const u of gameState.units) {
      playerAud += u.audience;
    }
    gameState.totalAudience = playerAud;

    let totalMarket = playerAud;
    for (const c of gameState.competitors) {
      totalMarket += c.audience;
    }

    if (totalMarket <= 0) {
      gameState.playerMarketShare = 0;
      return;
    }

    gameState.playerMarketShare = Number(((playerAud / totalMarket) * 100).toFixed(1));

    for (const c of gameState.competitors) {
      c.share = Number(((c.audience / totalMarket) * 100).toFixed(1));
    }
  }

  static tickMonthly(gameState) {
    this.updateMarketShare(gameState);

    let maxRivalAud = 0;
    for (const c of gameState.competitors) {
      if (c.audience > maxRivalAud) maxRivalAud = c.audience;
    }

    if (gameState.totalAudience > maxRivalAud && gameState.totalAudience > 0) {
      gameState.consecutiveMonthsAsTop1 += 1;
      gameState.logs.unshift({
        text: `DOMINASI PASAR: Kerajaan mediamu mempertahankan posisi #1 (${gameState.consecutiveMonthsAsTop1}/${CONFIG.WIN_CONSECUTIVE_MONTHS_TOP1} bulan berturut-turut).`,
        type: 'success',
      });
    } else {
      if (gameState.consecutiveMonthsAsTop1 > 0) {
        gameState.logs.unshift({
          text: `Peringkat #1 tergeser oleh pesaing. Rekor bulan berturut-turut direset ke 0.`,
          type: 'warning',
        });
      }
      gameState.consecutiveMonthsAsTop1 = 0;
    }
  }
}
