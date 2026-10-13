// timeEngine.js — Lapisan 2/3: Mesin simulasi waktu murni (pure logic, no Three.js)
import { CONFIG } from '../config.js';

export class TimeEngine {
  constructor() {
    this.accumulatedSeconds = 0;
  }

  /**
   * Majukan waktu berdasarkan delta detik nyata dan kecepatan game
   * @param {number} dt Delta time dalam detik nyata
   * @param {object} gameState State permainan
   * @param {object} systems Koleksi sistem (economy, research, events, competitors, winLose)
   * @returns {boolean} true jika terjadi tick hari
   */
  update(dt, gameState, systems) {
    if (gameState.speed <= 0 || gameState.gameStatus !== 'playing') {
      return false;
    }

    this.accumulatedSeconds += dt * gameState.speed;
    const dayInterval = CONFIG.TICK_SECONDS;
    let didTickDay = false;

    while (this.accumulatedSeconds >= dayInterval) {
      this.accumulatedSeconds -= dayInterval;
      this.tickDay(gameState, systems);
      didTickDay = true;
    }

    return didTickDay;
  }

  /**
   * Eksekusi satu hari simulasi
   */
  tickDay(gameState, systems) {
    gameState.day += 1;

    // 1. Progres Ramp-up Konstruksi Unit (5-10 hari)
    if (gameState.rampUpQueue && gameState.rampUpQueue.length > 0) {
      for (let i = gameState.rampUpQueue.length - 1; i >= 0; i--) {
        const item = gameState.rampUpQueue[i];
        item.remainingDays -= 1;
        if (item.remainingDays <= 0) {
          const unit = gameState.units.find((u) => u.id === item.unitId);
          if (unit) {
            unit.isOperational = true;
            gameState.logs.unshift({
              text: `KONSTRUKSI SELESAI: ${unit.name} di Kavling #${unit.plotId + 1} kini beroperasi penuh!`,
              type: 'success',
            });
            if (typeof this.onRampUpComplete === 'function') {
              this.onRampUpComplete(unit);
            }
          }
          gameState.rampUpQueue.splice(i, 1);
        }
      }
    }

    // 2. Simulasi Harian Sub-Sistem
    if (systems.economy) systems.economy.tickDaily(gameState);
    if (systems.research) systems.research.tickDaily(gameState);
    if (systems.events) systems.events.tickDaily(gameState);
    if (systems.competitors) systems.competitors.tickDaily(gameState);

    // 3. Pergantian Bulan (setiap 30 hari)
    if (gameState.day > CONFIG.DAYS_PER_MONTH) {
      gameState.day = 1;
      gameState.month += 1;
      this.tickMonth(gameState, systems);

      // Pergantian Tahun
      if (gameState.month > 12) {
        gameState.month = 1;
        gameState.year += 1;
      }
    }
  }

  /**
   * Eksekusi penutupan buku bulanan
   */
  tickMonth(gameState, systems) {
    if (systems.economy) systems.economy.tickMonthly(gameState);
    if (systems.competitors) systems.competitors.tickMonthly(gameState);
    if (systems.winLose) systems.winLose.check(gameState);
  }
}
