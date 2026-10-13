# 🎮 Three.js Game Asset Generator (Skill)

Skill untuk AI code editor (Claude Code, Claude.ai, dan editor lain yang mendukung `SKILL.md`) yang **membuat asset game 3D sebagai kode three.js**: karakter, senjata, props, pohon, batu, bangunan, terrain, VFX/partikel, dan paket asset lengkap. Hasilnya langsung bisa di-preview di browser, divalidasi otomatis, dan diekspor ke `.glb`.

> **English:** An AI-editor skill that generates procedural, low-poly three.js game assets (modules + live viewer + validator + GLB export). See `SKILL.md` for the instructions the AI follows.

## Apa yang dihasilkan

| Output | Keterangan |
|---|---|
| `library/<kategori>/<id>.js` | Modul asset: `meta` + `create(options)` yang mengembalikan `THREE.Group` |
| `registry.js` / `registry.json` | Daftar semua asset, `create('knight', { ... })` |
| `viewer/index.html` | Preview langsung: orbit, slider untuk semua opsi, wireframe, screenshot PNG, ekspor GLB |
| `exports/*.glb` | Model untuk Unity / Godot / Unreal / Blender (opsional) |

Yang **tidak** dihasilkan: model organik fotorealistis, karakter dengan rig kompleks, gambar/spritesheet. Fokusnya gaya low-poly yang stylish dan konsisten.

## Instalasi

**Claude Code**
```bash
# untuk semua proyek
cp -r threejs-asset-generator ~/.claude/skills/
# atau hanya satu proyek
mkdir -p .claude/skills && cp -r threejs-asset-generator .claude/skills/
```

**Claude.ai / Claude Desktop**
Buka pengaturan (Settings) → bagian Skills/Capabilities, lalu unggah file `threejs-asset-generator.zip` ini.

**Editor lain (Cursor, dll.)**
Salin folder ini ke proyek dan arahkan rules/instruksi AI ke `SKILL.md` (misalnya lewat `AGENTS.md` atau `.cursor/rules`). Skrip di `scripts/` bekerja tanpa AI.

> Lokasi dan fitur tiap editor bisa berubah; cek dokumentasi resminya.

## Cara pakai (lewat AI)

Cukup minta dengan bahasa biasa:

- "Buatkan asset pack hutan: 4 jenis pohon, 3 batu, semak, dan api unggun."
- "Bikin karakter ksatria low-poly dengan animasi idle, jalan, dan serang."
- "Generate 10 senjata fantasi dan ekspor semuanya ke GLB."
- "Buat rumah desa 3 variasi, ada mode malam dengan jendela menyala."

AI akan menyiapkan proyek, menulis asset, menjalankan validasi sampai bersih, lalu memberi tahu cara membuka viewer.

## Cara pakai (manual, tanpa AI)

Butuh Node.js 18 atau lebih baru.

```bash
node scripts/init-project.mjs ./game-assets --examples   # --examples = sertakan 8 contoh asset
cd game-assets
npm install

npm run validate                     # cek semua asset
npm run serve                        # buka http://localhost:5173/viewer/
npm run new -- props magic-potion "Magic Potion"   # buat asset baru dari template
npm run export                       # semua asset → exports/*.glb
npm run export -- knight rock        # hanya sebagian
```

> Viewer **harus** dibuka lewat `npm run serve` (http), bukan klik dua kali file HTML, karena ES module diblokir pada `file://`. Viewer memuat three.js dari CDN, jadi butuh internet.

## Memakai asset di game kamu

```js
import * as THREE from 'three';
import { create } from './registry.js';

const knight = create('knight', { armorColor: '#335588' });
scene.add(knight);
knight.userData.setState('walk');          // idle | walk | attack

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  knight.userData.update(clock.elapsedTime, clock.getDelta());
  renderer.render(scene, camera);
});

// saat tidak dipakai lagi
scene.remove(knight); knight.userData.dispose();
```

## Contoh asset bawaan

| ID | Kategori | Isi |
|---|---|---|
| `pine-tree` | environment | Pohon pinus, opsi salju, animasi goyang angin |
| `rock` | environment | Gugus batu, warna per-face, lumut |
| `terrain-chunk` | terrain | Terrain noise dengan biome, bisa disambung antar-chunk |
| `house` | buildings | Rumah dengan atap pelana, cerobong, jendela menyala di mode malam |
| `knight` | characters | Humanoid dengan rig sendi, animasi idle/walk/attack, pedang & perisai opsional |
| `sword` | props | Pedang dengan permata, animasi display |
| `treasure-chest` | props | Peti dengan engsel, buka/tutup halus, koin emas |
| `campfire` | vfx | Api unggun: partikel api, bara, cahaya berkedip |

## Aturan asset (kontrak)

1. 1 unit = 1 meter, sumbu Y ke atas, bagian depan menghadap +Z, origin di tengah dasar.
2. Deterministik: pakai `createRng(seed)`, tidak boleh `Math.random()`.
3. Tanpa file eksternal (gambar, model, font). Tekstur dibuat prosedural dan opsional.
4. Selalu diakhiri `finalize(...)`.
5. Anggaran segitiga per kategori (props 1500, karakter 4000, bangunan 3000, terrain 8000, VFX 1000, dst.).
6. Setiap opsi ada di `meta.defaults` dan `meta.options` agar viewer membuat slider otomatis.

`npm run validate` memeriksa semuanya. Detail lengkap ada di `SKILL.md` dan folder `references/`.

## Struktur folder skill

```
threejs-asset-generator/
├── SKILL.md                    instruksi utama untuk AI
├── README.md  LICENSE
├── references/                 dibaca AI hanya bila perlu
│   ├── style-guide.md          satuan, anggaran poly, palet, proporsi, gaya
│   ├── geometry-recipes.md     resep bentuk untuk pohon, karakter, senjata, dll.
│   ├── materials-textures.md   material, vertex color, tekstur prosedural, toon
│   ├── animation.md            sistem state, resep animasi, partikel
│   ├── vfx-environment.md      api, air, langit, terrain, cuaca, dungeon
│   └── integration-export.md   pakai di game, GLB, performa, troubleshooting
├── scripts/
│   ├── init-project.mjs        membuat proyek asset
│   └── tools/                  new-asset, build-registry, validate, export-glb, serve
└── assets/
    ├── lib/                    rng, noise, helpers, textures, animation, budgets
    ├── viewer/index.html       viewer browser
    ├── templates/              template asset baru
    └── examples/               8 contoh asset
```

## Troubleshooting singkat

| Masalah | Solusi |
|---|---|
| `Cannot find package 'three'` | jalankan `npm install` di folder proyek |
| Viewer kosong / error `registry.js` | buka lewat `npm run serve`, jalankan `npm run registry` |
| Validator: "NOT deterministic" | ada `Math.random()` / `Date.now()` di `create()` |
| Validator: "pivot not at base" | lupa memanggil `finalize()` |
| GLB tanpa tekstur | ekspor via Node tidak punya canvas; pakai tombol GLB di viewer |

## Lisensi

MIT. Lihat `LICENSE`.
