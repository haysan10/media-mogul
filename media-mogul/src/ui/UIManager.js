// UIManager.js — Lapisan 1: 13 Layar UI (Screen #0 s/d #12b), Game Feel & Responsif
import { CONFIG } from '../config.js';
import { EraManager } from '../systems/eraManager.js';
import { ResearchTreeSystem } from '../systems/researchTree.js';
import { StaffManager } from '../systems/staffManager.js';

/** SFX hook points (no-op clean placeholder) */
export function playSfx(name) {
  // Hook point siap disambungkan jika audio ditambahkan di masa depan
  // console.log(`[SFX]: ${name}`);
}

export class UIManager {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.activeTab = 'build'; // 'build' | 'unit' | 'research' | 'competitors' | 'era' | 'settings'
    this.isMobileDrawerOpen = false;

    // Count-up display cache
    this.displayedMoney = CONFIG.START_MONEY;
    this.displayedAudience = 0;

    this.initDOM();
  }

  initDOM() {
    const root = document.getElementById('ui-root');
    if (!root) return;

    root.innerHTML = `
      <!-- SCREEN #3: GAME HUD (PERMANEN) -->
      <header class="hud-top">
        <div class="hud-brand">
          <button id="btn-open-menu" class="btn-ctrl btn-menu-brand" title="Menu Utama">☰</button>
          <span class="brand-title">MEDIA MOGUL</span>
          <span id="hud-era-badge" class="era-badge">Era Koran</span>
        </div>

        <div class="hud-metrics">
          <!-- Uang dengan count-up -->
          <div class="metric-item" title="Kas Uang Tunai">
            <span class="m-icon">💵</span>
            <span id="hud-money" class="m-val">$12,000</span>
          </div>

          <!-- Reputasi -->
          <div class="metric-item" title="Reputasi Redaksi & Kredibilitas Pers">
            <span class="m-icon">⭐</span>
            <span id="hud-reputation" class="m-val">65/100</span>
          </div>

          <!-- Audiens + Mini Sparkline Tren -->
          <div class="metric-item" title="Total Audiens Pembaca / Pemirsa">
            <span class="m-icon">👥</span>
            <span id="hud-audience" class="m-val">0</span>
            <svg id="hud-sparkline" class="sparkline" width="36" height="14" viewBox="0 0 36 14"></svg>
          </div>

          <!-- Runway Keuangan: Indikator Risiko Utama -->
          <div id="hud-runway-box" class="metric-item runway-item" title="Runway: Ketahanan Kas Sebelum Habis Berdasarkan Rata-rata Pengeluaran 3 Bulan">
            <span class="m-icon">⏳</span>
            <span id="hud-runway" class="m-val">Runway: 99 bln</span>
          </div>

          <!-- Kalender -->
          <div class="metric-item" title="Kalender Waktu">
            <span class="m-icon">📅</span>
            <span id="hud-date" class="m-val">1 Jan 1920</span>
          </div>
        </div>

        <div class="hud-controls">
          <div class="speed-group">
            <button class="btn-ctrl" data-speed="0" title="Jeda (Pause)">⏸</button>
            <button class="btn-ctrl active" data-speed="1" title="1x Normal">▶</button>
            <button class="btn-ctrl" data-speed="2" title="2x Cepat">⏩</button>
            <button class="btn-ctrl" data-speed="5" title="5x Kilat">⚡</button>
          </div>
          <button id="btn-hud-reports" class="btn-ctrl btn-report-icon" title="Laporan Bulanan Terkini">📑</button>
          <button id="btn-hud-settings" class="btn-ctrl" title="Pengaturan">⚙️</button>
        </div>
      </header>

      <!-- Banner Peringatan Keuangan (Non-blocking, muncul jika runway < 3 bulan) -->
      <div id="banner-runway-warning" class="runway-warning-banner hidden">
        <span class="warn-icon">⚠️</span>
        <span id="runway-warn-text">PERINGATAN KEUANGAN: Cadangan kas menipis (&lt; 3 bulan)! Segera efisiensi biaya.</span>
      </div>

      <!-- Banner Progress Tujuan Berikutnya -->
      <div class="goal-tracker-bar">
        <div class="goal-label-wrap">
          <span class="goal-title">Tujuan Berikutnya:</span>
          <span id="goal-target-name" class="goal-target">Buka Era Majalah</span>
        </div>
        <div class="goal-progress-bg">
          <div id="goal-progress-fill" class="goal-progress-fill" style="width: 20%;"></div>
        </div>
      </div>

      <!-- Desktop Sidebar / Mobile Bottom Sheet Drawer -->
      <div id="game-drawer" class="game-drawer">
        <div class="drawer-handle" id="drawer-toggle">
          <span class="handle-bar"></span>
          <span id="drawer-tab-title" class="drawer-title">Menu Konstruksi & Lahan</span>
        </div>

        <!-- Navigation Tabs -->
        <nav class="drawer-nav">
          <button class="nav-tab active" data-tab="build">🔨 Bangun</button>
          <button class="nav-tab" data-tab="unit">🏢 Unit</button>
          <button class="nav-tab" data-tab="research">🔬 Riset</button>
          <button class="nav-tab" data-tab="competitors">📊 Pesaing</button>
          <button class="nav-tab" data-tab="era">🚀 Era</button>
        </nav>

        <!-- Content Panes -->
        <div class="drawer-content">
          <div id="pane-build" class="tab-pane active"></div>
          <div id="pane-unit" class="tab-pane"></div>
          <div id="pane-research" class="tab-pane"></div>
          <div id="pane-competitors" class="tab-pane"></div>
          <div id="pane-era" class="tab-pane"></div>
        </div>
      </div>

      <!-- SCREEN #3: BREAKING NEWS TICKER (FOOTER) -->
      <div class="news-ticker">
        <span class="ticker-tag">BERITA:</span>
        <span id="ticker-text" class="ticker-msg">Selamat datang di Media Mogul! Klik kavling tanah untuk mulai membangun.</span>
      </div>

      <!-- SCREEN #0: ONBOARDING MODAL -->
      <div id="modal-onboarding" class="modal-overlay hidden">
        <div class="modal-card onboarding-card">
          <div class="onboard-badge">PANDUAN MOGUL PERDANA</div>
          <h2>Membangun Kerajaan Media</h2>
          <p class="modal-desc">
            Selamat datang di era 1920! Sebagai pengusaha muda, Anda mewarisi modal awal untuk mendirikan penerbitan koran pertama Anda di kota ini.
          </p>
          <div class="onboard-qa-grid mb-3">
            <div class="qa-item">
              <strong>1. Tujuan Utama:</strong>
              <span>Kembangkan media dari percetakan koran hingga merajai pangsa pasar di era media sosial modern.</span>
            </div>
            <div class="qa-item">
              <strong>2. Langkah Sekarang:</strong>
              <span>Pilih salah satu kavling kosong di peta 3D lalu klik <em>Bangun Percetakan Koran</em>.</span>
            </div>
            <div class="qa-item">
              <strong>3. Risiko Fatal:</strong>
              <span>Perhatikan indikator <strong>Runway</strong>. Jika kas minus selama 2 bulan berturut-turut, perusahaan akan bangkrut!</span>
            </div>
          </div>
          <button id="btn-onboarding-start" class="btn-primary">Mulai Sekarang & Bangun Koran</button>
        </div>
      </div>

      <!-- SCREEN #2: MAIN MENU MODAL -->
      <div id="modal-mainmenu" class="modal-overlay hidden">
        <div class="modal-card text-center">
          <h1 class="brand-hero">MEDIA MOGUL</h1>
          <p class="modal-desc">Simulasi Manajemen Konglomerat Media 3D</p>
          <div class="menu-btn-stack">
            <button id="btn-menu-continue" class="btn-primary mb-2">Lanjutkan Permainan</button>
            <button id="btn-menu-new" class="btn-secondary mb-2">Mulai Baru dari 1920</button>
            <button id="btn-menu-reset" class="btn-danger btn-sm">Reset Seluruh Data Tersimpan</button>
          </div>
        </div>
      </div>

      <!-- SCREEN #8: EVENT MODAL POPUP -->
      <div id="modal-event" class="modal-overlay hidden">
        <div class="modal-card">
          <div class="modal-header">
            <span class="modal-icon">📰</span>
            <div>
              <span class="badge badge-warning">KEPUTUSAN REDAKSI</span>
              <h2 id="event-title">Peristiwa Berita Besar</h2>
            </div>
          </div>
          <p id="event-desc" class="modal-desc"></p>
          <div class="modal-options">
            <button id="btn-event-a" class="btn-option"></button>
            <button id="btn-event-b" class="btn-option"></button>
          </div>
        </div>
      </div>

      <!-- SCREEN #9: LAPORAN BULANAN (MONTHLY CASHFLOW REPORT) -->
      <div id="modal-monthly-report" class="modal-overlay hidden">
        <div class="modal-card report-card">
          <div class="report-header">
            <h3>📑 Laporan Keuangan & Kinerja Bulanan</h3>
            <span id="report-period" class="badge">Bulan 1 / 1920</span>
          </div>

          <!-- Breakdown Arus Kas Lengkap -->
          <div class="cashflow-table mb-3">
            <div class="cf-row"><span>Kas Awal:</span><strong id="cf-opening">$0</strong></div>
            <div class="cf-row text-success"><span>+ Penjualan Iklan &amp; Pembaca:</span><strong id="cf-sales">+$0</strong></div>
            <div class="cf-row text-success"><span>+ Pendapatan Kontrak Sponsor:</span><strong id="cf-contract">+$0</strong></div>
            <div class="cf-row text-danger"><span>- Biaya Rutin Operasional Gedung:</span><strong id="cf-oper">-$0</strong></div>
            <div class="cf-row text-danger"><span>- Pengeluaran Gaji Staf:</span><strong id="cf-staff">-$0</strong></div>
            <div class="cf-divider"></div>
            <div class="cf-row cf-total">
              <span>Laba / Rugi Bersih:</span>
              <strong id="cf-net">$0</strong>
            </div>
            <div class="cf-row cf-final">
              <span>Kas Akhir Saat Ini:</span>
              <strong id="cf-closing">$0</strong>
            </div>
          </div>

          <!-- Insight Causal Otomatis -->
          <div class="insight-box mb-3">
            <span class="insight-label">💡 Insight Manajemen:</span>
            <p id="report-insight" class="insight-text"></p>
          </div>

          <button id="btn-close-report" class="btn-primary">Lanjutkan Simulasi</button>
        </div>
      </div>

      <!-- SCREEN #11: PENGATURAN -->
      <div id="modal-settings" class="modal-overlay hidden">
        <div class="modal-card">
          <div class="d-flex justify-between align-center mb-3">
            <h3>⚙️ Pengaturan Permainan</h3>
            <button id="btn-close-settings" class="btn-round">✕</button>
          </div>
          <div class="settings-row mb-3">
            <div>
              <strong>Kualitas Grafis 3D:</strong>
              <p class="text-xs text-muted">Mengatur resolusi bayangan, partikel, dan efek bloom.</p>
            </div>
            <button id="btn-toggle-tier" class="btn-secondary btn-sm">Sedang</button>
          </div>
          <div class="settings-row mb-3">
            <div>
              <strong>Mulai Dari Awal:</strong>
              <p class="text-xs text-muted">Hapus save game dan mulai dari tahun 1920.</p>
            </div>
            <button id="btn-settings-reset" class="btn-danger btn-sm">Reset Game</button>
          </div>
        </div>
      </div>

      <!-- SCREEN #12 & #12b: LAYAR AKHIR (MENANG / KALAH POST-MORTEM) -->
      <div id="modal-endscreen" class="modal-overlay hidden">
        <div class="modal-card endscreen-card">
          <div id="endscreen-badge" class="end-badge">🏆 KEMENANGAN</div>
          <h2 id="endscreen-title">Media Mogul Legendaris!</h2>
          <p id="endscreen-explanation" class="modal-desc"></p>

          <div id="endscreen-details" class="endscreen-body"></div>

          <button id="btn-endscreen-restart" class="btn-primary mt-4">Main Lagi (Mulai Dari Awal)</button>
        </div>
      </div>

      <!-- FULLSCREEN TRANSISI ERA OVERLAY -->
      <div id="overlay-era-transition" class="era-transition-overlay hidden">
        <div class="era-transition-content">
          <span class="era-subhead">MEMASUKI ZAMAN BARU</span>
          <h1 id="era-trans-name">ERA MAJALAH</h1>
          <span id="era-trans-year" class="era-trans-year">1950</span>
          <p id="era-trans-desc" class="era-trans-desc"></p>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Speed buttons
    document.querySelectorAll('.speed-group .btn-ctrl').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-group .btn-ctrl').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const speed = Number(btn.getAttribute('data-speed'));
        if (this.callbacks.onSpeedChange) this.callbacks.onSpeedChange(speed);
      });
    });

    // Brand Menu button
    document.getElementById('btn-open-menu')?.addEventListener('click', () => {
      document.getElementById('modal-mainmenu')?.classList.remove('hidden');
    });

    // Main Menu continue / new / reset
    document.getElementById('btn-menu-continue')?.addEventListener('click', () => {
      document.getElementById('modal-mainmenu')?.classList.add('hidden');
    });

    document.getElementById('btn-menu-new')?.addEventListener('click', () => {
      if (confirm('Mulai permainan baru dari tahun 1920? Progres saat ini akan direset.')) {
        document.getElementById('modal-mainmenu')?.classList.add('hidden');
        if (this.callbacks.onReset) this.callbacks.onReset();
      }
    });

    document.getElementById('btn-menu-reset')?.addEventListener('click', () => {
      if (confirm('Hapus seluruh data permainan?')) {
        document.getElementById('modal-mainmenu')?.classList.add('hidden');
        if (this.callbacks.onReset) this.callbacks.onReset();
      }
    });

    // Settings
    document.getElementById('btn-hud-settings')?.addEventListener('click', () => {
      document.getElementById('modal-settings')?.classList.remove('hidden');
    });
    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      document.getElementById('modal-settings')?.classList.add('hidden');
    });
    document.getElementById('btn-toggle-tier')?.addEventListener('click', () => {
      if (this.callbacks.onQualityChange) this.callbacks.onQualityChange();
    });
    document.getElementById('btn-settings-reset')?.addEventListener('click', () => {
      if (confirm('Reset permainan dari awal?')) {
        document.getElementById('modal-settings')?.classList.add('hidden');
        if (this.callbacks.onReset) this.callbacks.onReset();
      }
    });

    // Report manual open
    document.getElementById('btn-hud-reports')?.addEventListener('click', () => {
      document.getElementById('modal-monthly-report')?.classList.remove('hidden');
    });
    document.getElementById('btn-close-report')?.addEventListener('click', () => {
      document.getElementById('modal-monthly-report')?.classList.add('hidden');
    });

    // Tab buttons
    document.querySelectorAll('.drawer-nav .nav-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabKey = tab.getAttribute('data-tab');
        this.setActiveTab(tabKey);
      });
    });

    // Mobile drawer handle
    document.getElementById('drawer-toggle')?.addEventListener('click', () => {
      this.isMobileDrawerOpen = !this.isMobileDrawerOpen;
      document.getElementById('game-drawer')?.classList.toggle('open', this.isMobileDrawerOpen);
    });

    // Onboarding start
    document.getElementById('btn-onboarding-start')?.addEventListener('click', () => {
      document.getElementById('modal-onboarding')?.classList.add('hidden');
      if (this.callbacks.onOnboardingComplete) this.callbacks.onOnboardingComplete();
    });

    // Event modal option clicks
    document.getElementById('btn-event-a')?.addEventListener('click', () => {
      playSfx('coin');
      if (this.callbacks.onEventChoice) this.callbacks.onEventChoice('optionA');
    });
    document.getElementById('btn-event-b')?.addEventListener('click', () => {
      playSfx('coin');
      if (this.callbacks.onEventChoice) this.callbacks.onEventChoice('optionB');
    });

    // Restart button
    document.getElementById('btn-endscreen-restart')?.addEventListener('click', () => {
      document.getElementById('modal-endscreen')?.classList.add('hidden');
      if (this.callbacks.onReset) this.callbacks.onReset();
    });
  }

  setActiveTab(tabKey) {
    this.activeTab = tabKey;
    document.querySelectorAll('.drawer-nav .nav-tab').forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabKey);
    });
    document.querySelectorAll('.drawer-content .tab-pane').forEach((p) => {
      p.classList.toggle('active', p.id === `pane-${tabKey}`);
    });
    const titles = {
      build: '🔨 Menu Konstruksi & Lahan',
      unit: '🏢 Pengelolaan Unit Media',
      research: '🔬 Pohon Riset Teknologi',
      competitors: '📊 Peringkat & Pangsa Pasar',
      era: '🚀 Garis Waktu Era Media',
    };
    const titleEl = document.getElementById('drawer-tab-title');
    if (titleEl) titleEl.textContent = titles[tabKey] || '';
  }

  showEraTransition(era) {
    const overlay = document.getElementById('overlay-era-transition');
    if (!overlay) return;

    document.getElementById('era-trans-name').textContent = era.name.toUpperCase();
    document.getElementById('era-trans-year').textContent = era.year;
    document.getElementById('era-trans-desc').textContent = era.description;

    overlay.classList.remove('hidden');
    playSfx('era-change');

    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 2800);
  }

  /**
   * Update seluruh data HUD, Layar, dan Komponen dari gameState terkini
   */
  update(gameState) {
    // Onboarding Check
    if (gameState.isFirstTimeOnboarding && gameState.units.length === 0) {
      document.getElementById('modal-onboarding')?.classList.remove('hidden');
    }

    // 1. SCREEN #3: TOP HUD & METRICS
    this.updateHUD(gameState);

    // 2. Panes
    this.renderBuildPane(gameState);
    this.renderUnitPane(gameState);
    this.renderResearchPane(gameState);
    this.renderCompetitorsPane(gameState);
    this.renderEraPane(gameState);

    // 3. Modals
    this.renderEventModal(gameState);
    this.renderMonthlyReport(gameState);
    this.renderEndScreenModal(gameState);
  }

  updateHUD(gameState) {
    // Count-up animasi uang (0.4 detik lerp)
    const targetMoney = Math.round(gameState.money);
    this.displayedMoney += (targetMoney - this.displayedMoney) * 0.25;
    const moneyEl = document.getElementById('hud-money');
    if (moneyEl) {
      const val = Math.round(this.displayedMoney);
      moneyEl.textContent = `${val < 0 ? '-$' : '$'}${Math.abs(val).toLocaleString()}`;
      moneyEl.style.color = val < 0 ? 'var(--accent-danger)' : 'var(--accent-money)';
    }

    // Reputasi
    const repEl = document.getElementById('hud-reputation');
    if (repEl) {
      repEl.textContent = `${Math.round(gameState.reputation)}/100`;
    }

    // Count-up animasi audiens
    const targetAud = gameState.totalAudience || 0;
    this.displayedAudience += (targetAud - this.displayedAudience) * 0.25;
    const audEl = document.getElementById('hud-audience');
    if (audEl) {
      audEl.textContent = Math.round(this.displayedAudience).toLocaleString();
    }

    // Mini Sparkline SVG Tren Audiens
    const sparkEl = document.getElementById('hud-sparkline');
    if (sparkEl && gameState.audienceHistory) {
      const history = gameState.audienceHistory;
      const maxH = Math.max(1, ...history);
      const points = history.map((val, idx) => {
        const x = (idx / (history.length - 1)) * 36;
        const y = 13 - (val / maxH) * 11;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      sparkEl.innerHTML = `<polyline fill="none" stroke="var(--accent-rep)" stroke-width="1.8" points="${points}" />`;
    }

    // Runway Keuangan (Angka Bulan + Ikon + Label)
    const runwayBox = document.getElementById('hud-runway-box');
    const runwayVal = document.getElementById('hud-runway');
    const warningBanner = document.getElementById('banner-runway-warning');

    if (runwayVal) {
      const rw = gameState.runwayMonths;
      runwayVal.textContent = `Runway: ${rw} bln`;

      if (rw < CONFIG.RUNWAY_WARNING_THRESHOLD || gameState.money < 0) {
        runwayBox?.classList.add('critical');
        warningBanner?.classList.remove('hidden');
        const warnText = document.getElementById('runway-warn-text');
        if (warnText) {
          warnText.textContent = gameState.money < 0
            ? `DEFISIT KAS: Saldo berada di bawah nol (${gameState.consecutiveDebtMonths}/2 bulan sebelum bangkrut)!`
            : `PERINGATAN RUNWAY: Dana cadangan kas sisa ${rw} bulan! Kurangi staf atau naikkan iklan.`;
        }
      } else {
        runwayBox?.classList.remove('critical');
        warningBanner?.classList.add('hidden');
      }
    }

    // Tanggal & Era
    const dateEl = document.getElementById('hud-date');
    if (dateEl) {
      dateEl.textContent = `${gameState.day} Bln ${gameState.month}, ${gameState.year}`;
    }

    const eraBadge = document.getElementById('hud-era-badge');
    if (eraBadge) {
      eraBadge.textContent = CONFIG.ERAS[gameState.currentEraIndex]?.name || 'Era Media';
    }

    // Progress Bar Tujuan Berikutnya
    const nextIdx = gameState.currentEraIndex + 1;
    const nextEra = CONFIG.ERAS[nextIdx];
    const targetNameEl = document.getElementById('goal-target-name');
    const targetFillEl = document.getElementById('goal-progress-fill');

    if (nextEra && targetNameEl && targetFillEl) {
      targetNameEl.textContent = `Buka ${nextEra.name} (${nextEra.year})`;
      const moneyPct = Math.min(1, gameState.money / nextEra.unlockCost);
      const repPct = Math.min(1, gameState.reputation / nextEra.unlockReputation);
      const totalPct = Math.round(((moneyPct + repPct) / 2) * 100);
      targetFillEl.style.width = `${totalPct}%`;
    } else if (targetNameEl && targetFillEl) {
      targetNameEl.textContent = `Dominasi #1 Pasar (${gameState.consecutiveMonthsAsTop1}/12 Bulan)`;
      targetFillEl.style.width = `${Math.round((gameState.consecutiveMonthsAsTop1 / 12) * 100)}%`;
    }

    // News Ticker
    const ticker = document.getElementById('ticker-text');
    if (ticker && gameState.logs && gameState.logs.length > 0) {
      ticker.textContent = gameState.logs[0].text;
    }

    // Tier Button text
    const tierBtn = document.getElementById('btn-toggle-tier');
    if (tierBtn) {
      const tierMap = { high: 'Tinggi', med: 'Sedang', low: 'Rendah' };
      tierBtn.textContent = tierMap[gameState.qualityTier] || 'Sedang';
    }
  }

  renderBuildPane(gameState) {
    const pane = document.getElementById('pane-build');
    if (!pane) return;

    const selectedPlotId = gameState.selectedPlotId;
    const selectedPlot = selectedPlotId !== null ? gameState.plots[selectedPlotId] : null;

    let html = `
      <div class="pane-header">
        <h3>SCREEN #4: Menu Konstruksi Unit</h3>
        <p class="text-muted">${selectedPlot ? `Kavling #${selectedPlotId + 1} Terpilih (${selectedPlot.unit ? 'Sudah Terisi' : 'Siap Bangun'})` : 'Pilih kavling tanah di peta 3D untuk memulai konstruksi.'}</p>
      </div>
    `;

    if (selectedPlot && selectedPlot.unit) {
      html += `
        <div class="card p-3 mb-3 border-accent">
          <div class="d-flex justify-between align-center">
            <strong>${selectedPlot.unit.name}</strong>
            <span class="badge">Lvl ${selectedPlot.unit.level}</span>
          </div>
          <p class="text-xs text-muted mt-1">Kavling ini telah ditempati. Buka tab <strong>Unit</strong> untuk mengelola alokasi dan staf.</p>
          <button class="btn-secondary btn-sm mt-2" onclick="window.__uiManager.setActiveTab('unit')">Kelola Unit Ini</button>
        </div>
      `;
    }

    html += `<div class="build-grid">`;
    for (let i = 0; i <= gameState.currentEraIndex; i++) {
      const era = CONFIG.ERAS[i];
      const bConfig = CONFIG.BUILDINGS[era.buildingId];
      if (!bConfig) continue;

      const canAfford = gameState.money >= bConfig.buildCost;
      const canBuild = selectedPlot && !selectedPlot.unit && canAfford;

      let disabledReason = '';
      if (!selectedPlot) disabledReason = 'Pilih kavling di peta terlebih dahulu';
      else if (selectedPlot.unit) disabledReason = 'Kavling sudah terisi bangunan';
      else if (!canAfford) disabledReason = `Dana kurang (butuh $${bConfig.buildCost.toLocaleString()})`;

      html += `
        <div class="build-card ${canAfford ? '' : 'disabled'}">
          <div class="build-card-head">
            <span class="build-name">${bConfig.name}</span>
            <span class="build-price">$${bConfig.buildCost.toLocaleString()}</span>
          </div>
          <p class="build-desc">${bConfig.desc}</p>
          <div class="build-meta">
            <span>Audiens Awal: <strong>${bConfig.baseAudience.toLocaleString()}</strong></span>
            <span>Biaya Rutin: <strong>$${bConfig.baseUpkeep}/bln</strong></span>
          </div>
          ${bConfig.contractMonthlyIncome ? `<div class="text-xs text-accent mt-1">✨ Kontrak Sponsor: +$${bConfig.contractMonthlyIncome}/bln (Min Rep ${bConfig.contractMinReputation})</div>` : ''}
          <button class="btn-build mt-2" ${canBuild ? '' : 'disabled'} data-building-id="${era.buildingId}">
            ${canBuild ? `Bangun di Kavling #${selectedPlotId + 1}` : disabledReason}
          </button>
        </div>
      `;
    }
    html += `</div>`;

    pane.innerHTML = html;

    pane.querySelectorAll('.btn-build').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bId = btn.getAttribute('data-building-id');
        if (selectedPlotId !== null && this.callbacks.onBuild) {
          playSfx('build');
          this.callbacks.onBuild(selectedPlotId, bId);
        }
      });
    });
  }

  renderUnitPane(gameState) {
    const pane = document.getElementById('pane-unit');
    if (!pane) return;

    const selectedPlotId = gameState.selectedPlotId;
    const selectedPlot = selectedPlotId !== null ? gameState.plots[selectedPlotId] : null;
    const unit = selectedPlot ? selectedPlot.unit : (gameState.units[0] || null);

    if (!unit) {
      pane.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏢</div>
          <h4>Belum Ada Unit Dipilih</h4>
          <p class="text-muted">Klik salah satu bangunan di peta 3D untuk membuka panel kendali operasional.</p>
        </div>
      `;
      return;
    }

    const bConfig = CONFIG.BUILDINGS[unit.type];
    const upgradeCost = Math.round(bConfig.buildCost * Math.pow(bConfig.upgradeMultiplier, unit.level));
    const isMaxLevel = unit.level >= bConfig.maxLevel;
    const requiredMinStaff = unit.level * 2;
    const currentStaffCount = Object.values(unit.staff).reduce((a, b) => a + b, 0);
    const hasEnoughStaff = currentStaffCount >= requiredMinStaff;
    const canAffordUpgrade = gameState.money >= upgradeCost;
    const canUpgrade = !isMaxLevel && hasEnoughStaff && canAffordUpgrade;

    let upgradeDisabledReason = '';
    if (isMaxLevel) upgradeDisabledReason = 'Level Maksimum (Lvl 5)';
    else if (!hasEnoughStaff) upgradeDisabledReason = `Butuh min ${requiredMinStaff} staf (Ada ${currentStaffCount})`;
    else if (!canAffordUpgrade) upgradeDisabledReason = `Dana kurang ($${upgradeCost.toLocaleString()})`;

    // Hitung estimasi profit bulanan unit ini
    const estRevenue = (unit.lastDailyRevenue || 0) * CONFIG.DAYS_PER_MONTH;
    const estUpkeep = bConfig.baseUpkeep * (1 + (unit.level - 1) * 0.6);
    let estSalaries = 0;
    for (const [s, c] of Object.entries(unit.staff)) estSalaries += (CONFIG.STAFF_TYPES[s]?.salary || 0) * c;
    const estNetProfit = Math.round(estRevenue - estUpkeep - estSalaries);

    pane.innerHTML = `
      <div class="pane-header">
        <div class="d-flex justify-between align-center">
          <div>
            <h3>${unit.name}</h3>
            <span class="text-xs text-muted">Kavling #${unit.plotId + 1} · ${unit.isOperational ? 'Beroperasi Penuh' : `Konstruksi Ramp-up (Sisa ${CONFIG.RAMP_UP_DAYS} Hari)`}</span>
          </div>
          <span class="level-tag">Tingkat ${unit.level}/${bConfig.maxLevel}</span>
        </div>
      </div>

      <!-- Pemisahan Evaluasi: Q_unit vs Profit Finansial (Prinsip #4) -->
      <div class="metrics-split-card mb-3">
        <div class="split-col">
          <span class="split-label">Kualitas Konten (Q):</span>
          <strong class="split-val text-accent">${unit.qualityScore || 50}/100</strong>
          <span class="text-xs text-muted">Ditentukan Fit, Tech, Alokasi &amp; Staf</span>
        </div>
        <div class="split-divider"></div>
        <div class="split-col">
          <span class="split-label">Estimasi Laba Unit:</span>
          <strong class="split-val ${estNetProfit >= 0 ? 'text-success' : 'text-danger'}">${estNetProfit >= 0 ? '+' : ''}$${estNetProfit}/bln</strong>
          <span class="text-xs text-muted">Hasil Iklan - Upkeep - Gaji</span>
        </div>
      </div>

      <!-- Segment Selector untuk Majalah (Product-Market Fit) -->
      ${unit.type === 'majalah-kantor' ? `
        <div class="card mb-3">
          <label class="text-xs font-bold d-block mb-1">🎯 Segmen Pasar Majalah (Product-Market Fit):</label>
          <select id="select-unit-segment" class="styled-select">
            ${Object.values(CONFIG.MARKET_SEGMENTS).map((seg) => `
              <option value="${seg.id}" ${unit.segment === seg.id ? 'selected' : ''}>${seg.name} (Kecocokan: ${Math.round(seg.baseFit * 100)}%)</option>
            `).join('')}
          </select>
        </div>
      ` : ''}

      <!-- SCREEN #5: 3 SLIDER ALOKASI ANGGARAN -->
      <div class="card mb-3">
        <h4 class="mb-1">Alokasi Anggaran Produksi Konten</h4>
        <p class="text-xs text-muted mb-2">Total seimbang 100%. Iklan &gt; 50% memicu kejenuhan pemirsa!</p>

        <div class="slider-row">
          <label>Kualitas Konten: <span id="val-q">${unit.budget.quality}%</span></label>
          <input type="range" id="range-q" min="10" max="80" value="${unit.budget.quality}">
        </div>
        <div class="slider-row">
          <label>Kuantitas &amp; Viralitas: <span id="val-k">${unit.budget.quantity}%</span></label>
          <input type="range" id="range-k" min="10" max="80" value="${unit.budget.quantity}">
        </div>
        <div class="slider-row">
          <label>Kerapatan Iklan: <span id="val-a">${unit.budget.ads}%</span></label>
          <input type="range" id="range-a" min="10" max="80" value="${unit.budget.ads}">
        </div>
      </div>

      <!-- SCREEN #6: STAF & HUMAN RESOURCE MANAGEMENT -->
      <div class="card mb-3">
        <div class="d-flex justify-between align-center mb-2">
          <h4>Tim Redaksi &amp; Kantor</h4>
          <span class="text-xs text-muted">Kapasitas Optimal: ${CONFIG.OPTIMAL_STAFF_PER_LEVEL * unit.level} Staf</span>
        </div>
        <div class="staff-list">
          ${Object.entries(CONFIG.STAFF_TYPES).map(([type, cfg]) => {
            const count = unit.staff[type] || 0;
            return `
              <div class="staff-row">
                <div class="staff-info">
                  <strong>${cfg.name}</strong>
                  <span class="text-xs text-muted">$${cfg.salary}/bln · ${cfg.desc}</span>
                </div>
                <div class="staff-actions">
                  <button class="btn-round btn-staff-minus" data-type="${type}" ${count <= 0 ? 'disabled' : ''}>-</button>
                  <span class="staff-count">${count}</span>
                  <button class="btn-round btn-staff-plus" data-type="${type}">+</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- UPGRADE UNIT -->
      <div class="card mb-3">
        <div class="d-flex justify-between align-center">
          <div>
            <strong>Ekspansi Tingkat Bangunan</strong>
            <p class="text-xs text-muted">Biaya: $${upgradeCost.toLocaleString()} · Biaya rutin naik permanen</p>
          </div>
          <button id="btn-unit-upgrade" class="btn-primary btn-sm" ${canUpgrade ? '' : 'disabled'}>
            ${canUpgrade ? `Upgrade Lvl ${unit.level + 1}` : upgradeDisabledReason}
          </button>
        </div>
      </div>

      <div class="d-flex justify-between align-center mt-3">
        <span class="text-xs text-muted">Audiens Saat Ini: <strong>${unit.audience.toLocaleString()}</strong></span>
        <button id="btn-unit-demolish" class="btn-danger btn-sm">Robohkan Gedung</button>
      </div>
    `;

    // Bind event handlers
    document.getElementById('btn-unit-upgrade')?.addEventListener('click', () => {
      playSfx('levelup');
      if (this.callbacks.onUpgrade) this.callbacks.onUpgrade(unit.id);
    });

    document.getElementById('btn-unit-demolish')?.addEventListener('click', () => {
      if (confirm(`Robohkan ${unit.name}? Anda akan menerima nilai besi tua.`)) {
        if (this.callbacks.onDemolish) this.callbacks.onDemolish(unit.id);
      }
    });

    document.getElementById('select-unit-segment')?.addEventListener('change', (e) => {
      if (this.callbacks.onSegmentChange) {
        this.callbacks.onSegmentChange(unit.id, e.target.value);
      }
    });

    pane.querySelectorAll('.btn-staff-plus').forEach((b) => {
      b.addEventListener('click', () => {
        const type = b.getAttribute('data-type');
        StaffManager.hireStaff(unit.id, type, gameState);
        this.update(gameState);
      });
    });

    pane.querySelectorAll('.btn-staff-minus').forEach((b) => {
      b.addEventListener('click', () => {
        const type = b.getAttribute('data-type');
        StaffManager.fireStaff(unit.id, type, gameState);
        this.update(gameState);
      });
    });

    // Slider inputs
    const rq = document.getElementById('range-q');
    const rk = document.getElementById('range-k');
    const ra = document.getElementById('range-a');

    const updateBudget = () => {
      const q = Number(rq.value);
      const k = Number(rk.value);
      const a = Number(ra.value);
      if (this.callbacks.onBudgetChange) {
        this.callbacks.onBudgetChange(unit.id, { quality: q, quantity: k, ads: a });
      }
      this.update(gameState);
    };

    rq?.addEventListener('input', updateBudget);
    rk?.addEventListener('input', updateBudget);
    ra?.addEventListener('input', updateBudget);
  }

  renderResearchPane(gameState) {
    const pane = document.getElementById('pane-research');
    if (!pane) return;

    let html = `
      <div class="pane-header">
        <h3>SCREEN #7: Pohon Riset Teknologi Media (8 Node)</h3>
        <p class="text-muted">Tiap riset membuka <strong>Kemampuan Baru</strong>, <strong>Tanggung Jawab Baru</strong>, dan <strong>Risiko Baru</strong>.</p>
      </div>
    `;

    if (gameState.activeResearch) {
      const r = gameState.activeResearch;
      const pct = Math.min(100, Math.round((r.progressDays / r.totalDays) * 100));
      html += `
        <div class="card card-active-research mb-3">
          <div class="d-flex justify-between align-center mb-1">
            <strong>Riset Berjalan: ${r.title}</strong>
            <span>${r.progressDays}/${r.totalDays} Hari (${pct}%)</span>
          </div>
          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        </div>
      `;
    }

    html += `<div class="research-grid">`;
    for (const node of CONFIG.RESEARCH_NODES) {
      const isResearched = gameState.researchedNodes.includes(node.id);
      const isCurrentActive = gameState.activeResearch && gameState.activeResearch.id === node.id;
      const meetsPrereq = node.prereq.every((req) => gameState.researchedNodes.includes(req));
      const canAfford = gameState.money >= node.cost;
      const canStart = !isResearched && !gameState.activeResearch && meetsPrereq && canAfford;

      let disabledReason = '';
      if (isResearched) disabledReason = 'Sudah Selesai';
      else if (isCurrentActive) disabledReason = 'Sedang Diteliti...';
      else if (!meetsPrereq) disabledReason = 'Prasyarat Belum Terpenuhi';
      else if (!canAfford) disabledReason = `Dana Kurang ($${node.cost.toLocaleString()})`;

      html += `
        <div class="research-card ${isResearched ? 'completed' : meetsPrereq ? '' : 'locked'}">
          <div class="research-head">
            <span class="research-title">${node.title}</span>
            <span class="badge ${isResearched ? 'badge-success' : 'badge-default'}">
              ${isResearched ? '✓ Selesai' : `$${node.cost.toLocaleString()}`}
            </span>
          </div>
          <div class="research-pillars text-xs mt-1 mb-2">
            <div class="pillar-item text-success">✦ Kemampuan: ${node.newCapability}</div>
            <div class="pillar-item text-muted">⚖️ Tanggung Jawab: ${node.newResponsibility}</div>
            <div class="pillar-item text-danger">⚠️ Risiko: ${node.newRisk}</div>
          </div>
          <button class="btn-research mt-2" ${canStart ? '' : 'disabled'} data-node-id="${node.id}">
            ${canStart ? `Mulai Riset (${node.daysRequired} Hari)` : disabledReason}
          </button>
        </div>
      `;
    }
    html += `</div>`;

    pane.innerHTML = html;

    pane.querySelectorAll('.btn-research').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nId = btn.getAttribute('data-node-id');
        ResearchTreeSystem.startResearch(nId, gameState);
        this.update(gameState);
      });
    });
  }

  renderCompetitorsPane(gameState) {
    const pane = document.getElementById('pane-competitors');
    if (!pane) return;

    pane.innerHTML = `
      <div class="pane-header">
        <h3>SCREEN #10: Peringkat Pasar &amp; AI Pesaing</h3>
        <p class="text-muted">Syarat Menang: Raih posisi #1 selama 12 bulan berturut-turut di Era Sosial Media.</p>
      </div>

      <div class="card mb-3">
        <div class="d-flex justify-between align-center mb-2">
          <span>Pangsa Pasarmu:</span>
          <strong class="text-accent text-lg">${gameState.playerMarketShare || 0}%</strong>
        </div>
        <div class="progress-bar-bg mb-2">
          <div class="progress-bar-fill bg-accent" style="width: ${Math.min(100, gameState.playerMarketShare || 0)}%"></div>
        </div>
        <div class="d-flex justify-between text-xs text-muted">
          <span>Rekor Posisi #1 Berturut-turut:</span>
          <strong>${gameState.consecutiveMonthsAsTop1} / ${CONFIG.WIN_CONSECUTIVE_MONTHS_TOP1} Bulan</strong>
        </div>
      </div>

      <div class="competitor-list">
        <div class="competitor-row player-row">
          <div>
            <strong>Kerajaan Mediamu</strong>
            <span class="text-xs text-muted d-block">${gameState.totalAudience.toLocaleString()} Pemirsa</span>
          </div>
          <span class="market-pct">${gameState.playerMarketShare}%</span>
        </div>

        ${gameState.competitors.map((c) => `
          <div class="competitor-row">
            <div>
              <strong style="color: ${c.color}">${c.name}</strong>
              <span class="text-xs text-muted d-block">${c.audience.toLocaleString()} Pemirsa</span>
            </div>
            <span class="market-pct">${c.share}%</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderEraPane(gameState) {
    const pane = document.getElementById('pane-era');
    if (!pane) return;

    const curIdx = gameState.currentEraIndex;
    const nextIdx = curIdx + 1;
    const nextEra = CONFIG.ERAS[nextIdx];

    let html = `
      <div class="pane-header">
        <h3>Garis Waktu Kemajuan Era Media</h3>
        <p class="text-muted">Tiap era membuka potensi ekonomi baru dengan beban biaya &amp; volatilitas risiko baru.</p>
      </div>

      <div class="era-timeline mb-3">
        ${CONFIG.ERAS.map((era, idx) => {
          const isPassed = idx < curIdx;
          const isCurrent = idx === curIdx;
          return `
            <div class="era-step ${isPassed ? 'passed' : isCurrent ? 'current' : 'locked'}">
              <div class="step-dot">${idx + 1}</div>
              <div class="step-info">
                <strong>${era.name} (${era.year})</strong>
                <span class="text-xs text-muted">${era.buildingName}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    if (nextEra) {
      const check = EraManager.checkEligibility(nextIdx, gameState);
      html += `
        <div class="card card-next-era">
          <h4>Buka ${nextEra.name} (${nextEra.year})</h4>
          <p class="text-xs text-muted mb-2">${nextEra.description}</p>
          <div class="text-xs mb-2">
            <div>✨ Kemampuan: ${nextEra.newCapability}</div>
            <div>⚖️ Beban Rutin: ${nextEra.newResponsibility}</div>
            <div class="text-danger">⚠️ Risiko: ${nextEra.newRisk}</div>
          </div>
          <ul class="req-list text-xs mb-2">
            <li class="${gameState.money >= nextEra.unlockCost ? 'met' : 'unmet'}">Biaya Modal: $${nextEra.unlockCost.toLocaleString()}</li>
            <li class="${gameState.reputation >= nextEra.unlockReputation ? 'met' : 'unmet'}">Reputasi Minimum: ${nextEra.unlockReputation}</li>
            ${nextEra.requiredResearch ? `<li class="${gameState.researchedNodes.includes(nextEra.requiredResearch) ? 'met' : 'unmet'}">Riset: ${CONFIG.RESEARCH_NODES.find((r) => r.id === nextEra.requiredResearch)?.title}</li>` : ''}
          </ul>
          <button id="btn-advance-era" class="btn-primary mt-2" ${check.eligible ? '' : 'disabled'}>
            ${check.eligible ? `Masuki ${nextEra.name}` : `Belum Memenuhi Syarat (${check.reason})`}
          </button>
        </div>
      `;
    } else {
      html += `
        <div class="card p-3 border-accent">
          <h4>Puncak Era Tertinggi Tercapai!</h4>
          <p class="text-xs text-muted">Anda telah menguasai Era Media Sosial &amp; Algoritma AI. Pertahankan kepemimpinan pasar #1 selama 12 bulan berturut-turut untuk menyelesaikan permainan!</p>
        </div>
      `;
    }

    pane.innerHTML = html;

    document.getElementById('btn-advance-era')?.addEventListener('click', () => {
      if (this.callbacks.onEraAdvance) {
        this.callbacks.onEraAdvance(nextIdx);
      }
    });
  }

  renderEventModal(gameState) {
    const modal = document.getElementById('modal-event');
    if (!modal) return;

    if (!gameState.activeEvent) {
      modal.classList.add('hidden');
      return;
    }

    const ev = gameState.activeEvent;
    document.getElementById('event-title').textContent = ev.title;
    document.getElementById('event-desc').textContent = ev.desc;

    const btnA = document.getElementById('btn-event-a');
    const btnB = document.getElementById('btn-event-b');

    if (btnA && btnB) {
      btnA.innerHTML = `<strong>A. ${ev.optionA.text}</strong><span class="preview-effect">${this.formatEffectPreview(ev.optionA.effect)}</span>`;
      btnB.innerHTML = `<strong>B. ${ev.optionB.text}</strong><span class="preview-effect">${this.formatEffectPreview(ev.optionB.effect)}</span>`;
    }

    modal.classList.remove('hidden');
  }

  formatEffectPreview(eff) {
    const parts = [];
    if (eff.money) parts.push(eff.money > 0 ? `+$${eff.money}` : `-$${Math.abs(eff.money)}`);
    if (eff.reputation) parts.push(eff.reputation > 0 ? `+${eff.reputation} Rep` : `${eff.reputation} Rep`);
    if (eff.audienceGrowth) parts.push(`${eff.audienceGrowth > 0 ? '+' : ''}${Math.round(eff.audienceGrowth * 100)}% Audiens`);
    return parts.join(' · ');
  }

  renderMonthlyReport(gameState) {
    const report = gameState.lastMonthlyReport;
    if (!report) return;

    document.getElementById('cf-opening').textContent = `$${report.openingCash.toLocaleString()}`;
    document.getElementById('cf-sales').textContent = `+$${report.salesIncome.toLocaleString()}`;
    document.getElementById('cf-contract').textContent = `+$${report.contractIncome.toLocaleString()}`;
    document.getElementById('cf-oper').textContent = `-$${report.operationalCosts.toLocaleString()}`;
    document.getElementById('cf-staff').textContent = `-$${report.staffSalaries.toLocaleString()}`;

    const netEl = document.getElementById('cf-net');
    if (netEl) {
      netEl.textContent = `${report.netProfit >= 0 ? '+' : ''}$${report.netProfit.toLocaleString()}`;
      netEl.className = report.netProfit >= 0 ? 'text-success' : 'text-danger';
    }

    document.getElementById('cf-closing').textContent = `$${report.closingCash.toLocaleString()}`;
    document.getElementById('report-insight').textContent = report.insightText;
    document.getElementById('report-period').textContent = `Bulan ${gameState.month} / ${gameState.year}`;
  }

  renderEndScreenModal(gameState) {
    const modal = document.getElementById('modal-endscreen');
    if (!modal) return;

    if (gameState.gameStatus === 'playing') {
      modal.classList.add('hidden');
      return;
    }

    const postMortem = gameState.postMortem;
    if (!postMortem) return;

    const isWin = postMortem.isWin;
    const badge = document.getElementById('endscreen-badge');
    const title = document.getElementById('endscreen-title');
    const expl = document.getElementById('endscreen-explanation');
    const body = document.getElementById('endscreen-details');

    if (badge) {
      badge.textContent = isWin ? '🏆 KEMENANGAN TOTAL' : '💀 KEBANGKRUTAN BISNIS';
      badge.className = `end-badge ${isWin ? 'badge-win' : 'badge-lose'}`;
    }

    if (title) title.textContent = postMortem.title;
    if (expl) expl.textContent = postMortem.explanation;

    if (body) {
      if (isWin) {
        body.innerHTML = `
          <div class="end-stats-grid mb-3">
            <div class="stat-box"><span>Kas Akhir:</span><strong>$${postMortem.financialSummary.lastCash.toLocaleString()}</strong></div>
            <div class="stat-box"><span>Penghasilan Seumur Hidup:</span><strong>$${postMortem.financialSummary.totalEarnings.toLocaleString()}</strong></div>
            <div class="stat-box"><span>Puncak Audiens:</span><strong>${postMortem.peakAudience.toLocaleString()}</strong></div>
            <div class="stat-box"><span>Tahun Terakhir:</span><strong>${postMortem.yearsPlayed}</strong></div>
          </div>
        `;
      } else {
        // SCREEN #12b: POST-MORTEM MENJAWAB 3 PERTANYAAN
        body.innerHTML = `
          <div class="post-mortem-box mb-3 text-left">
            <h4 class="text-danger mb-1">1. Apa yang Terjadi:</h4>
            <p class="text-xs text-muted mb-2">${postMortem.explanation}</p>

            <h4 class="text-warning mb-1">2. Mengapa Terjadi (Breakdown 3 Bulan Terakhir):</h4>
            <div class="text-xs text-muted mb-2">
              <div>• Kas Akhir: <strong>$${postMortem.financialSummary.lastCash.toLocaleString()}</strong></div>
              <div>• Rata-rata Beban Bulanan: <strong>$${postMortem.financialSummary.avgExpenses3M.toLocaleString()}</strong></div>
              <div>• Biaya Gaji Terakhir: <strong>$${postMortem.financialSummary.lastStaffCost.toLocaleString()}</strong> | Upkeep: <strong>$${postMortem.financialSummary.lastOperCost.toLocaleString()}</strong></div>
              ${postMortem.riskyDecisions.length > 0 ? `<div>• Keputusan berisiko: <em>${postMortem.riskyDecisions.join('; ')}</em></div>` : ''}
            </div>

            <h4 class="text-accent mb-1">3. Rekomendasi Manajerial:</h4>
            <ul class="text-xs text-muted pl-3">
              ${postMortem.recommendations.map((r) => `<li>${r}</li>`).join('')}
            </ul>
          </div>
        `;
      }
    }

    modal.classList.remove('hidden');
  }
}
