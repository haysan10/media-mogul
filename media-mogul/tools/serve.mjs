#!/usr/bin/env node
// serve.mjs — zero-dependency static server for the viewer.
// ES modules cannot load from file:// in browsers, so the viewer must be served over http.
//   npm run serve                 → http://localhost:5173/viewer/
//   node tools/serve.mjs 8080     → custom port
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]) || 5173;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (urlPath === '/') {
    urlPath = '/index.html';
  } else if (urlPath === '/viewer') {
    res.writeHead(302, { Location: '/viewer/' });
    return res.end();
  }
  let file = path.join(root, urlPath);
  if (!file.startsWith(root)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, () => console.log(`Media Mogul Game: http://localhost:${port}/  |  Asset Viewer: http://localhost:${port}/viewer/   (Ctrl+C to stop)`));
