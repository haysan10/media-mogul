// UIManager.js — HUD responsif, panel kaca gelap semi-transparan, modal event & kontrol mobile
import { CONFIG } from '../config.js';
import { EraManager } from '../systems/eraManager.js';
import { ResearchTreeSystem } from '../systems/researchTree.js';
import { StaffManager } from '../systems/staffManager.js';

export class UIManager {
  constructor(callbacks = {}) {
    this.callbacks = callbacks; // onBuild, onUpgrade, onDemolish, onSpeedChange, onReset, onEraAdvance, onQualityChange
    this.activeTab = 'build'; // 'build' | 'unit' | 'research' | 'competitors' | 'era'
    this.isMobileDrawerOpen = false;
    this.initDOM();
  }

  initDOM() {
    const root = document.getElementById('ui-root');
    if (!root) return;

    root.innerHTML = `
      <!-- Top HUD Bar -->
      <header class="hud-top">
        <div class="hud-brand">
          <span class="brand-title">MEDIA MOGUL</span>
          <span id="hud-era-badge" class="era-badge">Era Koran</span>
        </div>

        <div class="hud-metrics">
          <div class="metric-item" title="Kas Uang Tunai">
            <span class="m-icon">💵</span>
            <span id="hud-money" class="m-val">$12,000</span>
          </div>
          <div class="metric-item" title="Reputasi Media">
            <span class="m-icon">⭐</span>
            <span id="hud-reputation" class="m-val">65/100</span>
          </div>
          <div class="metric-item" title="Total Pembaca / Pemirsa">
            <span class="m-icon">👥</span>
            <span id="hud-audience" class="m-val">0</span>
          </div>
          <div class="metric-item" title="Laba Bersih Bulan Terakhir">
            <span class="m-icon">📈</span>
            <span id="hud-profit" class="m-val">+$0/bln</span>
          </div>
          <div class="metric-item" title="Kalender Permainan">
            <span class="m-icon">📅</span>
            <span id="hud-date" class="m-val">1 Jan 1920</span>
          </div>
        </div>

        <div class="hud-controls">
          <div class="speed-group">
            <button class="btn-ctrl" data-speed="0" title="Jeda">⏸</button>
            <button class="btn-ctrl active" data-speed="1" title="1x Normal">▶</button>
            <button class="btn-ctrl" data-speed="2" title="2x Cepat">⏩</button>
            <button class="btn-ctrl" data-speed="5" title="5x Kilat">⚡</button>
          </div>
          <button id="btn-quality-toggle" class="btn-ctrl btn-tier" title="Kualitas Grafis">Tier: Sedang</button>
          <button id="btn-reset-game" class="btn-ctrl btn-danger" title="Ulangi dari Awal">Reset</button>
        </div>
      </header>

      <!-- Desktop Sidebar / Mobile Bottom Sheet Container -->
      <div id="game-drawer" class="game-drawer">
        <div class="drawer-handle" id="drawer-toggle">
          <span class="handle-bar"></span>
          <span id="drawer-tab-title" class="drawer-title">Menu Konstruksi & Lahan</span>
        </div>

        <!-- Tab Navigation Buttons -->
        <nav class="drawer-nav">
          <button class="nav-tab active" data-tab="build">🔨 Bangun</button>
          <button class="nav-tab" data-tab="unit">🏢 Unit</button>
          <button class="nav-tab" data-tab="research">🔬 Riset</button>
          <button class="nav-tab" data-tab="competitors">📊 Pesaing</button>
          <button class="nav-tab" data-tab="era">🚀 Era</button>
        </nav>

        <!-- Dynamic Content Panes -->
        <div class="drawer-content">
          <div id="pane-build" class="tab-pane active"></div>
          <div id="pane-unit" class="tab-pane"></div>
          <div id="pane-research" class="tab-pane"></div>
          <div id="pane-competitors" class="tab-pane"></div>
          <div id="pane-era" class="tab-pane"></div>
        </div>
      </div>

      <!-- Live Ticker News Log (Bawah) -->
      <div class="news-ticker">
        <span class="ticker-tag">BERITA:</span>
        <span id="ticker-text" class="ticker-msg">Selamat datang di Media Mogul! Klik kavling tanah untuk mulai membangun.</span>
      </div>

      <!-- Narrative Event Modal Popup -->
      <div id="modal-event" class="modal-overlay hidden">
        <div class="modal-card">
          <div class="modal-header">
            <span class="modal-icon">📰</span>
            <h2 id="event-title">Peristiwa Berita Besar</h2>
          </div>
          <p id="event-desc" class="modal-desc"></p>
          <div class="modal-options">
            <button id="btn-event-a" class="btn-option"></button>
            <button id="btn-event-b" class="btn-option"></button>
          </div>
        </div>
      </div>

      <!-- End Screen Modal (Win/Lose) -->
      <div id="modal-endscreen" class="modal-overlay hidden">
        <div class="modal-card endscreen-card">
          <div id="endscreen-badge" class="end-badge">🏆 KEMENANGAN</div>
          <h2 id="endscreen-title">Mogul Media Terbesar!</h2>
          <p id="endscreen-summary" class="modal-desc"></p>
          <div id="endscreen-stats" class="end-stats-grid"></div>
          <button id="btn-endscreen-restart" class="btn-primary mt-4">Main Lagi (Mulai Dari Awal)</button>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Speed control buttons
    const speedBtns = document.querySelectorAll('.speed-group .btn-ctrl');
    speedBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        speedBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const speed = Number(btn.getAttribute('data-speed'));
        if (this.callbacks.onSpeedChange) this.callbacks.onSpeedChange(speed);
      });
    });

    // Quality tier button
    const qualityBtn = document.getElementById('btn-quality-toggle');
    if (qualityBtn) {
      qualityBtn.addEventListener('click', () => {
        if (this.callbacks.onQualityChange) this.callbacks.onQualityChange();
      });
    }

    // Reset button
    const resetBtn = document.getElementById('btn-reset-game');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Apakah kamu yakin ingin mereset permainan dan memulai kembali dari tahun 1920?')) {
          if (this.callbacks.onReset) this.callbacks.onReset();
        }
      });
    }

    // Tab buttons
    const tabBtns = document.querySelectorAll('.drawer-nav .nav-tab');
    tabBtns.forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabKey = tab.getAttribute('data-tab');
        this.setActiveTab(tabKey);
      });
    });

    // Mobile drawer toggle handle
    const toggle = document.getElementById('drawer-toggle');
    const drawer = document.getElementById('game-drawer');
    if (toggle && drawer) {
      toggle.addEventListener('click', () => {
        this.isMobileDrawerOpen = !this.isMobileDrawerOpen;
        drawer.classList.toggle('open', this.isMobileDrawerOpen);
      });
    }

    // Event modal option buttons
    document.getElementById('btn-event-a')?.addEventListener('click', () => {
      if (this.callbacks.onEventChoice) this.callbacks.onEventChoice('optionA');
    });
    document.getElementById('btn-event-b')?.addEventListener('click', () => {
      if (this.callbacks.onEventChoice) this.callbacks.onEventChoice('optionB');
    });

    // Endscreen restart
    document.getElementById('btn-endscreen-restart')?.addEventListener('click', () => {
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
      era: '🚀 Kemajuan Era Media',
    };
    const titleEl = document.getElementById('drawer-tab-title');
    if (titleEl) titleEl.textContent = titles[tabKey] || '';
  }

  /**
   * Update seluruh data HUD & panel dari gameState terkini
   */
  update(gameState) {
    // 1. Top HUD
    const moneyEl = document.getElementById('hud-money');
    if (moneyEl) {
      moneyEl.textContent = `$${Math.round(gameState.money).toLocaleString()}`;
      moneyEl.style.color = gameState.money < 0 ? '#ef4444' : '#22c55e';
    }

    const repEl = document.getElementById('hud-reputation');
    if (repEl) {
      repEl.textContent = `${Math.round(gameState.reputation)}/100`;
    }

    const audEl = document.getElementById('hud-audience');
    if (audEl) {
      audEl.textContent = (gameState.totalAudience || 0).toLocaleString();
    }

    const profEl = document.getElementById('hud-profit');
    if (profEl) {
      const p = gameState.monthlyHistory?.lastProfit || 0;
      profEl.textContent = `${p >= 0 ? '+' : ''}$${Math.round(p).toLocaleString()}/bln`;
      profEl.style.color = p >= 0 ? '#22c55e' : '#ef4444';
    }

    const dateEl = document.getElementById('hud-date');
    if (dateEl) {
      dateEl.textContent = `${gameState.day} Bln ${gameState.month}, ${gameState.year}`;
    }

    const eraBadge = document.getElementById('hud-era-badge');
    if (eraBadge) {
      eraBadge.textContent = CONFIG.ERAS[gameState.currentEraIndex]?.name || 'Era Media';
    }

    const tierBtn = document.getElementById('btn-quality-toggle');
    if (tierBtn) {
      const tierMap = { high: 'Tinggi', med: 'Sedang', low: 'Rendah' };
      tierBtn.textContent = `Grafis: ${tierMap[gameState.qualityTier] || 'Sedang'}`;
    }

    // 2. News Ticker
    const ticker = document.getElementById('ticker-text');
    if (ticker && gameState.logs && gameState.logs.length > 0) {
      ticker.textContent = gameState.logs[0].text;
    }

    // 3. Render Panel Konten
    this.renderBuildPane(gameState);
    this.renderUnitPane(gameState);
    this.renderResearchPane(gameState);
    this.renderCompetitorsPane(gameState);
    this.renderEraPane(gameState);

    // 4. Modal Event
    this.renderEventModal(gameState);

    // 5. End Screen
    this.renderEndScreenModal(gameState);
  }

  renderBuildPane(gameState) {
    const pane = document.getElementById('pane-build');
    if (!pane) return;

    const selectedPlotId = gameState.selectedPlotId;
    const selectedPlot = selectedPlotId !== null ? gameState.plots[selectedPlotId] : null;

    let html = `
      <div class="pane-header">
        <h3>Pilih Bangunan untuk Kavling</h3>
        <p class="text-muted">${selectedPlot ? `Kavling #${selectedPlotId + 1} terpilih (Status: ${selectedPlot.unit ? 'Terisi' : 'Kosong'})` : 'Pilih salah satu kavling 6x6 di peta untuk mendirikan bangunan.'}</p>
      </div>
    `;

    if (selectedPlot && selectedPlot.unit) {
      html += `
        <div class="card p-3 mb-3 border-accent">
          <div class="d-flex justify-between align-center">
            <strong>${selectedPlot.unit.name}</strong>
            <span class="badge">Lvl ${selectedPlot.unit.level}</span>
          </div>
          <p class="text-sm text-muted mt-1">Kavling ini sudah memiliki operasional media. Buka tab <strong>Unit</strong> untuk mengelola staf dan anggarannya.</p>
          <button class="btn-secondary btn-sm mt-2" onclick="window.__uiManager.setActiveTab('unit')">Buka Pengelolaan Unit</button>
        </div>
      `;
    }

    html += `<div class="build-grid">`;

    // Tampilkan bangunan dari era yang sudah terbuka
    for (let i = 0; i <= gameState.currentEraIndex; i++) {
      const era = CONFIG.ERAS[i];
      const bConfig = CONFIG.BUILDINGS[era.buildingId];
      if (!bConfig) continue;

      const canAfford = gameState.money >= bConfig.buildCost;
      const canBuild = selectedPlot && !selectedPlot.unit && canAfford;

      html += `
        <div class="build-card ${canAfford ? '' : 'disabled'}">
          <div class="build-card-head">
            <span class="build-name">${bConfig.name}</span>
            <span class="build-price">$${bConfig.buildCost.toLocaleString()}</span>
          </div>
          <p class="build-desc">${bConfig.desc}</p>
          <div class="build-meta">
            <span>Audiens Awal: <strong>${bConfig.baseAudience.toLocaleString()}</strong></span>
            <span>Biaya Operasi: <strong>$${bConfig.baseUpkeep}/bln</strong></span>
          </div>
          <button class="btn-build mt-2" ${canBuild ? '' : 'disabled'} data-building-id="${era.buildingId}">
            ${selectedPlot ? (selectedPlot.unit ? 'Kavling Terisi' : canAfford ? 'Bangun di Kavling #' + (selectedPlotId + 1) : 'Uang Kurang') : 'Pilih Kavling Dahulu'}
          </button>
        </div>
      `;
    }

    html += `</div>`;
    pane.innerHTML = html;

    // Attach click listeners to build buttons
    pane.querySelectorAll('.btn-build').forEach((btn) => {
      btn.addEventListener('click', () => {
        const buildingId = btn.getAttribute('data-building-id');
        if (selectedPlotId !== null && this.callbacks.onBuild) {
          this.callbacks.onBuild(selectedPlotId, buildingId);
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
          <p class="text-muted">Klik salah satu kavling berbangunan di peta 3D untuk mengelola operasionalnya.</p>
        </div>
      `;
      return;
    }

