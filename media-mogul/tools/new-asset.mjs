#!/usr/bin/env node
// new-asset.mjs — scaffold a new asset from templates/asset.template.js
//   npm run new -- <category> <id> ["Display Name"]
//   e.g. npm run new -- props magic-potion "Magic Potion"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES } from '../lib/budgets.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [category, id, ...nameParts] = process.argv.slice(2);

if (!category || !id) {
  console.error(`usage: npm run new -- <category> <id> ["Display Name"]\ncategories: ${CATEGORIES.join(', ')}`);
  process.exit(1);
}
if (!CATEGORIES.includes(category)) {
  console.error(`✗ unknown category "${category}". Use one of: ${CATEGORIES.join(', ')}`);
  process.exit(1);
}
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) {
  console.error(`✗ id "${id}" must be kebab-case (e.g. magic-potion)`);
  process.exit(1);
}

const name = nameParts.join(' ') || id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const dir = path.join(root, 'library', category);
const file = path.join(dir, `${id}.js`);
if (fs.existsSync(file)) {
  console.error(`✗ ${path.relative(root, file)} already exists`);
  process.exit(1);
}

const tpl = fs.readFileSync(path.join(root, 'templates/asset.template.js'), 'utf8');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(file, tpl.replaceAll('__ID__', id).replaceAll('__NAME__', name).replaceAll('__CATEGORY__', category));
console.log(`✓ created ${path.relative(root, file)}\n  next: edit it, then run  npm run validate`);
