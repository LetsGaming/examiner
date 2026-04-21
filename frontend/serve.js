/**
 * serve.js — Examiner Frontend Production Server
 *
 * Läuft aus dem dist/-Verzeichnis nach dem Build.
 * - Serviert statische Dateien aus dem dist/-Verzeichnis
 * - SPA-Fallback: alle Routen ohne Dateiendung erhalten index.html
 * - Proxied /api/* → http://localhost:3001/api/* (Backend)
 * - Proxied /uploads/* → http://localhost:3001/uploads/* (Diagramm-Uploads)
 */

const http = require("http");
const path = require("path");
const fs = require("fs");

const FRONTEND_PORT = process.env.PORT ? Number(process.env.PORT) : 8030;
const BACKEND_HOST  = process.env.BACKEND_HOST || "localhost";
const BACKEND_PORT  = process.env.BACKEND_PORT ? Number(process.env.BACKEND_PORT) : 8031;

const MIME = {
  ".html":  "text/html; charset=utf-8",
  ".css":   "text/css",
  ".js":    "application/javascript",
  ".mjs":   "application/javascript",
  ".json":  "application/json",
  ".png":   "image/png",
  ".jpg":   "image/jpeg",
  ".jpeg":  "image/jpeg",
  ".gif":   "image/gif",
  ".svg":   "image/svg+xml",
  ".ico":   "image/x-icon",
  ".woff":  "font/woff",
  ".woff2": "font/woff2",
  ".ttf":   "font/ttf",
  ".map":   "application/json",
};

// Statische Dateien liegen im selben Verzeichnis wie serve.cjs (= dist/)
const DIST_DIR = __dirname;

// ─── Backend-Proxy ────────────────────────────────────────────────────────────

function proxyToBackend(req, res) {
  const options = {
    hostname: BACKEND_HOST,
    port:     BACKEND_PORT,
    path:     req.url,
    method:   req.method,
    headers:  { ...req.headers, host: `${BACKEND_HOST}:${BACKEND_PORT}` },
  };

  const upstream = http.request(options, (backendRes) => {
    // Antwort-Header weiterleiten (CORS-Header des Backends übernehmen)
    res.writeHead(backendRes.statusCode, backendRes.headers);
    backendRes.pipe(res, { end: true });
  });

  upstream.on("error", (err) => {
    console.error("[proxy] Backend nicht erreichbar:", err.message);
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
    }
    res.end(JSON.stringify({
      success: false,
      error: "Backend nicht erreichbar. Stelle sicher dass der Backend-Server läuft.",
    }));
  });

  // Request-Body weiterleiten (für POST/PUT)
  req.pipe(upstream, { end: true });
}

// ─── Statische Dateien ────────────────────────────────────────────────────────

function serveStatic(req, res) {
  const urlPath = new URL(req.url, `http://localhost:${FRONTEND_PORT}`).pathname;
  let filePath   = path.join(DIST_DIR, urlPath);
  const ext      = path.extname(filePath);

  fs.stat(filePath, (statErr, stats) => {
    // Verzeichnis → index.html darin suchen
    if (!statErr && stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    fs.readFile(filePath, (readErr, data) => {
      if (!readErr) {
        const mime = MIME[path.extname(filePath)] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": mime });
        res.end(data);
        return;
      }

      // SPA-Fallback: Routen ohne Dateiendung bekommen index.html
      if (!ext || ext === ".html") {
        fs.readFile(path.join(DIST_DIR, "index.html"), (fallbackErr, html) => {
          if (fallbackErr) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Server-Fehler: index.html nicht gefunden. Wurde der Build ausgeführt?");
            return;
          }
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(html);
        });
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
      }
    });
  });
}

// ─── Server ───────────────────────────────────────────────────────────────────

http
  .createServer((req, res) => {
    const { pathname } = new URL(req.url, `http://localhost:${FRONTEND_PORT}`);

    // /api/* und /uploads/* → Backend weiterleiten
    if (pathname.startsWith("/api/") || pathname.startsWith("/uploads/")) {
      proxyToBackend(req, res);
      return;
    }

    // Alles andere → statische Dateien / SPA-Fallback
    serveStatic(req, res);
  })
  .listen(FRONTEND_PORT, () => {
    console.log(`\x1b[32m✓\x1b[0m Frontend läuft auf  \x1b[1mhttp://localhost:${FRONTEND_PORT}\x1b[0m`);
    console.log(`\x1b[90m  Backend-Proxy →     http://${BACKEND_HOST}:${BACKEND_PORT}\x1b[0m`);
  });
