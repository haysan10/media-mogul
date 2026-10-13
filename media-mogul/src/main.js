// main.js — Bootstrap renderer, scene, clock, loop simulasi, raycasting, resize & integrasi sistem
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { gameState, saveGame, loadGame, resetGame } from './state.js';
import { World } from './world/World.js';
import { PostProcessingManager } from './world/PostProcessing.js';
import { BuildingManager } from './map/BuildingManager.js';
import { CameraControls } from './controls/CameraControls.js';
import { VFXManager } from './vfx/VFX.js';
import { EconomySystem } from './systems/economy.js';
import { UnitManager } from './systems/unitManager.js';
import { EventSystem } from './systems/eventSystem.js';
import { CompetitorAISystem } from './systems/competitorAI.js';
import { ResearchTreeSystem } from './systems/researchTree.js';
import { EraManager } from './systems/eraManager.js';
import { WinLoseChecker } from './systems/winLoseChecker.js';
import { UIManager } from './ui/UIManager.js';

class GameApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.clock = new THREE.Clock();
    this.accumulatedTime = 0;
    this.lastUiUpdate = 0;

    this.initThree();
    this.initGameSystems();
    this.initControls();
    this.setupResize();
    this.loadInitialState();

    // Jalankan render & simulation loop
    this.renderer.setAnimationLoop(this.animate.bind(this));
  }

  initThree() {
    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera: Isometrik natural 42 derajat FOV
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.5, 350);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // Cap devicePixelRatio sesuai tier & jenis perangkat
    const isMobile = window.innerWidth < 768;
    const maxPr = isMobile ? 1.5 : 2.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPr));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);

    this.container.appendChild(this.renderer.domElement);
  }

  initGameSystems() {
    // 3D Subsystems
    this.world = new World(this.scene);
    this.buildingManager = new BuildingManager(this.scene);
    this.vfx = new VFXManager(this.scene);
    this.postProcessing = new PostProcessingManager(this.renderer, this.scene, this.camera);

    // Gameplay Systems
    this.economy = new EconomySystem(this.vfx, this.buildingManager);
    this.unitManager = new UnitManager(this.buildingManager, this.vfx);

    // UI Manager
    this.ui = new UIManager({
      onBuild: (plotId, buildingAssetId) => {
        const res = this.unitManager.buildUnit(plotId, buildingAssetId, gameState, this.world);
        if (res.success) {
          this.world.setSelectedPlot(plotId);
          this.ui.update(gameState);
          saveGame();
        } else {
          alert(res.reason);
        }
      },
      onUpgrade: (unitId) => {
        const res = this.unitManager.upgradeUnit(unitId, gameState, this.world);
        if (res.success) {
          this.ui.update(gameState);
          saveGame();
        } else {
          alert(res.reason);
        }
      },
      onDemolish: (unitId) => {
        const res = this.unitManager.demolishUnit(unitId, gameState);
        if (res.success) {
          this.world.setSelectedPlot(gameState.selectedPlotId);
          this.ui.update(gameState);
          saveGame();
        }
      },
      onBudgetChange: (unitId, budget) => {
        this.unitManager.setBudgetAllocation(unitId, budget, gameState);
      },
      onSpeedChange: (speed) => {
        gameState.speed = speed;
      },
      onEraAdvance: (targetEraIndex) => {
        const res = EraManager.advanceEra(targetEraIndex, gameState, this.world);
        if (res.success) {
          this.ui.update(gameState);
          saveGame();
        } else {
          alert(res.reason);
        }
      },
      onEventChoice: (choiceKey) => {
        EventSystem.resolveChoice(choiceKey, gameState);
        this.ui.update(gameState);
        saveGame();
      },
      onQualityChange: () => {
        const tiers = ['low', 'med', 'high'];
        const curIdx = tiers.indexOf(gameState.qualityTier);
        const nextTier = tiers[(curIdx + 1) % tiers.length];
        gameState.qualityTier = nextTier;
        this.world.setQualityTier(nextTier);
        this.ui.update(gameState);
        saveGame();
      },
      onReset: () => {
        resetGame();
        this.buildingManager.clearAll();
        this.world.applyEraColors(0, false);
        this.world.setSelectedPlot(null);
        this.ui.update(gameState);
      },
    });

    window.__uiManager = this.ui; // Expose untuk pintasan tombol UI inline
  }

  initControls() {
    this.controls = new CameraControls(this.camera, this.renderer.domElement, {
      onTap: (clientX, clientY) => {
        this.handleCanvasTap(clientX, clientY);
      },
      onHover: (clientX, clientY) => {
        this.handleCanvasHover(clientX, clientY);
      },
    });
  }

  handleCanvasTap(clientX, clientY) {
    const hit = this.buildingManager.raycastPlots(clientX, clientY, this.camera, this.world.plotMeshes);
    if (hit) {
      gameState.selectedPlotId = hit.plotId;
      this.world.setSelectedPlot(hit.plotId);

      const plot = gameState.plots[hit.plotId];
      if (plot && plot.unit) {
        this.ui.setActiveTab('unit');
      } else {
        this.ui.setActiveTab('build');
      }

      // Di layar mobile: otomatis buka drawer agar pemain langsung melihat menu aksi
      if (window.innerWidth < 768) {
        const drawer = document.getElementById('game-drawer');
        if (drawer) {
          drawer.classList.add('open');
          this.ui.isMobileDrawerOpen = true;
        }
      }

      this.ui.update(gameState);
    } else {
      // Tap di luar grid
      gameState.selectedPlotId = null;
      this.world.setSelectedPlot(null);
      this.ui.update(gameState);
    }
  }

  handleCanvasHover(clientX, clientY) {
    if (window.innerWidth < 768) return; // Nonaktifkan hover di layar sentuh mobile
    const hit = this.buildingManager.raycastPlots(clientX, clientY, this.camera, this.world.plotMeshes);
    this.world.setHoverPlot(hit ? hit.plotId : null);
  }

  setupResize() {
    const ro = new ResizeObserver(() => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (w === 0 || h === 0) return;

      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(w, h);
      this.postProcessing.setSize(w, h);
    });
    ro.observe(this.container);
  }

  loadInitialState() {
    const loaded = loadGame();
    if (loaded && gameState.units.length > 0) {
      // Re-spawn seluruh gedung yang tersimpan di state
      for (const unit of gameState.units) {
        const hitMesh = this.world.plotMeshes[unit.plotId];
        const coords = hitMesh
          ? { worldX: hitMesh.userData.worldX, worldZ: hitMesh.userData.worldZ }
          : { worldX: 0, worldZ: 0 };
        this.buildingManager.spawnBuilding(unit.plotId, unit.type, unit.level, coords);
      }
    }

    // Terapkan warna era dan tier grafis yang tersimpan
    this.world.applyEraColors(gameState.currentEraIndex, false);
    this.world.setQualityTier(gameState.qualityTier);
    this.ui.update(gameState);
  }

  animate() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Loop Simulasi Waktu Game (hanya jika speed > 0 dan belum tamat)
    if (gameState.speed > 0 && gameState.gameStatus === 'playing') {
      this.accumulatedTime += dt * gameState.speed;
      const dayInterval = CONFIG.TICK_SECONDS;

      while (this.accumulatedTime >= dayInterval) {
        this.accumulatedTime -= dayInterval;
        this.simulateDay();
      }
    }

    // 2. Update Subsystems
    this.world.update(dt);
    this.buildingManager.update(elapsedTime, dt);
    this.vfx.update(dt);
    this.postProcessing.update(gameState.currentEraIndex, gameState.qualityTier);

    // 3. Update UI secara berkala (sekitar 10 fps agar ringan & responsif)
    if (elapsedTime - this.lastUiUpdate > 0.1) {
      this.ui.update(gameState);
      this.lastUiUpdate = elapsedTime;
    }

    // 4. Render 3D Scene
    this.postProcessing.render();
  }

  simulateDay() {
    gameState.day += 1;

    // 1. Ekonomi Harian
    this.economy.tickDailyEconomy(gameState);

    // 2. Riset Harian
    ResearchTreeSystem.tickDailyResearch(gameState);

    // 3. Event Acak Harian
    EventSystem.tickDailyEvents(gameState);

    // 4. Kompetitor AI Harian
    CompetitorAISystem.tickDailyCompetitors(gameState);

    // 5. Pergantian Bulan (setiap 30 hari)
    if (gameState.day > CONFIG.DAYS_PER_MONTH) {
      gameState.day = 1;
      gameState.month += 1;

      // Pembukuan bulanan
      this.economy.tickMonthlyAccounting(gameState);

      // Evaluasi peringkat pasar bulanan
      CompetitorAISystem.checkMonthlyLeaderboard(gameState);

      // Evaluasi kondisi menang / kalah
      WinLoseChecker.check(gameState);

      // Simpan otomatis ke localStorage setiap bulan
      saveGame();

      // Pergantian Tahun (setiap 12 bulan)
      if (gameState.month > 12) {
        gameState.month = 1;
        gameState.year += 1;
      }
    }
  }
}

// Inisialisasi aplikasi saat DOM siap
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
