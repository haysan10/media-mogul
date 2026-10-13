// eventSystem.js — Sistem pemicu dan resolusi 12 event acak berkala
import { CONFIG } from '../config.js';

export class EventSystem {
  static tickDailyEvents(gameState) {
    if (gameState.activeEvent) return; // Tunggu pilihan pemain selesai

    if (gameState.eventCooldownDays > 0) {
      gameState.eventCooldownDays -= 1;
      return;
    }

    // Hanya picu event jika pemain sudah punya minimal 1 unit media
    if (gameState.units.length === 0) return;

    // Pilih event acak dari 12 konfigurasi event
    const pool = CONFIG.RANDOM_EVENTS;
    const picked = pool[Math.floor(Math.random() * pool.length)];

    gameState.activeEvent = picked;
    // Jeda game otomatis saat event penting muncul
    gameState.prevSpeed = gameState.speed;
    gameState.speed = 0;

    gameState.logs.unshift({
      text: `PERISTIWA BERITA: ${picked.title}! Buka modal untuk mengambil keputusan.`,
      type: 'warning',
    });
  }

  static resolveChoice(choiceKey, gameState) {
    if (!gameState.activeEvent) return;

    const event = gameState.activeEvent;
    const choice = choiceKey === 'optionA' ? event.optionA : event.optionB;
    if (!choice) return;

    // Terapkan efek uang
    if (choice.effect.money) {
      gameState.money += choice.effect.money;
    }

    // Terapkan efek reputasi
    if (choice.effect.reputation) {
      gameState.reputation = Math.max(0, Math.min(100, gameState.reputation + choice.effect.reputation));
    }

    // Terapkan efek pertumbuhan audiens
    if (choice.effect.audienceGrowth) {
      for (const unit of gameState.units) {
        unit.audience = Math.round(Math.max(100, unit.audience * (1 + choice.effect.audienceGrowth)));
      }
    }

    gameState.stats.eventsResolved += 1;
    gameState.logs.unshift({
      text: `${choice.log}`,
      type: choice.effect.reputation && choice.effect.reputation < 0 ? 'warning' : 'success',
    });

    // Reset status event dan kembalikan kecepatan game
    gameState.activeEvent = null;
    gameState.speed = gameState.prevSpeed !== undefined ? gameState.prevSpeed : 1;
    // Setel ulang cooldown (sekitar 35 - 55 hari sebelum event berikutnya)
    gameState.eventCooldownDays = 35 + Math.floor(Math.random() * 20);
  }
}
