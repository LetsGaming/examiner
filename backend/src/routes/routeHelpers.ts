/**
 * routeHelpers.ts — shared utilities used across all route modules.
 *
 * Centralising getUserId, insertTasksIntoDB, upload config, and rate limiters
 * here prevents duplication across the split router files.
 */
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";
import rateLimit from "express-rate-limit";
import type { Request } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import type { Specialty, ExamPart } from "../types/index.js";
import { db } from "../db/database.js";
import { generateTasksForPool } from "../services/examGenerator.js";

// ─── Auth helper ──────────────────────────────────────────────────────────────

export function getUserId(req: Request): string {
  return (req as AuthRequest).userId;
}

// ─── Rate limiters ────────────────────────────────────────────────────────────

export const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Zu viele Generierungsanfragen. Bitte warte eine Stunde." },
});

export const evaluateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Zu viele Bewertungsanfragen. Bitte warte eine Stunde." },
});

// ─── File upload ──────────────────────────────────────────────────────────────

export const UPLOAD_DIR = path.resolve(process.cwd(), "data", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

// ─── Task insertion ───────────────────────────────────────────────────────────

type GeneratedTask = Awaited<ReturnType<typeof generateTasksForPool>>["tasks"][0];

export async function insertTasksIntoDB(
  part: string,
  tasks: GeneratedTask[],
  specialty: Specialty = "fiae",
): Promise<void> {
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, part, specialty, topic_area, points_value, difficulty, scenario_context, scenario_description)
    VALUES (?, ?, ?, ?, ?, ?, null, null)
  `);
  const insertSubtask = db.prepare(`
    INSERT INTO subtasks (id, task_id, label, task_type, question_text,
                          expected_answer, points, diagram_type,
                          expected_elements, mc_options, table_config, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const task of tasks) {
      const taskId = randomUUID().replace(/-/g, "");
      insertTask.run(taskId, part, specialty, task.topicArea, task.pointsValue, task.difficulty ?? "medium");
      for (let i = 0; i < task.subtasks.length; i++) {
        const st = task.subtasks[i];
        insertSubtask.run(
          randomUUID().replace(/-/g, ""),
          taskId, st.label, st.taskType, st.questionText,
          JSON.stringify(st.expectedAnswer ?? {}),
          st.points, st.diagramType ?? null,
          JSON.stringify(st.expectedElements ?? []),
          JSON.stringify(st.mcOptions ?? []),
          st.tableConfig ? JSON.stringify(st.tableConfig) : null,
          i,
        );
      }
    }
  })();
}

// ─── Concurrency locks (shared state) ────────────────────────────────────────

/** Set of `"part:specialty"` keys currently being generated — prevents double-generation. */
export const generatingParts = new Set<string>();

/**
 * Per-user start lock.
 *
 * Earlier revisions used a single global counter `activeStarts` with MAX=1, which
 * (a) leaked on any synchronous throw in the /start handler — the decrement sat
 * after the db.transaction call so a thrown constraint error permanently pinned
 * the counter at ≥1 and returned 429 forever, and (b) blocked all users globally
 * even when it worked, so only one student in the whole system could start an
 * exam at a time.
 *
 * The lock is now a Set of user IDs. A user who is already starting an exam gets
 * 429 for their second concurrent request; different users never block each
 * other. The `startingUsers` set is always cleaned up in a try/finally in the
 * handler, so a thrown error can't pin the lock.
 */
export const startingUsers = new Set<string>();

export function isUserStarting(userId: string): boolean {
  return startingUsers.has(userId);
}
export function lockUserStart(userId: string): void {
  startingUsers.add(userId);
}
export function unlockUserStart(userId: string): void {
  startingUsers.delete(userId);
}

// ─── Pool helpers ─────────────────────────────────────────────────────────────

import {
  REQUIRED_TASKS,
  GENERATE_COUNT,
} from "../db/database.js";
import type { ProviderMeta } from "./settingsRoutes.js";

export async function ensurePoolSize(
  part: string,
  apiKey: string,
  meta?: ProviderMeta,
  serverApiKey?: string | null,
  serverMeta?: ProviderMeta | null,
  specialty: Specialty = "fiae",
): Promise<void> {
  const lockKey = `${part}:${specialty}`;
  if (generatingParts.has(lockKey)) {
    const deadline = Date.now() + 120_000;
    while (generatingParts.has(lockKey) && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
    }
    return;
  }

  const current = (db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE part = ? AND specialty = ?").get(part, specialty) as { cnt: number }).cnt;
  const needed = REQUIRED_TASKS[part] ?? 4;
  const genCount = GENERATE_COUNT[part] ?? 8;
  if (current >= needed) return;

  generatingParts.add(lockKey);
  try {
    console.log(`[pool] ${lockKey}: ${current} Tasks — generiere ${genCount} neue...`);
    const genResult = await generateTasksForPool(part as ExamPart, genCount, apiKey, meta, serverApiKey, serverMeta, specialty);
    await insertTasksIntoDB(part, genResult.tasks, specialty);
    if (genResult.warnings.length > 0) {
      console.warn(`[pool] ${lockKey}: ${genResult.warnings.length} Warnungen:`, genResult.warnings.map((w) => `[${w.source}] ${w.topic}`).join(", "));
    }
    console.log(`[pool] ${lockKey}: ${genResult.tasks.length} neue Tasks hinzugefügt`);
  } finally {
    generatingParts.delete(lockKey);
  }
}

export async function refillPoolInBackground(
  part: string,
  apiKey: string,
  meta?: ProviderMeta | null,
  serverApiKey?: string | null,
  serverMeta?: ProviderMeta | null,
  specialty: Specialty = "fiae",
): Promise<void> {
  const lockKey = `${part}:${specialty}`;
  if (generatingParts.has(lockKey)) return;

  try {
    const current = (db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE part = ? AND specialty = ?").get(part, specialty) as { cnt: number }).cnt;
    const target = (REQUIRED_TASKS[part] ?? 4) * 3;
    const genCount = GENERATE_COUNT[part] ?? 8;
    if (current >= target) return;

    generatingParts.add(lockKey);
    console.log(`[pool-refill] ${lockKey}: ${current}/${target} — generiere ${genCount} Tasks im Hintergrund`);
    const refillResult = await generateTasksForPool(part as ExamPart, genCount, apiKey, meta ?? undefined, serverApiKey, serverMeta, specialty);
    await insertTasksIntoDB(part, refillResult.tasks, specialty);
    console.log(`[pool-refill] ${lockKey}: +${refillResult.tasks.length} Tasks${refillResult.warnings.length > 0 ? ` (${refillResult.warnings.length} Warnungen)` : ""}, Pool jetzt ${current + refillResult.tasks.length}`);
  } catch (err) {
    console.warn("[pool-refill] Fehler (ignoriert):", err);
  } finally {
    generatingParts.delete(lockKey);
  }
}
