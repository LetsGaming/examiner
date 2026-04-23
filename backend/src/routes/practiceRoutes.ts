/**
 * practiceRoutes.ts — Targeted practice mode.
 *
 * POST /api/practice/start  — Create a practice session with 1–10 targeted tasks
 *
 * ## Pool fallback
 *
 *   If fewer tasks than requested exist in the pool (filtered by part,
 *   specialty, optional topic, optional taskKind), new tasks are generated on
 *   demand. Both the user's API key and the server-side fallback key are tried,
 *   mirroring the behaviour of the main exam start route.
 *
 * ## Incomplete sessions
 *
 *   Practice sessions that are never submitted are not worth cluttering the
 *   history with. The session is only persisted once we have at least one task
 *   to show. The caller navigates to /session/:id immediately; if the user
 *   abandons the browser tab the session remains in_progress but the history
 *   view filters those out (status='practice' is set at creation time so the
 *   history query can exclude status='in_progress' practice sessions trivially).
 */
import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { getUserId, insertTasksIntoDB } from './routeHelpers.js';
import { resolveAiConfig, resolveServerAiConfig } from './settingsRoutes.js';
import { generateTasksForPool } from '../services/examGenerator.js';
import type { ExamPart, Specialty } from '../types/index.js';
import type { TaskKind } from '../services/taskKind.js';

export const practiceRouter = Router();

// ─── Migration ────────────────────────────────────────────────────────────────