    const bConfig = CONFIG.BUILDINGS[unit.type];
    const upgradeCost = Math.round(bConfig.buildCost * Math.pow(bConfig.upgradeMultiplier, unit.level));
    const isMaxLevel = unit.level >= bConfig.maxLevel;
    const canUpgrade = !isMaxLevel && gameState.money >= upgradeCost;

    pane.innerHTML = `
      <div class="pane-header">
        <div class="d-flex justify-between align-center">
          <div>
            <h3>${unit.name}</h3>
            <span class="text-sm text-muted">Kavling #${unit.plotId + 1} · ${CONFIG.ERAS[unit.eraIndex]?.name}</span>
          </div>
          <span class="level-tag">Tingkat ${unit.level} / ${bConfig.maxLevel}</span>
        </div>
      </div>

      <!-- Upgrade Box -->
      <div class="card card-upgrade mb-3">
        <div class="d-flex justify-between align-center">
          <div>
            <strong>Upgrade Bangunan</strong>
            <p class="text-sm text-muted">${isMaxLevel ? 'Mencapai kapasitas maksimum' : `Biaya: $${upgradeCost.toLocaleString()} · +50% Audiens & Detail 3D`}</p>
          </div>
          <button id="btn-unit-upgrade" class="btn-primary" ${canUpgrade ? '' : 'disabled'}>
            ${isMaxLevel ? 'Maksimal' : 'Upgrade'}
          </button>
        </div>
      </div>

      <!-- Staff Management -->
      <div class="card mb-3">
        <h4 class="mb-2">Kelola Staf Redaksi & Kantor</h4>
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

      <!-- Budget Allocation Sliders -->
      <div class="card mb-3">
        <h4 class="mb-1">Alokasi Anggaran Konten</h4>
        <p class="text-xs text-muted mb-3">Seimbangkan kualitas isi, kuantitas penerbitan, dan kerapatan iklan.</p>

        <div class="slider-row">
          <label>Kualitas Konten: <span id="val-quality">${unit.budget.quality}%</span></label>
          <input type="range" id="range-quality" min="10" max="80" value="${unit.budget.quality}">
        </div>
        <div class="slider-row">
          <label>Kuantitas Produksi: <span id="val-quantity">${unit.budget.quantity}%</span></label>
          <input type="range" id="range-quantity" min="10" max="80" value="${unit.budget.quantity}">
        </div>
        <div class="slider-row">
          <label>Kerapatan Iklan: <span id="val-ads">${unit.budget.ads}%</span></label>
          <input type="range" id="range-ads" min="10" max="80" value="${unit.budget.ads}">
        </div>
      </div>

      <!-- Actions -->
      <div class="d-flex justify-between align-center mt-3">
        <span class="text-sm text-muted">Audiens Saat Ini: <strong>${unit.audience.toLocaleString()}</strong></span>
        <button id="btn-unit-demolish" class="btn-danger btn-sm">Robohkan Gedung</button>
      </div>
    `;

