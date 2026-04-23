/**
 * routeHelpers.ts — Shared utilities used across all route modules.
 *
 * Exports: auth helpers, rate limiters, file upload config, DB insertion
 * helpers, pool management, and concurrency utilities.
 */
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import type { Specialty, ExamPart } from '../types/index.js';
import type { Statement } from 'better-sqlite3';
import { db, classifyTaskFromSubtasks, REQUIRED_TASKS, GENERATE_COUNT } from '../db/database.js';
import type { TaskKind } from '../db/database.js';
import { generateTasksForPool } from '../services/examGenerator.js';
import type { ProviderMeta } from './settingsRoutes.js';
import { pickTopicsByKinds } from '../services/topics.js';
import { examStartMutex, poolGenerationMutex } from '../utils/concurrency.js';

// ─── Re-export concurrency primitives used by poolRoutes / practiceRoutes ─────
export { examStartMutex, poolGenerationMutex };

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function getUserId(req: Request): string {
  return (req as AuthRequest).userId;
}

// ─── Rate limiters ────────────────────────────────────────────────────────────

export const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Zu viele Generierungsanfragen. Bitte warte eine Stunde.' },
});

export const evaluateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthRequest).userId ?? 'anon',
  message: { success: false, error: 'Zu viele Bewertungsanfragen. Bitte warte eine Stunde.' },
});

// ─── Per-provider rate limiters (Feature 17) ──────────────────────────────────

const PROVIDER_LIMITS: Record<string, { max: number; windowMs: number }> = {
  openai: { max: 100, windowMs: 60_000 },
  anthropic: { max: 50, windowMs: 60_000 },
  google: { max: 200, windowMs: 60_000 },
  mistral: { max: 80, windowMs: 60_000 },
  default: { max: 100, windowMs: 60_000 },
};

const providerLimiters = new Map<string, ReturnType<typeof rateLimit>>();

export function providerRateLimit(provider: string): ReturnType<typeof rateLimit> {
  const key = provider.split('_')[0].toLowerCase();
  const limits = PROVIDER_LIMITS[key] ?? PROVIDER_LIMITS.default;

  if (!providerLimiters.has(key)) {
    providerLimiters.set(
      key,
      rateLimit({
        windowMs: limits.windowMs,
        max: limits.max,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => `${(req as AuthRequest).userId ?? 'anon'}::${key}`,
        message: {
          success: false,
          error: `Du hast ${limits.max} Anfragen pro ${limits.windowMs / 1000}s für ${key} erreicht.`,
        },
      }),
    );
  }
  return providerLimiters.get(key)!;
}

// ─── File upload ──────────────────────────────────────────────────────────────

export const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

// ─── Task insertion ───────────────────────────────────────────────────────────

type GeneratedTask = Awaited<ReturnType<typeof generateTasksForPool>>['tasks'][0];

// Statements are prepared lazily on first call so that module import does NOT
// touch the DB before initDatabase() has run in server.ts.
let _insertTaskStmt: Statement | null = null;
let _insertSubtaskStmt: Statement | null = null;

function getInsertTaskStmt(): Statement {
  if (!_insertTaskStmt) {
    _insertTaskStmt = db.prepare(`
      INSERT INTO tasks
        (id, part, specialty, topic_area, points_value, difficulty, task_kind,
         scenario_context, scenario_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, null, null)
    `);
  }
  return _insertTaskStmt;
}

