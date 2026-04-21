import express from "express";
import cors from "cors";
import path from "path";
import { initDatabase } from "./db/database.js";
import { examRouter, sessionRouter } from "./routes/examRoutes.js";

const app = express();
const PORT = process.env.PORT ?? 8031;

// Trust proxy — nötig wenn hinter nginx/Caddy/Traefik (für express-rate-limit)
// Setzt X-Forwarded-For korrekt aus. Nur aktivieren wenn tatsächlich ein Reverse Proxy vorgeschaltet ist.
if (
  process.env.TRUST_PROXY === "true" ||
  process.env.NODE_ENV === "production"
) {
  app.set("trust proxy", 1);
  console.log("[server] trust proxy aktiviert (Reverse-Proxy-Modus)");
}

// CORS — erlaubt alle in FRONTEND_URLS (kommasepariert) sowie localhost-Varianten
// Beispiel .env:  FRONTEND_URLS=https://examiner.letsgaming.de,http://localhost:8030
const rawOrigins = process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? "";
const allowedOrigins = new Set<string>(
  rawOrigins
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .concat([
      "http://localhost:8030",
      "http://localhost:5173",
      "http://localhost:3000",
    ]),
);

app.use(
  cors({
    origin: (origin, cb) => {
      // Requests ohne Origin (curl, Postman, server-to-server) immer erlauben
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin)) return cb(null, true);
      cb(new Error(`CORS: Origin nicht erlaubt: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  "/uploads",
  express.static(path.resolve(process.cwd(), "data", "uploads")),
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use("/api/exams", examRouter);
app.use("/api/sessions", sessionRouter);

initDatabase();

app.listen(PORT, () => {
  console.log(`✅ FIAE AP2 Backend läuft auf http://localhost:${PORT}`);
  console.log(`   Erlaubte Origins: ${[...allowedOrigins].join(", ")}`);
  console.log(
    `   OpenAI API Key: ${process.env.OPENAI_API_KEY ? "✓ gesetzt" : "✗ FEHLT — in .env setzen!"}`,
  );
});