export function migratePracticeStatus(): void {
  try {
    db.pragma('foreign_keys = OFF');
    db.prepare(
      `INSERT INTO exam_sessions (id, user_id, part, title, duration_minutes, max_points, status)
       VALUES ('_probe_practice', 'local-user', 'teil_1', 'probe', 0, 0, 'practice')`,
    ).run();
    db.prepare(`DELETE FROM exam_sessions WHERE id = '_probe_practice'`).run();
    db.pragma('foreign_keys = ON');
  } catch {
    db.pragma('foreign_keys = ON');
    // Rebuild required — CHECK constraint doesn't include 'practice' yet.
    db.transaction(() => {
      db.exec(`DROP TABLE IF EXISTS exam_sessions_new`);
      db.exec(`
        CREATE TABLE exam_sessions_new (
          id                   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          part                 TEXT NOT NULL CHECK(part IN ('teil_1','teil_2','teil_3')),
          title                TEXT NOT NULL,
          scenario_name        TEXT,
          scenario_description TEXT,
          duration_minutes     INTEGER NOT NULL,
          max_points           INTEGER NOT NULL,
          started_at           TEXT DEFAULT (datetime('now')),
          submitted_at         TEXT,
          status               TEXT NOT NULL DEFAULT 'in_progress'
                                 CHECK(status IN ('in_progress','submitted','graded','practice','review')),
          total_score          INTEGER,
          ihk_grade            TEXT,
          specialty            TEXT NOT NULL DEFAULT 'fiae',
          is_review            INTEGER NOT NULL DEFAULT 0
        )
      `);
      db.exec(`
        INSERT INTO exam_sessions_new
          SELECT id, user_id, part, title, scenario_name, scenario_description,
                 duration_minutes, max_points, started_at, submitted_at, status,
                 total_score, ihk_grade,
                 COALESCE(specialty, 'fiae'),
                 0
          FROM exam_sessions
      `);
      db.exec(`DROP TABLE exam_sessions`);
      db.exec(`ALTER TABLE exam_sessions_new RENAME TO exam_sessions`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_user_status ON exam_sessions(user_id, status)`);
    })();
    console.log('[migration] exam_sessions CHECK constraint extended to include practice/review.');
  }

  // Ensure is_review column exists (idempotent).
  try {
    db.exec('ALTER TABLE exam_sessions ADD COLUMN is_review INTEGER NOT NULL DEFAULT 0');
  } catch { /* already present */ }
}

// ─── Task queries ─────────────────────────────────────────────────────────────

interface TaskQueryOptions {
  part: ExamPart;
  specialty: Specialty;
  taskKind?: TaskKind;
  topic?: string;
  excludeIds: string[];
}

function buildTaskQuery({ part, specialty, taskKind, topic, excludeIds }: TaskQueryOptions): {
  sql: string;
  params: unknown[];
} {
  const excluded = excludeIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',') || "''";
  const clauses: string[] = [
    `part = ?`,
    `specialty = ?`,
    `id NOT IN (${excluded})`,
  ];
  const params: unknown[] = [part, specialty];

  if (taskKind) {
    clauses.push(`task_kind = ?`);
    params.push(taskKind);
  }
  if (topic) {
    clauses.push(`topic_area = ?`);
    params.push(topic);
  }

  return {
    sql: `SELECT * FROM tasks WHERE ${clauses.join(' AND ')} ORDER BY times_used ASC, RANDOM() LIMIT 1`,
    params,
  };
}

function fetchTasks(options: TaskQueryOptions, count: number): Record<string, unknown>[] {
  const tasks: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const { sql, params } = buildTaskQuery({ ...options, excludeIds: tasks.map((t) => t.id as string) });
    const task = db.prepare(sql).get(...params) as Record<string, unknown> | undefined;
    if (task) tasks.push(task);
  }
  return tasks;
}

// ─── POST /api/practice/start ─────────────────────────────────────────────────

practiceRouter.post('/start', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const {
    part,
    topic,
    taskKind,
    count = 3,
    specialty = 'fiae',
  } = req.body as {
    part?: ExamPart;
    topic?: string;
    taskKind?: TaskKind;
    count?: number;
    specialty?: Specialty;
  };

  if (!part) {
    return res.status(400).json({ success: false, error: 'part ist erforderlich.' });
  }

  const n = Math.min(Math.max(1, Number(count)), 10);
  const queryOptions: TaskQueryOptions = { part, specialty, taskKind, topic, excludeIds: [] };

  let tasks = fetchTasks(queryOptions, n);

  // Pool too small — attempt on-demand generation.
  if (tasks.length < n) {
    const aiConfig = resolveAiConfig(userId);
    if (aiConfig) {
      const serverConfig = aiConfig.source === 'user' ? resolveServerAiConfig() : null;
      try {
        const generated = await generateTasksForPool(
          part, 6,
          aiConfig.apiKey, aiConfig.meta,
          serverConfig?.apiKey ?? null,
          serverConfig?.meta ?? null,
          specialty,
        );
        await insertTasksIntoDB(part, generated.tasks, specialty);
        // Retry with the newly inserted tasks.
        tasks = fetchTasks(queryOptions, n);
      } catch {
        // Continue with whatever tasks we have — partial session is better than none.
      }
    }
  }

  if (tasks.length === 0) {
    return res.status(422).json({
      success: false,
      error: 'Kein Pool verfügbar. Bitte erst Aufgaben generieren.',
    });
  }

  // Persist session.
  const totalPoints = tasks.reduce((s, t) => s + (t.points_value as number), 0);
  const ins = db
    .prepare(
      `INSERT INTO exam_sessions (user_id, part, specialty, title, duration_minutes, max_points, status)
       VALUES (?, ?, ?, ?, 0, ?, 'practice')`,
    )
    .run(userId, part, specialty, `Übungssession ${new Date().toLocaleDateString('de-DE')}`, totalPoints);

  const session = db
    .prepare('SELECT id FROM exam_sessions WHERE rowid = ?')
    .get(ins.lastInsertRowid) as { id: string };

  tasks.forEach((task, pos) => {
    db.prepare(
      'INSERT INTO session_tasks (session_id, task_id, position) VALUES (?, ?, ?)',
    ).run(session.id, task.id as string, pos);
    db.prepare('UPDATE tasks SET times_used = times_used + 1 WHERE id = ?').run(task.id as string);
  });

  res.status(201).json({ success: true, data: { sessionId: session.id } });
});
