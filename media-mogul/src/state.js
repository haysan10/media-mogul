// state.js — Lapisan 2: State Manajemen & Penyimpanan (LocalStorage)
import { CONFIG } from './config.js';

const STORAGE_KEY = 'media_mogul_saved_game_v2';

export function detectInitialQualityTier() {
  try {
    const cores = navigator.hardwareConcurrency || 4;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (isMobile) {
      return cores >= 8 ? 'med' : 'low';
    }
    if (cores >= 6 && window.innerWidth >= 1200) {
      return 'high';
    }
    return 'med';
  } catch (e) {
    return 'med';
  }
}

function createInitialPlots() {
  const plots = [];
  const size = CONFIG.GRID_SIZE;
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const id = z * size + x;
      plots.push({
        id,
        gridX: x,
        gridZ: z,
        unit: null,
      });
    }
  }
  return plots;
}

function createInitialCompetitors() {
  return CONFIG.COMPETITORS.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    audience: c.baseAudience,
    share: 0,
  }));
}

export function createNewGameState() {
  return {
    money: CONFIG.START_MONEY,
    reputation: CONFIG.START_REPUTATION,
    day: CONFIG.START_DAY,
    month: CONFIG.START_MONTH,
    year: CONFIG.START_YEAR,
    speed: 1, // 0: pause, 1: 1x, 2: 2x, 5: 5x

    currentEraIndex: 0,
    plots: createInitialPlots(),
    units: [],
    nextUnitId: 1,

    // Onboarding & Tutorial
    isFirstTimeOnboarding: true,

    // Masa ramp-up konstruksi unit (5-10 hari)
    rampUpQueue: [], // [ { unitId, remainingDays, totalDays } ]

    // Riset
    researchedNodes: [],
    activeResearch: null, // { id, title, progressDays, totalDays }

    // Kompetitor & Pangsa Pasar
    totalAudience: 0,
    competitors: createInitialCompetitors(),
    playerMarketShare: 0,
    consecutiveMonthsAsTop1: 0,
    consecutiveDebtMonths: 0,

    // Kontrak Sponsor Aktif (Radio & TV)
    activeContracts: [], // [ { id, unitId, type, monthlyValue, minReputation } ]

    // Runway Keuangan (Bulan tersisa sebelum kas habis)
    runwayMonths: 99,
    financialHistory3Months: [800, 800, 800], // Riwayat rata-rata pengeluaran 3 bulan terakhir

    // Laporan Arus Kas Bulanan Detail (Screen #9)
    lastMonthlyReport: {
      openingCash: CONFIG.START_MONEY,
      salesIncome: 0,
      contractIncome: 0,
      operationalCosts: 0,
      staffSalaries: 0,
      researchCosts: 0,
      closingCash: CONFIG.START_MONEY,
      netProfit: 0,
      insightText: 'Selamat memulai kerajaan media Anda! Bangun percetakan koran perdana untuk menghasilkan arus kas.',
      marketShareChange: 0,
    },

    // Riwayat Tren Audiens (untuk mini sparkline HUD)
    audienceHistory: [0, 0, 0, 0, 0, 0],

    // Game Status
    gameStatus: 'playing', // 'playing' | 'won' | 'lost'
    postMortem: null, // Berisi breakdown 3 bulan terakhir jika kalah

    // Pengaturan & UI State
    qualityTier: detectInitialQualityTier(),
    selectedPlotId: null,
    activeEvent: null,
    eventCooldownDays: 40,

    // Statistik Permainan
    stats: {
      totalLifetimeEarnings: 0,
      totalUnitsBuilt: 0,
      peakAudience: 0,
      eventsResolved: 0,
      startRealTime: Date.now(),
      riskyDecisionsTaken: [],
    },

    // News Ticker
    logs: [
      { text: 'Selamat datang di Media Mogul! Bangun percetakan koran pertamamu di kavling kota.', type: 'info' }
    ],
  };
}

export let gameState = createNewGameState();

export function saveGame() {
  try {
    const serialized = JSON.stringify(gameState);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (err) {
    console.warn('Gagal menyimpan ke localStorage:', err);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data && data.plots && Array.isArray(data.units)) {
      const fresh = createNewGameState();
      for (const key of Object.keys(gameState)) {
        delete gameState[key];
      }
      Object.assign(gameState, fresh, data);
      return true;
    }
  } catch (err) {
    console.warn('Gagal memuat save game:', err);
  }
  return false;
}

export function resetGame() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Error clearing localStorage:', err);
  }
  const prevTier = gameState.qualityTier;
  const fresh = createNewGameState();
  for (const key of Object.keys(gameState)) {
    delete gameState[key];
  }
  Object.assign(gameState, fresh, { qualityTier: prevTier });
  return gameState;
}
