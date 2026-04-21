const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = 8030;
const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function proxyToSteam(steamUrl, res) {
  https
    .get(steamUrl, (upstream) => {
      let body = "";
      upstream.on("data", (c) => (body += c));
      upstream.on("end", () => {
        res.writeHead(upstream.statusCode, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(body);
      });
    })
    .on("error", () => {
      res.writeHead(502);
      res.end('{"error":"proxy failed"}');
    });
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // Steam API proxy
    if (url.pathname === "/api/steam" && url.searchParams.get("url")) {
      const steamUrl = url.searchParams.get("url");
      if (!steamUrl.startsWith("https://api.steampowered.com/")) {
        res.writeHead(403);
        res.end('{"error":"forbidden"}');
        return;
      }
      proxyToSteam(steamUrl, res);
      return;
    }

    // Static files
    let filePath = path.join(__dirname, url.pathname);
    const ext = path.extname(filePath);

    fs.stat(filePath, (err, stats) => {
      // If it's a directory, try index.html inside it
      if (!err && stats.isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }

      fs.readFile(filePath, (err, data) => {
        if (!err) {
          const mime =
            MIME[path.extname(filePath)] || "application/octet-stream";
          res.writeHead(200, { "Content-Type": mime });
          res.end(data);
          return;
        }

        // SPA fallback: serve index.html for any route without a file extension
        if (!ext || ext === ".html") {
          fs.readFile(path.join(__dirname, "index.html"), (err2, html) => {
            if (err2) {
              res.writeHead(500);
              res.end("Server error");
              return;
            }
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(html);
          });
        } else {
          res.writeHead(404);
          res.end("Not found");
        }
      });
    });
  })
  .listen(PORT, () => console.log(`http://localhost:${PORT}`));
