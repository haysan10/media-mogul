// state.js — Manajemen gameState, penyimpanan localStorage, dan reset
import { CONFIG } from './config.js';

const STORAGE_KEY = 'media_mogul_saved_game_v1';

/** Deteksi tier kualitas awal berdasarkan hardware & viewport */
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

/** Inisialisasi kavling 6x6 (36 petak) */
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
        unit: null, // Berisi objek unit jika dibangun
      });
    }
  }
  return plots;
}

/** Inisialisasi kompetitor AI */
function createInitialCompetitors() {
  return CONFIG.COMPETITORS.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    audience: c.baseAudience,
    share: 0,
  }));
}

/** Template state baru */
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
    units: [], // Unit yang aktif
    nextUnitId: 1,

    researchedNodes: [], // ID riset yang selesai
    activeResearch: null, // { id, progressDays, totalDays }

    competitors: createInitialCompetitors(),
    playerMarketShare: 0,
    consecutiveMonthsAsTop1: 0,
    consecutiveDebtMonths: 0,

    gameStatus: 'playing', // 'playing' | 'won' | 'lost'
    endStats: null,

    qualityTier: detectInitialQualityTier(), // 'high' | 'med' | 'low'
    selectedPlotId: null,

    activeEvent: null,
    eventCooldownDays: 35, // Jeda sebelum event pertama

    monthlyHistory: {
      lastIncome: 0,
      lastExpenses: 0,
      lastProfit: 0,
    },

    stats: {
      totalLifetimeEarnings: 0,
      totalUnitsBuilt: 0,
      peakAudience: 0,
      eventsResolved: 0,
      startRealTime: Date.now(),
    },

    logs: [
      { text: 'Selamat datang di Media Mogul! Bangun percetakan koran pertamamu di kavling kota.', type: 'info' }
    ],
  };
}

export let gameState = createNewGameState();

/** Simpan gameState ke localStorage secara aman */
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

/** Muat gameState dari localStorage jika tersedia */
export function loadGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data && data.plots && Array.isArray(data.units)) {
      // Validasi & integrasikan kembali
      gameState = Object.assign(createNewGameState(), data);
      return true;
    }
  } catch (err) {
    console.warn('Gagal memuat save game:', err);
  }
  return false;
}

/** Reset total dan hapus save game */
export function resetGame() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Error clearing localStorage:', err);
  }
  const prevTier = gameState.qualityTier;
  gameState = createNewGameState();
  gameState.qualityTier = prevTier;
  return gameState;
}
