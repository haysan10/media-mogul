// eventSystem.js — Lapisan 3: Peristiwa Berita & Keputusan Manajemen Tycoon
import { CONFIG } from '../config.js';

export class EventSystem {
  static tickDaily(gameState) {
    if (gameState.activeEvent) return; // Menunggu interaksi pemain

    if (gameState.eventCooldownDays > 0) {
      gameState.eventCooldownDays -= 1;
      return;
    }

    // Picu event hanya jika sudah memiliki unit
    if (gameState.units.length === 0) return;

    const pool = CONFIG.RANDOM_EVENTS;
    const picked = pool[Math.floor(Math.random() * pool.length)];

    gameState.activeEvent = picked;
    gameState.prevSpeed = gameState.speed > 0 ? gameState.speed : 1;
    gameState.speed = 0; // Jeda otomatis saat modal event muncul

    gameState.logs.unshift({
      text: `PERISTIWA TERKINI: "${picked.title}"! Redaksi memerlukan keputusan Anda.`,
      type: 'warning',
    });
  }

  static resolveChoice(choiceKey, gameState) {
    if (!gameState.activeEvent) return;

    const event = gameState.activeEvent;
    const choice = choiceKey === 'optionA' ? event.optionA : event.optionB;
    if (!choice) return;

    // Terapkan efek Finansial
    if (choice.effect.money) {
      gameState.money += choice.effect.money;
    }

    // Terapkan efek Reputasi
    if (choice.effect.reputation) {
      gameState.reputation = Math.max(0, Math.min(100, gameState.reputation + choice.effect.reputation));
    }

    // Terapkan efek Pertumbuhan Audiens
    if (choice.effect.audienceGrowth) {
      for (const unit of gameState.units) {
        unit.audience = Math.round(Math.max(100, unit.audience * (1 + choice.effect.audienceGrowth)));
      }
    }

    // Catat riwayat keputusan berisiko untuk analisis post-mortem
    if (choice.effect.reputation && choice.effect.reputation < -5) {
      gameState.stats.riskyDecisionsTaken.push(`${event.title}: Kompromi reputasi demi dana jangka pendek.`);
    }
    if (choice.effect.money && choice.effect.money < -3000) {
      gameState.stats.riskyDecisionsTaken.push(`${event.title}: Pengeluaran kas besar untuk membela prinsip redaksi.`);
    }

    gameState.stats.eventsResolved += 1;
    gameState.logs.unshift({
      text: choice.log,
      type: choice.effect.reputation && choice.effect.reputation < 0 ? 'warning' : 'success',
    });

    gameState.activeEvent = null;
    gameState.speed = gameState.prevSpeed !== undefined ? gameState.prevSpeed : 1;
    gameState.eventCooldownDays = 35 + Math.floor(Math.random() * 25);
  }
}