    // Bind unit actions
    document.getElementById('btn-unit-upgrade')?.addEventListener('click', () => {
      if (this.callbacks.onUpgrade) this.callbacks.onUpgrade(unit.id);
    });

    document.getElementById('btn-unit-demolish')?.addEventListener('click', () => {
      if (confirm(`Yakin ingin merobohkan ${unit.name}? Anda akan menerima pengembalian sebagian dana.`)) {
        if (this.callbacks.onDemolish) this.callbacks.onDemolish(unit.id);
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

    // Budget slider inputs
    const rQuality = document.getElementById('range-quality');
    const rQuantity = document.getElementById('range-quantity');
    const rAds = document.getElementById('range-ads');

    const updateBudget = () => {
      const q = Number(rQuality.value);
      const k = Number(rQuantity.value);
      const a = Number(rAds.value);
      if (this.callbacks.onBudgetChange) {
        this.callbacks.onBudgetChange(unit.id, { quality: q, quantity: k, ads: a });
      }
      this.update(gameState);
    };

    if (rQuality && rQuantity && rAds) {
      rQuality.addEventListener('input', updateBudget);
      rQuantity.addEventListener('input', updateBudget);
      rAds.addEventListener('input', updateBudget);
    }
  }

  renderResearchPane(gameState) {
    const pane = document.getElementById('pane-research');
    if (!pane) return;

    let html = `
      <div class="pane-header">
        <h3>Pohon Riset Inovasi Media (8 Node)</h3>
        <p class="text-muted">Kembangkan teknologi media untuk membuka era dan mendongkrak pendapatan.</p>
      </div>
    `;

    if (gameState.activeResearch) {
      const r = gameState.activeResearch;
      const pct = Math.min(100, Math.round((r.progressDays / r.totalDays) * 100));
      html += `
        <div class="card card-active-research mb-3">
          <div class="d-flex justify-between align-center mb-1">
            <strong>Riset Berlangsung: ${r.title}</strong>
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

      html += `
        <div class="research-card ${isResearched ? 'completed' : meetsPrereq ? '' : 'locked'}">
          <div class="research-head">
            <span class="research-title">${node.title}</span>
            <span class="badge ${isResearched ? 'badge-success' : 'badge-default'}">
              ${isResearched ? '✓ Selesai' : isCurrentActive ? 'Sedang Riset' : `$${node.cost.toLocaleString()}`}
            </span>
          </div>
          <p class="text-xs text-muted">${node.era} · ${node.daysRequired} Hari Riset</p>
          <p class="research-effect">${node.effectText}</p>
          ${node.prereq.length > 0 ? `<p class="text-xs text-warning">Syarat: ${node.prereq.map((p) => CONFIG.RESEARCH_NODES.find((x) => x.id === p)?.title).join(', ')}</p>` : ''}
          <button class="btn-research mt-2" ${canStart ? '' : 'disabled'} data-node-id="${node.id}">
            ${isResearched ? 'Telah Dikuasai' : isCurrentActive ? 'Dalam Proses...' : !meetsPrereq ? 'Terkunci' : canAfford ? 'Mulai Riset' : 'Uang Kurang'}
          </button>
        </div>
      `;
    }
    html += `</div>`;
    pane.innerHTML = html;

    pane.querySelectorAll('.btn-research').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nodeId = btn.getAttribute('data-node-id');
        ResearchTreeSystem.startResearch(nodeId, gameState);
        this.update(gameState);
      });
    });
  }

  renderCompetitorsPane(gameState) {
    const pane = document.getElementById('pane-competitors');
    if (!pane) return;

    pane.innerHTML = `
      <div class="pane-header">
        <h3>Pangsa Pasar & Media Pesaing</h3>
        <p class="text-muted">Pertahankan posisi #1 selama 12 bulan di Era Sosial Media untuk memenangkan permainan.</p>
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
          <span>Rekor Posisi #1:</span>
          <strong>${gameState.consecutiveMonthsAsTop1} / ${CONFIG.WIN_CONSECUTIVE_MONTHS_TOP1} Bulan</strong>
        </div>
      </div>

      <div class="competitor-list">
        <div class="competitor-row player-row">
          <div>
            <strong>Kerajaan Mediamu</strong>
            <span class="text-xs text-muted d-block">${gameState.totalAudience.toLocaleString()} Pembaca</span>
          </div>
          <span class="market-pct">${gameState.playerMarketShare}%</span>
        </div>

        ${gameState.competitors.map((c) => `
          <div class="competitor-row">
            <div>
              <strong style="color: ${c.color}">${c.name}</strong>
              <span class="text-xs text-muted d-block">${c.audience.toLocaleString()} Pembaca</span>
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
        <h3>Garis Waktu Era Media</h3>
        <p class="text-muted">Kembangkan media melewati 6 zaman revolusi komunikasi manusia.</p>
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
          <p class="text-sm text-muted mb-2">${nextEra.description}</p>
          <ul class="req-list text-xs">
            <li class="${gameState.money >= nextEra.unlockCost ? 'met' : 'unmet'}">Biaya Modal: $${nextEra.unlockCost.toLocaleString()}</li>
            <li class="${gameState.reputation >= nextEra.unlockReputation ? 'met' : 'unmet'}">Reputasi Minimal: ${nextEra.unlockReputation}</li>
            ${nextEra.requiredResearch ? `<li class="${gameState.researchedNodes.includes(nextEra.requiredResearch) ? 'met' : 'unmet'}">Riset: ${CONFIG.RESEARCH_NODES.find((r) => r.id === nextEra.requiredResearch)?.title}</li>` : ''}
          </ul>
          <button id="btn-advance-era" class="btn-primary mt-3" ${check.eligible ? '' : 'disabled'}>
            ${check.eligible ? `Masuki ${nextEra.name}` : `Syarat Belum Terpenuhi (${check.reason})`}
          </button>
        </div>
      `;
    } else {
      html += `
        <div class="card p-3 border-accent">
          <h4>Puncak Era Tertinggi Tercapai!</h4>
          <p class="text-sm text-muted">Anda telah berada di Era Media Sosial & Algoritma. Pertahankan pangsa pasar #1 untuk menamatkan permainan!</p>
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

  renderEndScreenModal(gameState) {
    const modal = document.getElementById('modal-endscreen');
    if (!modal) return;

    if (gameState.gameStatus === 'playing') {
      modal.classList.add('hidden');
      return;
    }

    const isWin = gameState.gameStatus === 'won';
    const badge = document.getElementById('endscreen-badge');
    const title = document.getElementById('endscreen-title');
    const summary = document.getElementById('endscreen-summary');
    const statsGrid = document.getElementById('endscreen-stats');

    if (badge) {
      badge.textContent = isWin ? '🏆 KEMENANGAN TOTAL' : '💀 KEBANGKRUTAN';
      badge.className = `end-badge ${isWin ? 'badge-win' : 'badge-lose'}`;
    }

    if (title) {
      title.textContent = isWin ? 'Media Mogul Legendaris!' : 'Kekaisaran Media Runtuh!';
    }

    if (summary && gameState.endStats) {
      summary.textContent = gameState.endStats.reason;
    }

    if (statsGrid && gameState.endStats) {
      const s = gameState.endStats;
      statsGrid.innerHTML = `
        <div class="stat-box"><span>Total Audiens:</span><strong>${s.finalAudience.toLocaleString()}</strong></div>
        <div class="stat-box"><span>Kas Akhir:</span><strong>$${s.finalMoney.toLocaleString()}</strong></div>
        <div class="stat-box"><span>Reputasi Akhir:</span><strong>${s.finalReputation}/100</strong></div>
        <div class="stat-box"><span>Gedung Terbangun:</span><strong>${s.unitsBuilt}</strong></div>
        <div class="stat-box"><span>Peristiwa Dihadapi:</span><strong>${s.eventsResolved}</strong></div>
        <div class="stat-box"><span>Tahun Terakhir:</span><strong>${s.yearsPlayed}</strong></div>
      `;
    }

    modal.classList.remove('hidden');
  }
}
