/**
 * adminRoutes.ts — Vollständige Admin-API für Pool-Verwaltung.
 *
 * Alle Routen setzen is_admin=1 im JWT-User voraus (requireAdmin Middleware).
 *
 * POOL-ÜBERSICHT
 *   GET  /api/admin/pool-stats
 *   GET  /api/admin/pool/:part/:specialty          — Aufgabenliste (ohne Subtasks)
 *   GET  /api/admin/pool-health                    — Qualitätsanalyse des Pools
 *
 * AUFGABEN-DETAIL & EDIT
 *   GET    /api/admin/tasks/:id                    — Aufgabe + alle Subtasks
 *   PATCH  /api/admin/tasks/:id                    — Task-Metadaten editieren
 *   PATCH  /api/admin/tasks/:id/subtasks/:subId    — Einzelne Subtask editieren
 *   DELETE /api/admin/tasks/:id[?force=1]          — Löschen (force auch wenn in Sessions)
 *
 * GENERIERUNG
 *   POST /api/admin/generate                       — Aufgaben direkt generieren
 *
 * BENUTZER-VERWALTUNG
 *   GET   /api/admin/users
 *   PATCH /api/admin/users/:id/admin
 *
 * WARTUNG
 *   POST /api/admin/reclassify
 *   POST /api/admin/backup
 *   GET  /api/admin/backup
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { reclassifyExistingTasks } from '../db/database.js';
import { getUserId } from './routeHelpers.js';
import { createBackup, listBackups } from '../services/backup.js';
import { generateTasksForPool } from '../services/examGenerator.js';
import { resolveAiConfig } from './settingsRoutes.js';
import type { ExamPart, Specialty } from '../types/index.js';

export const adminRouter = Router();

// ─── Migrations ──────────────────────────────────────────────────────────────

export function initAdminMigrations(): void {
  try {
    db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
  } catch {
    /**/
  }
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN source TEXT DEFAULT 'user_ai'");
  } catch {
    /**/
  }
  try {
    db.exec('ALTER TABLE tasks ADD COLUMN admin_note TEXT DEFAULT NULL');
  } catch {
    /**/
  }
}

// ─── requireAdmin Middleware ──────────────────────────────────────────────────

export function requireAdmin(req: Request, res: Response, next: () => void): void {
  const userId = getUserId(req);
  const user = db.prepare(`SELECT is_admin FROM users WHERE id = ?`).get(userId) as
    | { is_admin: number }
    | undefined;
  if (!user?.is_admin) {
    res.status(403).json({ success: false, error: 'Kein Admin-Zugriff.' });
    return;
  }
  next();
}

adminRouter.use(requireAdmin as any);

// ─── GET /api/admin/pool-stats ────────────────────────────────────────────────

adminRouter.get('/pool-stats', (_req: Request, res: Response) => {
  const parts = ['teil_1', 'teil_2', 'teil_3'];
  const partStats = parts.map((part) => {
    const total = (
      db.prepare(`SELECT COUNT(*) as n FROM tasks WHERE part = ?`).get(part) as { n: number }
    ).n;
    const kindDist = db
      .prepare(
        `SELECT task_kind, COUNT(*) as n FROM tasks WHERE part = ? GROUP BY task_kind ORDER BY n DESC`,
      )
      .all(part) as { task_kind: string; n: number }[];
    const diffDist = db
      .prepare(`SELECT difficulty, COUNT(*) as n FROM tasks WHERE part = ? GROUP BY difficulty`)
      .all(part) as { difficulty: string; n: number }[];
    const mostUsed = db
      .prepare(
        `SELECT id, topic_area, task_kind, times_used FROM tasks WHERE part = ? ORDER BY times_used DESC LIMIT 5`,
      )
      .all(part) as Record<string, unknown>[];
    const neverUsed = (
      db.prepare(`SELECT COUNT(*) as n FROM tasks WHERE part = ? AND times_used = 0`).get(part) as {
        n: number;
      }
    ).n;
    const newest = db
      .prepare(
        `SELECT id, topic_area, task_kind, created_at, source FROM tasks WHERE part = ? ORDER BY created_at DESC LIMIT 3`,
      )
      .all(part) as Record<string, unknown>[];
    return {
      part,
      total,
      kindDistribution: kindDist,
      difficultyDistribution: diffDist,
      mostUsedTasks: mostUsed,
      neverUsedCount: neverUsed,
      newestTasks: newest,
    };
  });
  const totalTasks = (db.prepare(`SELECT COUNT(*) as n FROM tasks`).get() as { n: number }).n;
  const totalSessions = (
    db.prepare(`SELECT COUNT(*) as n FROM exam_sessions`).get() as { n: number }
  ).n;
  const totalUsers = (db.prepare(`SELECT COUNT(*) as n FROM users`).get() as { n: number }).n;
  res.json({
    success: true,
    data: {
      parts: partStats,
      totals: { tasks: totalTasks, sessions: totalSessions, users: totalUsers },
    },
  });
});

