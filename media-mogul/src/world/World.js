// World.js — Diorama 3D kota, grid kavling 6x6, sky-dome, pencahayaan era & transisi fog halus
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { paintFaces, std, box } from '../../lib/helpers.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.currentEraIndex = 0;

    // Komponen Pencahayaan
    this.hemiLight = null;
    this.sunLight = null;
    this.skyDome = null;
    this.skyGeo = null;

    // Grid kavling
    this.plotMeshes = [];
    this.hoverHighlight = null;
    this.selectionHighlight = null;

    // State transisi era
    this.isTransitioning = false;
    this.transitionProgress = 1;
    this.transitionDuration = 2.0;
    this.fromEra = null;
    this.toEra = null;

    // Warna aktif
    this.curHorizon = new THREE.Color();
    this.curZenith = new THREE.Color();
    this.curFog = new THREE.Color();
    this.curHemiSky = new THREE.Color();
    this.curHemiGround = new THREE.Color();
    this.curSun = new THREE.Color();
    this.curSunIntensity = 1.6;

    this.init();
  }

  init() {
    this.setupLighting();
    this.setupSkyAndFog();
    this.setupGround();
    this.setupPlots();
    this.setupHighlights();
    this.applyEraColors(0, false);
  }

  setupLighting() {
    // Hemisphere light untuk ambien kaya warna langit dan tanah
    this.hemiLight = new THREE.HemisphereLight(0xffeed6, 0x63533e, 0.9);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // Directional light dengan bayangan tajam & lembut
    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.6);
    this.sunLight.position.set(22, 36, 18);
    this.sunLight.castShadow = true;

    // Optimasi frustum bayangan tepat mencakup kavling 6x6
    const d = 24;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 85;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.bias = -0.0005;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);
    this.sunLight.target.position.set(0, 0, 0);
  }

  setupSkyAndFog() {
    const era0 = CONFIG.DESIGN_TOKENS.eras[0];
    this.scene.fog = new THREE.Fog(era0.fog, era0.fogNear, era0.fogFar);

    // Sky dome bola besar 100m dengan gradient warna per-vertex
    this.skyGeo = new THREE.SphereGeometry(100, 16, 12);
    // Non-indexed agar tiap face/vertex independen
    const pos = this.skyGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    this.skyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const skyMat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      vertexColors: true,
      depthWrite: false,
    });
    this.skyDome = new THREE.Mesh(this.skyGeo, skyMat);
    this.scene.add(this.skyDome);
  }

  setupGround() {
    // Diorama dasar low-poly berkontur halus dengan paintFaces (hijau taman kota)
    const size = 56;
    const segments = 22;
    const planeGeo = new THREE.PlaneGeometry(size, size, segments, segments);
    planeGeo.rotateX(-Math.PI / 2);

    // Variasi elevasi sangat tipis di tepi diorama
    const pos = planeGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.hypot(x, z);
      if (dist > 18) {
        // Tepi luar melandai tipis ke bawah
        pos.setY(i, -(dist - 18) * 0.12);
      }
    }

    const paintedGeo = paintFaces(planeGeo, ({ centroid }) => {
      const dist = Math.hypot(centroid.x, centroid.z);
      // Warna hijau taman dengan variasi acak deterministik
      const hash = Math.sin(centroid.x * 3.7 + centroid.z * 5.3);
      if (dist > 20) {
        return hash > 0 ? '#385532' : '#324a2c'; // Tepi luar lebih gelap
      }
      if (hash > 0.4) return '#528246';
      if (hash > -0.2) return '#47733d';
      return '#3d6634';
    });

    const groundMat = std('#ffffff', {
      vertexColors: true,
      roughness: 0.95,
      metalness: 0,
    });

    const ground = new THREE.Mesh(paintedGeo, groundMat);
    ground.receiveShadow = true;
    ground.position.y = -0.05;
    this.scene.add(ground);

    // Jalan pembatas / trotoar perimeter diorama
    const roadMat = std('#525866', { roughness: 0.8 });
    const perimeterBox = box(size - 4, 0.08, size - 4, roadMat, 0, -0.04, 0);
    perimeterBox.receiveShadow = true;
    this.scene.add(perimeterBox);
  }

  setupPlots() {
    const gridSize = CONFIG.GRID_SIZE;
    const plotSize = CONFIG.PLOT_SIZE;
    const gap = CONFIG.PLOT_GAP;
    const halfGrid = (gridSize * (plotSize + gap) - gap) / 2;

    const plotBaseMat = std('#697282', { roughness: 0.7 });
    const plotGrassMat = std('#426b38', { roughness: 0.9 });
    const borderMat = std('#9aa5b8', { roughness: 0.5 });

    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        const id = z * gridSize + x;
        const posX = -halfGrid + x * (plotSize + gap) + plotSize / 2;
        const posZ = -halfGrid + z * (plotSize + gap) + plotSize / 2;

        const plotGroup = new THREE.Group();
        plotGroup.position.set(posX, 0, posZ);
        plotGroup.name = `plot-${id}`;

        // Trotoar dasar kavling
        const curb = box(plotSize + 0.2, 0.08, plotSize + 0.2, borderMat, 0, 0.04, 0);
        curb.receiveShadow = true;
        plotGroup.add(curb);

        // Rumput dasar kavling
        const grass = box(plotSize, 0.06, plotSize, plotGrassMat, 0, 0.08, 0);
        grass.receiveShadow = true;
        plotGroup.add(grass);

        // Mesh transparan tak kasat mata untuk raycasting akurat
        const hitGeo = new THREE.BoxGeometry(plotSize, 1.5, plotSize);
        const hitMat = new THREE.MeshBasicMaterial({ visible: false });
        const hitMesh = new THREE.Mesh(hitGeo, hitMat);
        hitMesh.position.y = 0.75;
        hitMesh.userData = { plotId: id, gridX: x, gridZ: z, worldX: posX, worldZ: posZ };
        plotGroup.add(hitMesh);

        this.plotMeshes.push(hitMesh);
        this.scene.add(plotGroup);
      }
    }
  }

  setupHighlights() {
    const plotSize = CONFIG.PLOT_SIZE;

    // Hover Highlight: Kotak tipis bercahaya kuning lembut
    const hoverMat = new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.hoverHighlight = new THREE.Mesh(new THREE.PlaneGeometry(plotSize, plotSize), hoverMat);
    this.hoverHighlight.rotateX(-Math.PI / 2);
    this.hoverHighlight.position.y = 0.12;
    this.hoverHighlight.visible = false;
    this.scene.add(this.hoverHighlight);

    // Selection Highlight: Kotak bercahaya biru aksen dengan garis border
    const selectMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    this.selectionHighlight = new THREE.Mesh(new THREE.PlaneGeometry(plotSize, plotSize), selectMat);
    this.selectionHighlight.rotateX(-Math.PI / 2);
    this.selectionHighlight.position.y = 0.13;
    this.selectionHighlight.visible = false;
    this.scene.add(this.selectionHighlight);
  }

  setHoverPlot(plotId) {
    if (plotId === null || plotId === undefined) {
      this.hoverHighlight.visible = false;
      return;
    }
    const hit = this.plotMeshes[plotId];
    if (hit) {
      this.hoverHighlight.position.x = hit.userData.worldX;
      this.hoverHighlight.position.z = hit.userData.worldZ;
      this.hoverHighlight.visible = true;
    }
  }

  setSelectedPlot(plotId) {
    if (plotId === null || plotId === undefined) {
      this.selectionHighlight.visible = false;
      return;
    }
    const hit = this.plotMeshes[plotId];
    if (hit) {
      this.selectionHighlight.position.x = hit.userData.worldX;
      this.selectionHighlight.position.z = hit.userData.worldZ;
      this.selectionHighlight.visible = true;
    }
  }

  applyEraColors(eraIndex, animate = true) {
    const eraToken = CONFIG.DESIGN_TOKENS.eras[eraIndex];
    if (!eraToken) return;

    if (!animate) {
      this.currentEraIndex = eraIndex;
      this.curHorizon.set(eraToken.skyHorizon);
      this.curZenith.set(eraToken.skyTop);
      this.curFog.set(eraToken.fog);
      this.curHemiSky.set(eraToken.skyTop);
      this.curHemiGround.set('#2f3542');
      this.curSun.set(eraToken.sunColor);
      this.curSunIntensity = eraToken.sunIntensity;

      this.updateSkyVertices();
      this.scene.fog.color.copy(this.curFog);
      this.scene.fog.near = eraToken.fogNear;
      this.scene.fog.far = eraToken.fogFar;

      this.hemiLight.color.copy(this.curHemiSky);
      this.hemiLight.groundColor.copy(this.curHemiGround);
      this.sunLight.color.copy(this.curSun);
      this.sunLight.intensity = this.curSunIntensity;
      return;
    }

    // Mulai transisi halus 2 detik
    this.fromEra = CONFIG.DESIGN_TOKENS.eras[this.currentEraIndex];
    this.toEra = eraToken;
    this.currentEraIndex = eraIndex;
    this.isTransitioning = true;
    this.transitionProgress = 0;
  }

  update(dt) {
    if (this.isTransitioning && this.fromEra && this.toEra) {
      this.transitionProgress += dt / this.transitionDuration;
      const k = THREE.MathUtils.clamp(this.transitionProgress, 0, 1);
      const t = THREE.MathUtils.smoothstep(k, 0, 1);

      this.curHorizon.lerpColors(new THREE.Color(this.fromEra.skyHorizon), new THREE.Color(this.toEra.skyHorizon), t);
      this.curZenith.lerpColors(new THREE.Color(this.fromEra.skyTop), new THREE.Color(this.toEra.skyTop), t);
      this.curFog.lerpColors(new THREE.Color(this.fromEra.fog), new THREE.Color(this.toEra.fog), t);
      this.curHemiSky.lerpColors(new THREE.Color(this.fromEra.skyTop), new THREE.Color(this.toEra.skyTop), t);
      this.curSun.lerpColors(new THREE.Color(this.fromEra.sunColor), new THREE.Color(this.toEra.sunColor), t);
      this.curSunIntensity = THREE.MathUtils.lerp(this.fromEra.sunIntensity, this.toEra.sunIntensity, t);

      this.updateSkyVertices();
      this.scene.fog.color.copy(this.curFog);
      this.scene.fog.near = THREE.MathUtils.lerp(this.fromEra.fogNear, this.toEra.fogNear, t);
      this.scene.fog.far = THREE.MathUtils.lerp(this.fromEra.fogFar, this.toEra.fogFar, t);

      this.hemiLight.color.copy(this.curHemiSky);
      this.sunLight.color.copy(this.curSun);
      this.sunLight.intensity = this.curSunIntensity;

      if (k >= 1) {
        this.isTransitioning = false;
      }
    }
  }

  updateSkyVertices() {
    if (!this.skyGeo) return;
    const pos = this.skyGeo.attributes.position;
    const colAttr = this.skyGeo.attributes.color;
    const v = new THREE.Vector3();
    const tempCol = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // Normalisasi Y terhadap radius 100 [-100..100] -> [0..1]
      const t = THREE.MathUtils.clamp((v.y + 10) / 95, 0, 1);
      tempCol.lerpColors(this.curHorizon, this.curZenith, t);
      colAttr.setXYZ(i, tempCol.r, tempCol.g, tempCol.b);
    }
    colAttr.needsUpdate = true;
  }

  setQualityTier(tier) {
    if (tier === 'high') {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = 1024;
      this.sunLight.shadow.mapSize.height = 1024;
    } else if (tier === 'med') {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = 512;
      this.sunLight.shadow.mapSize.height = 512;
    } else {
      // low tier
      this.sunLight.castShadow = false;
    }
  }
}
