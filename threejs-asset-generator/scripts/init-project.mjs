#!/usr/bin/env node
// init-project.mjs — create (or upgrade) an asset project folder.
//
//   node init-project.mjs <targetDir> [--examples] [--force-library]
//
// Creates:  lib/  tools/  viewer/  templates/  library/  package.json  registry.js
// Existing files in library/ are NEVER overwritten (unless --force-library with --examples).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(here, '..');
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const target = path.resolve(args.find((a) => !a.startsWith('--')) ?? 'game-assets');

const log = (m) => console.log(m);
const copyDir = (from, to) => fs.cpSync(from, to, { recursive: true, force: true });

fs.mkdirSync(target, { recursive: true });

// runtime pieces: always refreshed so projects can be upgraded by re-running init
copyDir(path.join(skillRoot, 'assets/lib'), path.join(target, 'lib'));
copyDir(path.join(skillRoot, 'assets/viewer'), path.join(target, 'viewer'));
copyDir(path.join(skillRoot, 'assets/templates'), path.join(target, 'templates'));
copyDir(path.join(here, 'tools'), path.join(target, 'tools'));
log('✓ lib/ viewer/ templates/ tools/ copied');

// library: starts empty (or with the bundled examples)
const library = path.join(target, 'library');
const hasLibrary = fs.existsSync(library) && fs.readdirSync(library).length > 0;
fs.mkdirSync(library, { recursive: true });
if (flags.has('--examples') && (!hasLibrary || flags.has('--force-library'))) {
  copyDir(path.join(skillRoot, 'assets/examples'), library);
  log('✓ example assets copied to library/');
} else if (hasLibrary) {
  log('• library/ already has files — left untouched');
}

// package.json
const pkgPath = path.join(target, 'package.json');
if (!fs.existsSync(pkgPath)) {
  const pkg = {
    name: path.basename(target).toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
    version: '0.1.0',
    private: true,
    type: 'module',
    description: 'Procedural three.js game assets (generated with the threejs-asset-generator skill).',
    scripts: {
      new: 'node tools/new-asset.mjs',
      registry: 'node tools/build-registry.mjs',
      validate: 'node tools/build-registry.mjs && node tools/validate.mjs',
      serve: 'node tools/build-registry.mjs && node tools/serve.mjs',
      export: 'node tools/export-glb.mjs',
    },
    dependencies: { three: '0.160.0' },
    engines: { node: '>=18' },
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  log('✓ package.json written (three@0.160.0)');
}

fs.writeFileSync(path.join(target, '.gitignore'), 'node_modules/\n.DS_Store\n');

// registry
spawnSync(process.execPath, [path.join(target, 'tools/build-registry.mjs'), target], { stdio: 'inherit' });

log(`
Project ready: ${target}

Next:
  cd ${target}
  npm install
  npm run validate        # check every asset against the contract
  npm run serve           # open http://localhost:5173/viewer/
  npm run new -- props magic-potion "Magic Potion"
`);