// ─── GET /api/admin/pool/:part/:specialty ─────────────────────────────────────

adminRouter.get('/pool/:part/:specialty', (req: Request, res: Response) => {
  const { part, specialty } = req.params;
  const { search, kind, difficulty, sort } = req.query as Record<string, string>;

  let query = `
    SELECT t.id, t.topic_area, t.task_kind, t.points_value, t.difficulty,
           t.times_used, t.created_at, t.source, t.admin_note,
           COUNT(s.id) as subtask_count
    FROM tasks t LEFT JOIN subtasks s ON s.task_id = t.id
    WHERE t.part = ? AND t.specialty = ?
  `;
  const params: unknown[] = [part, specialty];

  if (search) {
    query += ` AND (t.topic_area LIKE ? OR t.admin_note LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  if (kind) {
    query += ` AND t.task_kind = ?`;
    params.push(kind);
  }
  if (difficulty) {
    query += ` AND t.difficulty = ?`;
    params.push(difficulty);
  }

  query += ` GROUP BY t.id`;
  const orderMap: Record<string, string> = {
    newest: 't.created_at DESC',
    oldest: 't.created_at ASC',
    most_used: 't.times_used DESC',
    least_used: 't.times_used ASC',
    topic: 't.topic_area ASC',
  };
  query += ` ORDER BY ${orderMap[sort] ?? 't.created_at DESC'}`;

  res.json({ success: true, data: db.prepare(query).all(...params) });
});

// ─── GET /api/admin/tasks/:id ─────────────────────────────────────────────────

adminRouter.get('/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const task = db
    .prepare(
      `SELECT id, part, specialty, topic_area, task_kind, points_value, difficulty, times_used, created_at, source, admin_note FROM tasks WHERE id = ?`,
    )
    .get(id) as Record<string, unknown> | undefined;
  if (!task) return res.status(404).json({ success: false, error: 'Aufgabe nicht gefunden.' });

  const subtasks = db
    .prepare(
      `SELECT id, label, task_type, question_text, expected_answer, points, diagram_type, expected_elements, mc_options, table_config, position FROM subtasks WHERE task_id = ? ORDER BY position ASC`,
    )
    .all(id) as Record<string, unknown>[];

  const parsed = subtasks.map((s) => ({
    ...s,
    expected_answer: safeParseJson(s.expected_answer as string),
    mc_options: safeParseJson(s.mc_options as string, []),
    expected_elements: safeParseJson(s.expected_elements as string, []),
    table_config: safeParseJson(s.table_config as string),
  }));

  const usageHistory = db
    .prepare(
      `SELECT es.title, es.started_at, es.status, es.ihk_grade FROM session_tasks st JOIN exam_sessions es ON es.id = st.session_id WHERE st.task_id = ? ORDER BY es.started_at DESC LIMIT 10`,
    )
    .all(id) as Record<string, unknown>[];

  res.json({ success: true, data: { ...task, subtasks: parsed, usageHistory } });
});

// ─── PATCH /api/admin/tasks/:id ───────────────────────────────────────────────

adminRouter.patch('/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { topic_area, difficulty, admin_note } = req.body as Record<string, string>;
  const updates: string[] = [];
  const params: unknown[] = [];

  if (topic_area !== undefined) {
    updates.push('topic_area = ?');
    params.push(topic_area.trim());
  }
  if (difficulty !== undefined) {
    if (!['easy', 'medium', 'hard'].includes(difficulty))
      return res.status(400).json({ success: false, error: 'difficulty: easy/medium/hard' });
    updates.push('difficulty = ?');
    params.push(difficulty);
  }
  if (admin_note !== undefined) {
    updates.push('admin_note = ?');
    params.push(admin_note.trim() || null);
  }
  if (updates.length === 0)
    return res.status(400).json({ success: false, error: 'Keine Felder zum Bearbeiten.' });

  params.push(id);
  const r = db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  if (r.changes === 0)
    return res.status(404).json({ success: false, error: 'Aufgabe nicht gefunden.' });
  res.json({ success: true });
});

// ─── PATCH /api/admin/tasks/:id/subtasks/:subId ───────────────────────────────

adminRouter.patch('/tasks/:id/subtasks/:subId', (req: Request, res: Response) => {
  const { id, subId } = req.params;
  const {
    question_text,
    expected_answer,
    points,
    task_type,
    mc_options,
    diagram_type,
    expected_elements,
    table_config,
  } = req.body as Record<string, unknown>;

  if (!db.prepare(`SELECT id FROM subtasks WHERE id = ? AND task_id = ?`).get(subId, id))
    return res.status(404).json({ success: false, error: 'Subtask nicht gefunden.' });

  const updates: string[] = [];
  const params: unknown[] = [];

  // ── Text / Basis-Felder ───────────────────────────────────────────────────
  if (question_text !== undefined) {
    updates.push('question_text = ?');
    params.push(String(question_text).trim());
  }
  if (expected_answer !== undefined) {
    // Frontend darf sowohl ein Objekt als auch einen JSON-String schicken;
    // in der DB liegt immer ein String.
    const s =
      typeof expected_answer === 'string' ? expected_answer : JSON.stringify(expected_answer);
    updates.push('expected_answer = ?');
    params.push(s);
  }
  if (points !== undefined) {
    const p = Number(points);
    if (!Number.isInteger(p) || p < 1 || p > 50)
      return res.status(400).json({ success: false, error: 'Punkte: 1–50' });
    updates.push('points = ?');
    params.push(p);
  }

  // ── Typ-Wechsel ───────────────────────────────────────────────────────────
  // Wir validieren gegen die gleiche Liste wie in types/index.ts (MD §5.1).
  // Wenn der Typ wechselt, müssen abhängige Felder (mc_options, diagram_type,
  // table_config) konsistent sein — das erzwingen wir nicht hier, das Frontend
  // muss die Felder im gleichen PATCH mitschicken.
  if (task_type !== undefined) {
    const validTypes = [
      'freitext',
      'pseudocode',
      'sql',
      'mc',
      'mc_multi',
      'plantuml',
      'diagram_upload',
      'table',
    ];
    if (!validTypes.includes(String(task_type))) {
      return res.status(400).json({ success: false, error: `Ungültiger task_type: ${task_type}` });
    }
    updates.push('task_type = ?');
    params.push(String(task_type));
  }

  // ── MC-Options (nur relevant bei task_type='mc'/'mc_multi') ───────────────
  if (mc_options !== undefined) {
    // null oder [] löscht die Optionen, ansonsten muss es ein Array von
    // { id, text, correct? } sein.
    if (mc_options !== null && !Array.isArray(mc_options)) {
      return res.status(400).json({ success: false, error: 'mc_options muss Array sein.' });
    }
    updates.push('mc_options = ?');
    params.push(JSON.stringify(mc_options ?? []));
  }

  // ── Diagramm-Typ ──────────────────────────────────────────────────────────
  if (diagram_type !== undefined) {
    if (diagram_type !== null && typeof diagram_type !== 'string') {
      return res.status(400).json({ success: false, error: 'diagram_type muss String sein.' });
    }
    updates.push('diagram_type = ?');
    params.push(diagram_type);
  }

  // ── Erwartete Elemente (Diagramm) ─────────────────────────────────────────
  if (expected_elements !== undefined) {
    if (expected_elements !== null && !Array.isArray(expected_elements)) {
      return res
        .status(400)
        .json({ success: false, error: 'expected_elements muss Array sein.' });
    }
    updates.push('expected_elements = ?');
    params.push(JSON.stringify(expected_elements ?? []));
  }

  // ── Tabellen-Config (nur relevant bei task_type='table') ──────────────────
  if (table_config !== undefined) {
    if (table_config !== null && typeof table_config !== 'object') {
      return res.status(400).json({ success: false, error: 'table_config muss Objekt sein.' });
    }
    updates.push('table_config = ?');
    params.push(table_config === null ? null : JSON.stringify(table_config));
  }

  if (updates.length === 0) return res.status(400).json({ success: false, error: 'Keine Felder.' });

  params.push(subId);
  db.prepare(`UPDATE subtasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  // Punkte-Summe in tasks synchron halten
  if (points !== undefined) {
    const sum = (
      db.prepare(`SELECT SUM(points) as total FROM subtasks WHERE task_id = ?`).get(id) as {
        total: number;
      }
    ).total;
    db.prepare(`UPDATE tasks SET points_value = ? WHERE id = ?`).run(sum, id);
  }
  res.json({ success: true });
});

// ─── DELETE /api/admin/tasks/:id ─────────────────────────────────────────────

adminRouter.delete('/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const force = req.query.force === '1' || req.query.force === 'true';

  const inUse = (
    db.prepare(`SELECT COUNT(*) as n FROM session_tasks WHERE task_id = ?`).get(id) as { n: number }
  ).n;
  if (inUse > 0 && !force) {
    return res.status(409).json({
      success: false,
      error: `Aufgabe in ${inUse} Session(s) referenziert.`,
      hint: 'Mit ?force=1 trotzdem löschen.',
      sessionCount: inUse,
    });
  }
  if (force && inUse > 0) db.prepare(`DELETE FROM session_tasks WHERE task_id = ?`).run(id);

  const r = db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
  if (r.changes === 0)
    return res.status(404).json({ success: false, error: 'Aufgabe nicht gefunden.' });
  res.json({ success: true, deletedFromSessions: force ? inUse : 0 });
});

