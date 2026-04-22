import express from "express";
import cors from "cors";
import path from "path";
import { initDatabase } from "./db/database.js";
import { poolRouter } from "./routes/poolRoutes.js";
import { sessionRouter } from "./routes/sessionRoutes.js";
import { evaluationRouter } from "./routes/evaluationRoutes.js";
import { settingsRouter, initSettingsTable } from "./routes/settingsRoutes.js";
import { authRouter, initAuthTable } from "./routes/authRoutes.js";
import { authMiddleware } from "./middleware/auth.js";
import { statsRouter } from "./routes/statsRoutes.js";
import { historyRouter } from "./routes/historyRoutes.js";
import { practiceRouter } from "./routes/practiceRoutes.js";
import { reviewRouter } from "./routes/reviewRoutes.js";
import { secondOpinionRouter } from "./routes/secondOpinionRoutes.js";
import { exportRouter } from "./routes/exportRoutes.js";
import { adminRouter } from "./routes/adminRoutes.js";
import { initUserSettingsTable } from "./db/userSettings.js";
import { migrateAiEvaluationsRemoveUnique } from "./db/database.js";
import { startBackupScheduler } from "./services/backup.js";

const app = express();
const PORT = process.env.PORT ?? 8031;

// Trust proxy — needed behind nginx/Caddy/Traefik for express-rate-limit
if (process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
  console.log("[server] trust proxy aktiviert (Reverse-Proxy-Modus)");
}

// CORS
const rawOrigins = process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? "";
const allowedOrigins = new Set<string>(
  rawOrigins
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .concat(["http://localhost:8030", "http://localhost:5173", "http://localhost:3000"]),
);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin)) return cb(null, true);
      cb(new Error(`CORS: Origin nicht erlaubt: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(process.cwd(), "data", "uploads")));

// ─── Public routes ────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});
app.use("/api/auth", authRouter);

// ─── Protected routes (require valid JWT) ────────────────────────────────────
app.use("/api/exams",    authMiddleware, poolRouter);
app.use("/api/sessions", authMiddleware, sessionRouter);
app.use("/api/sessions", authMiddleware, evaluationRouter);
app.use("/api/sessions", authMiddleware, historyRouter);
app.use("/api/sessions", authMiddleware, secondOpinionRouter);
app.use("/api/settings", authMiddleware, settingsRouter);
app.use("/api/stats",    authMiddleware, statsRouter);
app.use("/api/practice", authMiddleware, practiceRouter);
app.use("/api/review",   authMiddleware, reviewRouter);
app.use("/api/export",   authMiddleware, exportRouter);
app.use("/api/admin",    authMiddleware, adminRouter);

// ─── Init ─────────────────────────────────────────────────────────────────────
initDatabase();
initSettingsTable();
initAuthTable();
initUserSettingsTable();
migrateAiEvaluationsRemoveUnique();
startBackupScheduler(24);

app.listen(PORT, () => {
  console.log(`✅ AP2 Trainer Backend läuft auf http://localhost:${PORT}`);
  console.log(`   Erlaubte Origins: ${[...allowedOrigins].join(", ")}`);
  console.log(
    `   AI Provider Keys: OpenAI=${process.env.OPENAI_API_KEY ? "✓" : "–"} Anthropic=${process.env.ANTHROPIC_API_KEY ? "✓" : "–"} Google=${process.env.GOOGLE_API_KEY ? "✓" : "–"} Mistral=${process.env.MISTRAL_API_KEY ? "✓" : "–"}`,
  );
  if (!process.env.JWT_SECRET) {
    console.warn("⚠️  JWT_SECRET nicht gesetzt! Bitte in .env hinterlegen.");
  }
});
