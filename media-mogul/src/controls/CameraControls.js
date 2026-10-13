// CameraControls.js — Kontrol kamera isometrik terpadu via Pointer Events (mouse & touch)
import * as THREE from 'three';

export class CameraControls {
  constructor(camera, domElement, options = {}) {
    this.camera = camera;
    this.domElement = domElement;

    this.onTap = options.onTap || null;
    this.onHover = options.onHover || null;

    // Batas orbit & target
    this.target = new THREE.Vector3(0, 0, 0);
    this.minDistance = 14;
    this.maxDistance = 60;
    this.distance = 36;
    this.pitch = THREE.MathUtils.degToRad(38); // Sudut kemiringan isometrik
    this.yaw = THREE.MathUtils.degToRad(45);   // Sudut rotasi 45 derajat

    // Batas area gerak kamera (diorama clamp)
    this.panLimit = 20;

    // State pointer
    this.pointers = new Map();
    this.pointerStartPos = new Map();
    this.pointerStartTime = 0;
    this.lastPinchDist = 0;
    this.isDragging = false;
    this.hasMovedSignificantly = false;

    // Bound listeners
    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onPointerCancel = this.onPointerCancel.bind(this);
    this._onWheel = this.onWheel.bind(this);

    this.attach();
    this.updateCamera();
  }

  attach() {
    this.domElement.style.touchAction = 'none'; // Cegah default scrolling browser
    this.domElement.addEventListener('pointerdown', this._onPointerDown);
    this.domElement.addEventListener('pointermove', this._onPointerMove);
    this.domElement.addEventListener('pointerup', this._onPointerUp);
    this.domElement.addEventListener('pointercancel', this._onPointerCancel);
    this.domElement.addEventListener('wheel', this._onWheel, { passive: false });
  }

  detach() {
    this.domElement.removeEventListener('pointerdown', this._onPointerDown);
    this.domElement.removeEventListener('pointermove', this._onPointerMove);
    this.domElement.removeEventListener('pointerup', this._onPointerUp);
    this.domElement.removeEventListener('pointercancel', this._onPointerCancel);
    this.domElement.removeEventListener('wheel', this._onWheel);
  }

  updateCamera() {
    // Hitung posisi kamera berdasarkan yaw, pitch, dan distance
    const cx = this.target.x + this.distance * Math.cos(this.pitch) * Math.sin(this.yaw);
    const cy = this.target.y + this.distance * Math.sin(this.pitch);
    const cz = this.target.z + this.distance * Math.cos(this.pitch) * Math.cos(this.yaw);

    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(this.target);
  }

  onPointerDown(e) {
    if (e.target !== this.domElement) return;
    this.domElement.setPointerCapture(e.pointerId);

    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.pointerStartPos.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pointers.size === 1) {
      this.pointerStartTime = performance.now();
      this.hasMovedSignificantly = false;
      this.isDragging = true;
    } else if (this.pointers.size === 2) {
      this.hasMovedSignificantly = true;
      const pts = Array.from(this.pointers.values());
      this.lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  }

  onPointerMove(e) {
    if (!this.pointers.has(e.pointerId)) {
      // Hover event untuk mouse desktop
      if (this.pointers.size === 0 && this.onHover) {
        this.onHover(e.clientX, e.clientY);
      }
      return;
    }

    const prev = this.pointers.get(e.pointerId);
    const start = this.pointerStartPos.get(e.pointerId);
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;

    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 7) {
      this.hasMovedSignificantly = true;
    }

    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Mode 1: Pan kamera satu jari / drag mouse
    if (this.pointers.size === 1) {
      this.pan(dx, dy);
    }
    // Mode 2: Dua jari pinch zoom
    else if (this.pointers.size === 2) {
      const pts = Array.from(this.pointers.values());
      const curDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (this.lastPinchDist > 0) {
        const pinchDelta = (this.lastPinchDist - curDist) * 0.08;
        this.zoom(pinchDelta);
      }
      this.lastPinchDist = curDist;
    }
  }

  onPointerUp(e) {
    this.domElement.releasePointerCapture(e.pointerId);

    const start = this.pointerStartPos.get(e.pointerId);
    const elapsed = performance.now() - this.pointerStartTime;

    // Cek apakah aksi merupakan tap / klik cepat tanpa geseran
    if (
      this.pointers.size === 1 &&
      !this.hasMovedSignificantly &&
      elapsed < 350 &&
      start &&
      Math.hypot(e.clientX - start.x, e.clientY - start.y) < 10
    ) {
      if (this.onTap) {
        this.onTap(e.clientX, e.clientY);
      }
    }

    this.pointers.delete(e.pointerId);
    this.pointerStartPos.delete(e.pointerId);

    if (this.pointers.size === 0) {
      this.isDragging = false;
      this.lastPinchDist = 0;
    }
  }

  onPointerCancel(e) {
    this.pointers.delete(e.pointerId);
    this.pointerStartPos.delete(e.pointerId);
    if (this.pointers.size === 0) {
      this.isDragging = false;
    }
  }

  onWheel(e) {
    e.preventDefault();
    const zoomAmount = e.deltaY * 0.025;
    this.zoom(zoomAmount);
  }

  pan(screenDx, screenDy) {
    // Geser target kamera di bidang XZ sejajar arah pandang
    const factor = (this.distance / 500) * 1.1;

    // Vektor arah kanan kamera di bidang datar
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);

    // Vektor arah maju kamera di bidang datar
    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);

    this.target.x -= (rightX * screenDx + forwardX * screenDy) * factor;
    this.target.z -= (rightZ * screenDx + forwardZ * screenDy) * factor;

    // Batasi target agar tidak keluar dari area diorama
    this.target.x = THREE.MathUtils.clamp(this.target.x, -this.panLimit, this.panLimit);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -this.panLimit, this.panLimit);

    this.updateCamera();
  }

  zoom(delta) {
    this.distance = THREE.MathUtils.clamp(this.distance + delta, this.minDistance, this.maxDistance);
    this.updateCamera();
  }
}