// ─── POST /api/admin/generate ─────────────────────────────────────────────────

adminRouter.post('/generate', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { part, specialty, count, topic } = req.body as Record<string, unknown>;

  if (!part || !['teil_1', 'teil_2', 'teil_3'].includes(part as string))
    return res.status(400).json({ success: false, error: 'part: teil_1/teil_2/teil_3' });

  const spec = (specialty ?? 'fiae') as string;
  if (!['fiae', 'fisi'].includes(spec))
    return res.status(400).json({ success: false, error: 'specialty: fiae/fisi' });

  const aiConfig = resolveAiConfig(userId);
  if (!aiConfig)
    return res.status(500).json({ success: false, error: 'Kein API-Key konfiguriert.' });

  const n = Math.min(Math.max(Number(count) || 1, 1), 8);
  const topics = topic ? [String(topic)] : undefined;

  try {
    const result = await generateTasksForPool(
      part as ExamPart,
      n,
      aiConfig.apiKey,
      aiConfig.meta,
      undefined,
      undefined,
      spec as Specialty,
      topics,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[admin/generate]', err);
    res
      .status(500)
      .json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ─── GET /api/admin/pool-health ───────────────────────────────────────────────

adminRouter.get('/pool-health', (_req: Request, res: Response) => {
  const issues: { severity: 'error' | 'warning' | 'info'; message: string; detail?: unknown }[] =
    [];
  const MIN = 12;

  for (const part of ['teil_1', 'teil_2', 'teil_3']) {
    const total = (
      db.prepare(`SELECT COUNT(*) as n FROM tasks WHERE part = ?`).get(part) as { n: number }
    ).n;
    if (total < MIN)
      issues.push({
        severity: 'error',
        message: `${part}: Nur ${total} Aufgaben (Minimum: ${MIN}).`,
        detail: { part, count: total },
      });

    const over = db
      .prepare(
        `SELECT topic_area, COUNT(*) as n FROM tasks WHERE part = ? GROUP BY topic_area HAVING n > 3 ORDER BY n DESC`,
      )
      .all(part) as { topic_area: string; n: number }[];
    for (const r of over)
      issues.push({
        severity: 'warning',
        message: `${part}: "${r.topic_area}" ${r.n}× — mögliche Duplikate.`,
        detail: r,
      });

    const neverUsed = (
      db.prepare(`SELECT COUNT(*) as n FROM tasks WHERE part = ? AND times_used = 0`).get(part) as {
        n: number;
      }
    ).n;
    if (total > 0 && neverUsed / total > 0.5)
      issues.push({
        severity: 'info',
        message: `${part}: ${neverUsed}/${total} Aufgaben noch nie verwendet (${Math.round((neverUsed / total) * 100)}%).`,
        detail: { part, neverUsed },
      });

    if (part !== 'teil_3') {
      const kinds = (
        db.prepare(`SELECT task_kind FROM tasks WHERE part = ? GROUP BY task_kind`).all(part) as {
          task_kind: string;
        }[]
      ).map((r) => r.task_kind);
      const required =
        part === 'teil_1' ? ['diagram', 'table', 'text'] : ['sql', 'code', 'diagram'];
      for (const k of required)
        if (!kinds.includes(k))
          issues.push({
            severity: 'error',
            message: `${part}: Kein task_kind="${k}" — Prüfungen können unausgewogen sein.`,
            detail: { part, missingKind: k },
          });
    }
  }

  const score = Math.max(
    0,
    100 -
      issues.filter((i) => i.severity === 'error').length * 15 -
      issues.filter((i) => i.severity === 'warning').length * 5 -
      issues.filter((i) => i.severity === 'info').length * 2,
  );

  res.json({ success: true, data: { score, issues } });
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

adminRouter.get('/users', (_req: Request, res: Response) => {
  const users = db
    .prepare(
      `SELECT u.id, u.email, u.is_admin, u.created_at, COUNT(DISTINCT es.id) as session_count FROM users u LEFT JOIN exam_sessions es ON es.user_id = u.id GROUP BY u.id ORDER BY u.created_at DESC`,
    )
    .all() as Record<string, unknown>[];
  res.json({ success: true, data: users });
});

// ─── PATCH /api/admin/users/:id/admin ─────────────────────────────────────────

adminRouter.patch('/users/:id/admin', (req: Request, res: Response) => {
  const requesterId = getUserId(req);
  const { id } = req.params;
  if (id === requesterId)
    return res
      .status(400)
      .json({ success: false, error: 'Eigenen Admin-Status kann man nicht ändern.' });

  const r = db
    .prepare(`UPDATE users SET is_admin = ? WHERE id = ?`)
    .run((req.body as { is_admin: boolean }).is_admin ? 1 : 0, id);
  if (r.changes === 0)
    return res.status(404).json({ success: false, error: 'User nicht gefunden.' });
  res.json({ success: true });
});

// ─── POST /api/admin/reclassify ───────────────────────────────────────────────

adminRouter.post('/reclassify', (_req: Request, res: Response) => {
  try {
    reclassifyExistingTasks();
    res.json({ success: true, message: 'Reklassifizierung abgeschlossen.' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── POST/GET /api/admin/backup ───────────────────────────────────────────────

adminRouter.post('/backup', async (_req: Request, res: Response) => {
  try {
    const dest = await createBackup();
    res.json({ success: true, data: { path: dest } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

adminRouter.get('/backup', (_req: Request, res: Response) => {
  res.json({ success: true, data: listBackups() });
});

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function safeParseJson(raw: string | null | undefined, fallback: unknown = null): unknown {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
