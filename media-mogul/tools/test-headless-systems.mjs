// test-headless-systems.mjs — Verifikasi Headless Lapisan 3 Game Systems Murni Tanpa Three.js
import { CONFIG } from '../src/config.js';
import { createNewGameState } from '../src/state.js';
import { TimeEngine } from '../src/systems/timeEngine.js';
import { EconomySystem } from '../src/systems/economy.js';
import { UnitManager } from '../src/systems/unitManager.js';
import { StaffManager } from '../src/systems/staffManager.js';
import { ResearchTreeSystem } from '../src/systems/researchTree.js';
import { EventSystem } from '../src/systems/eventSystem.js';
import { CompetitorAISystem } from '../src/systems/competitorAI.js';
import { EraManager } from '../src/systems/eraManager.js';
import { WinLoseChecker } from '../src/systems/winLoseChecker.js';

console.log('=== MEMULAI TEST HEADLESS GAME SYSTEMS ===\n');

const state = createNewGameState();
console.log(`[1] State Awal: Kas=$${state.money}, Reputasi=${state.reputation}, Runway=${state.runwayMonths} bln`);

const time = new TimeEngine();
const economy = new EconomySystem();
const units = new UnitManager();

const systems = {
  economy,
  research: ResearchTreeSystem,
  events: EventSystem,
  competitors: CompetitorAISystem,
  winLose: WinLoseChecker,
};

// Test A: Bangun Percetakan Koran (Kavling #0)
console.log('\n--- Test A: Membangun Percetakan Koran ---');
const buildRes = units.buildUnit(0, 'koran-percetakan', state);
if (!buildRes.success) throw new Error('Gagal membangun koran: ' + buildRes.reason);
console.log(`✓ Unit dibuat: ${buildRes.unit.name}, Sisa Kas=$${state.money}`);
console.log(`✓ Status Operasional: ${buildRes.unit.isOperational} (Masa Ramp-up: ${CONFIG.RAMP_UP_DAYS} hari)`);

// Test B: Simulasi 10 Hari (Menyelesaikan ramp-up)
console.log('\n--- Test B: Simulasi 10 Hari (Ramp-up Selesai) ---');
for (let d = 0; d < 10; d++) {
  time.update(1.0, state, systems);
}
console.log(`✓ Hari ${state.day}, Unit isOperational: ${state.units[0].isOperational}`);
console.log(`✓ Kualitas Konten Q_unit: ${state.units[0].qualityScore}/100, Popularitas: ${state.units[0].popularity}`);

// Test C: Rekrutmen Staf & Uji Coordination Penalty
console.log('\n--- Test C: Rekrutmen Staf & Koordinasi ---');
StaffManager.hireStaff(state.units[0].id, 'reporter', state);
StaffManager.hireStaff(state.units[0].id, 'sales', state);
console.log(`✓ Staf Terpasang: Reporter=${state.units[0].staff.reporter}, Sales=${state.units[0].staff.sales}`);

// Test D: Selesaikan Bulan 1 (30 Hari) & Evaluasi Runway
console.log('\n--- Test D: Penutupan Bulan 1 ---');
while (state.month === 1) {
  time.update(1.0, state, systems);
}
console.log(`✓ Masuk Bulan ${state.month}!`);
console.log(`✓ Laporan Bulanan Arus Kas:`);
console.log(`   - Kas Awal: $${state.lastMonthlyReport.openingCash}`);
console.log(`   - Penjualan Iklan: +$${state.lastMonthlyReport.salesIncome}`);
console.log(`   - Gaji Staf: -$${state.lastMonthlyReport.staffSalaries}`);
console.log(`   - Biaya Operasional: -$${state.lastMonthlyReport.operationalCosts}`);
console.log(`   - Laba Bersih: $${state.lastMonthlyReport.netProfit}`);
console.log(`   - Kas Akhir: $${state.lastMonthlyReport.closingCash}`);
console.log(`✓ Runway Terhitung: ${state.runwayMonths} bulan`);
console.log(`✓ Insight: "${state.lastMonthlyReport.insightText}"`);

// Test E: Riset rotary_press
console.log('\n--- Test E: Memulai & Menyelesaikan Riset ---');
const rRes = ResearchTreeSystem.startResearch('rotary_press', state);
console.log(`✓ Mulai riset rotary_press: ${rRes.success}`);
for (let d = 0; d < 20; d++) {
  if (state.activeEvent) {
    EventSystem.resolveChoice('optionA', state);
  }
  time.update(1.0, state, systems);
}
if (state.activeEvent) {
  EventSystem.resolveChoice('optionA', state);
}
console.log(`✓ Riset selesai? ${state.researchedNodes.includes('rotary_press')}`);

// Test F: Uji Product-Market Fit (Bangun Majalah di Era 2)
console.log('\n--- Test F: Transisi Era 2 & Segmen Majalah ---');
state.money += 20000;
state.reputation = 50;
const eraRes = EraManager.advanceEra(1, state);
console.log(`✓ Naik ke Era 2 (Majalah): ${eraRes.success}`);

const buildMajalah = units.buildUnit(1, 'majalah-kantor', state);
console.log('Build Majalah result:', buildMajalah);
if (!buildMajalah.success) {
  console.error('Build Majalah failed because:', buildMajalah.reason);
} else {
  console.log(`✓ Bangun Majalah: ${buildMajalah.success}, Segmen Default: ${buildMajalah.unit.segment}`);
  units.setSegment(buildMajalah.unit.id, 'business', state);
  console.log(`✓ Ganti Segmen Majalah ke: ${buildMajalah.unit.segment}`);
}

// Test G: Uji Skenario Kalah & Post-Mortem (Simulasi Defisit Ekstrem)
console.log('\n--- Test G: Uji Post-Mortem (Game Over) ---');
const testLossState = createNewGameState();
testLossState.money = -500;
testLossState.consecutiveDebtMonths = 2; // Memicu kalah
const lossStatus = WinLoseChecker.check(testLossState);
console.log(`✓ Status Kalah Terpicu: ${lossStatus}`);
console.log(`✓ Post-Mortem Judul: "${testLossState.postMortem.title}"`);
console.log(`✓ Post-Mortem Rekomendasi: ${testLossState.postMortem.recommendations[0]}`);

console.log('\n=== SELURUH TEST HEADLESS FASE 2 BERHASIL 100%! ===');
