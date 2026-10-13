#!/usr/bin/env node
// serve.mjs — Zero-dependency static server with auto-port fallback & robust path routing.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaMogulDir = path.resolve(__dirname, '..');
const repoRootDir = path.resolve(mediaMogulDir, '..');

let requestedPort = Number(process.env.PORT || process.argv[2]) || 5173;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};

function resolveFilePath(urlPath) {
  // Normalize viewer route
  if (urlPath === '/viewer') {
    return { redirect: '/viewer/' };
  }

  // Strip optional /media-mogul prefix if present
  let cleanPath = urlPath;
  if (cleanPath === '/media-mogul') {
    return { redirect: '/' };
  }
  if (cleanPath.startsWith('/media-mogul/')) {
    cleanPath = cleanPath.slice('/media-mogul'.length);
  }

  if (cleanPath === '/' || cleanPath === '') {
    cleanPath = '/index.html';
  }

  // 1. Check in media-mogul directory
  let target = path.join(mediaMogulDir, cleanPath);
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, 'index.html');
  }
  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    return { filePath: target };
  }

  // 2. Check in repo root directory (for root files or assets)
  let rootTarget = path.join(repoRootDir, urlPath);
  if (fs.existsSync(rootTarget) && fs.statSync(rootTarget).isDirectory()) {
    rootTarget = path.join(rootTarget, 'index.html');
  }
  if (fs.existsSync(rootTarget) && fs.statSync(rootTarget).isFile()) {
    return { filePath: rootTarget };
  }

  return { notFound: true };
}

function createServer() {
  return http.createServer((req, res) => {
    // Add CORS headers for local development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400);
      return res.end('Bad Request');
    }

    const resolved = resolveFilePath(urlPath);
    if (resolved.redirect) {
      res.writeHead(302, { Location: resolved.redirect });
      return res.end();
    }
    if (resolved.notFound || !resolved.filePath) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }

    const file = resolved.filePath;
    const ext = path.extname(file).toLowerCase();
    const contentType = types[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(file).pipe(res);
  });
}

function startServer(port, maxAttempts = 10) {
  const server = createServer();

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Port ${port} sedang digunakan, mencoba port ${port + 1}...]`);
      if (maxAttempts > 0) {
        startServer(port + 1, maxAttempts - 1);
      } else {
        console.error(`Gagal memulai server setelah beberapa percobaan port.`);
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  server.listen(port, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 Media Mogul Local Server Aktif:`);
    console.log(`   👉 Game URL:         http://localhost:${port}/`);
    console.log(`   👉 Alternate URL:    http://localhost:${port}/media-mogul/`);
    console.log(`   👉 3D Asset Viewer:  http://localhost:${port}/viewer/`);
    console.log(`=================================================\n`);
  });
}

startServer(requestedPort);