function getInsertSubtaskStmt(): Statement {
  if (!_insertSubtaskStmt) {
    _insertSubtaskStmt = db.prepare(`
      INSERT INTO subtasks
        (id, task_id, label, task_type, question_text, expected_answer, points,
         diagram_type, expected_elements, mc_options, table_config, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }
  return _insertSubtaskStmt;
}

export async function insertTasksIntoDB(
  part: string,
  tasks: GeneratedTask[],
  specialty: Specialty = 'fiae',
): Promise<void> {
  db.transaction(() => {
    for (const task of tasks) {
      const taskId = randomUUID().replace(/-/g, '');
      const kind = classifyTaskFromSubtasks(
        task.subtasks.map((s) => ({
          task_type: s.taskType,
          question_text: s.questionText,
          expected_answer: JSON.stringify(s.expectedAnswer ?? {}),
        })),
      );

      getInsertTaskStmt().run(
        taskId,
        part,
        specialty,
        task.topicArea,
        task.pointsValue,
        task.difficulty ?? 'medium',
        kind,
      );

      for (let i = 0; i < task.subtasks.length; i++) {
        const st = task.subtasks[i];
        getInsertSubtaskStmt().run(
          randomUUID().replace(/-/g, ''),
          taskId,
          st.label,
          st.taskType,
          st.questionText,
          JSON.stringify(st.expectedAnswer ?? {}),
          st.points,
          st.diagramType ?? null,
          JSON.stringify(st.expectedElements ?? []),
          JSON.stringify(st.mcOptions ?? []),
          st.tableConfig ? JSON.stringify(st.tableConfig) : null,
          i,
        );
      }
    }
  })();
}

// ─── Pool kind targets ────────────────────────────────────────────────────────
//
// Minimum tasks per `task_kind` that should exist in the pool per part/specialty
// so that `assembleExam` can build varied exams. Kinds below target are filled
// first during generation before adding more generic 'text' tasks.

const POOL_KIND_TARGETS: Record<string, Partial<Record<TaskKind, number>>> = {
  teil_1: { diagram: 2, table: 2, calc: 1, text: 2 },
  teil_2: { sql: 2, code: 2, diagram: 1, calc: 1, text: 1 },
  teil_3: {}, // WiSo — no kind balance needed
};

export function findUnderrepresentedKinds(part: string, specialty: Specialty): TaskKind[] {
  const targets = POOL_KIND_TARGETS[part] ?? {};
  const rows = db
    .prepare(
      'SELECT task_kind, COUNT(*) as cnt FROM tasks WHERE part = ? AND specialty = ? GROUP BY task_kind',
    )
    .all(part, specialty) as { task_kind: string; cnt: number }[];

  const actual: Record<string, number> = Object.fromEntries(rows.map((r) => [r.task_kind, r.cnt]));

  return (Object.entries(targets) as [TaskKind, number][])
    .map(([kind, target]) => ({ kind, gap: target - (actual[kind] ?? 0) }))
    .filter(({ gap }) => gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .map(({ kind }) => kind);
}

// ─── Internal pool helpers ────────────────────────────────────────────────────

function countPoolTasks(part: string, specialty: Specialty): number {
  return (
    db
      .prepare('SELECT COUNT(*) as cnt FROM tasks WHERE part = ? AND specialty = ?')
      .get(part, specialty) as { cnt: number }
  ).cnt;
}

async function generateAndInsert(
  part: string,
  specialty: Specialty,
  count: number,
  apiKey: string,
  meta: ProviderMeta | undefined,
  serverApiKey: string | null,
  serverMeta: ProviderMeta | null,
  logPrefix: string,
): Promise<number> {
  const underrepresented = findUnderrepresentedKinds(part, specialty);
  const topics =
    underrepresented.length > 0
      ? pickTopicsByKinds(part as ExamPart, underrepresented, count, specialty)
      : undefined;

  const focus = topics ? ` (Fokus: ${underrepresented.join('/')})` : '';
  console.log(`${logPrefix}: generiere ${count} neue Tasks${focus}…`);

  const result = await generateTasksForPool(
    part as ExamPart,
    count,
    apiKey,
    meta,
    serverApiKey,
    serverMeta,
    specialty,
    topics,
  );
  await insertTasksIntoDB(part, result.tasks, specialty);

  if (result.warnings.length > 0) {
    console.warn(
      `${logPrefix}: ${result.warnings.length} Warnungen:`,
      result.warnings.map((w) => `[${w.source}] ${w.topic}`).join(', '),
    );
  }
  return result.tasks.length;
}

// ─── Pool size management (public API) ───────────────────────────────────────

export async function ensurePoolSize(
  part: string,
  apiKey: string,
  meta?: ProviderMeta,
  serverApiKey?: string | null,
  serverMeta?: ProviderMeta | null,
  specialty: Specialty = 'fiae',
): Promise<void> {
  const lockKey = `${part}:${specialty}`;

  if (poolGenerationMutex.isLocked(lockKey)) {
    await poolGenerationMutex.waitUntilFree(lockKey);
    return;
  }

  const current = countPoolTasks(part, specialty);
  const needed = REQUIRED_TASKS[part] ?? 4;
  if (current >= needed) return;

  if (!poolGenerationMutex.acquire(lockKey)) {
    await poolGenerationMutex.waitUntilFree(lockKey);
    return;
  }

  try {
    const count = GENERATE_COUNT[part] ?? 8;
    const added = await generateAndInsert(
      part,
      specialty,
      count,
      apiKey,
      meta,
      serverApiKey ?? null,
      serverMeta ?? null,
      `[pool] ${lockKey}: ${current} Tasks`,
    );
    console.log(`[pool] ${lockKey}: ${added} neue Tasks hinzugefügt`);
  } finally {
    poolGenerationMutex.release(lockKey);
  }
}

export async function refillPoolInBackground(
  part: string,
  apiKey: string,
  meta?: ProviderMeta | null,
  serverApiKey?: string | null,
  serverMeta?: ProviderMeta | null,
  specialty: Specialty = 'fiae',
): Promise<void> {
  const lockKey = `${part}:${specialty}`;
  if (poolGenerationMutex.isLocked(lockKey)) return;

  const current = countPoolTasks(part, specialty);
  const target = (REQUIRED_TASKS[part] ?? 4) * 3;
  if (current >= target) return;

  if (!poolGenerationMutex.acquire(lockKey)) return;

  try {
    const count = GENERATE_COUNT[part] ?? 8;
    const added = await generateAndInsert(
      part,
      specialty,
      count,
      apiKey,
      meta ?? undefined,
      serverApiKey ?? null,
      serverMeta ?? null,
      `[pool-refill] ${lockKey}: ${current}/${target}`,
    );
    console.log(`[pool-refill] ${lockKey}: +${added} Tasks, Pool jetzt ${current + added}`);
  } catch (err) {
    console.warn('[pool-refill] Fehler (ignoriert):', err);
  } finally {
    poolGenerationMutex.release(lockKey);
  }
}
