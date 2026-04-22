/**
 * reviewRoutes.ts — Wiederholungs-Queue (Spaced Repetition).
 *
 * GET  /api/review/due        — Anzahl + Liste heute fälliger Reviews
 * POST /api/review/start      — Practice-Session aus fälligen Subtasks starten
 * POST /api/review/:id/skip   — Eintrag aus Queue entfernen
 */

import { Router, Request, Response } from "express";
import { db } from "../db/database.js";
import { getUserId } from "./routeHelpers.js";
import { defaultReviewEntry } from "../services/spacedRepetition.js";

export const reviewRouter = Router();

// ─── Migration: review_queue Tabelle ─────────────────────────────────────────
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS review_queue (
      id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subtask_id     TEXT NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
      due_at         TEXT NOT NULL,
      interval_days  INTEGER NOT NULL DEFAULT 1,
      ease           REAL NOT NULL DEFAULT 2.5,
      repetitions    INTEGER NOT NULL DEFAULT 0,
      last_score     REAL,
      created_at     TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_review_user_due ON review_queue(user_id, due_at);
  `);
} catch { /* bereits vorhanden */ }

// ─── GET /api/review/due ──────────────────────────────────────────────────────

reviewRouter.get("/due", (req: Request, res: Response) => {
  const userId = getUserId(req);
  const today = new Date().toISOString().substring(0, 10);

  const rows = db
    .prepare(
      `SELECT rq.id, rq.subtask_id, rq.due_at, rq.interval_days, rq.ease, rq.repetitions, rq.last_score,
              s.label, s.task_type, s.question_text, s.points,
              t.topic_area, t.part
       FROM review_queue rq
       JOIN subtasks s ON s.id = rq.subtask_id
       JOIN tasks t ON t.id = s.task_id
       WHERE rq.user_id = ? AND rq.due_at <= ?
       ORDER BY rq.due_at ASC
       LIMIT 20`,
    )
    .all(userId, today) as Record<string, unknown>[];

  res.json({
    success: true,
    data: {
      count: rows.length,
      items: rows.map((r) => ({
        id: r.id,
        subtaskId: r.subtask_id,
        dueAt: r.due_at,
        intervalDays: r.interval_days,
        lastScore: r.last_score,
        subtask: {
          label: r.label,
          taskType: r.task_type,
          questionText: r.question_text,
          points: r.points,
          topicArea: r.topic_area,
          part: r.part,
        },
      })),
    },
  });
});

// ─── POST /api/review/start ───────────────────────────────────────────────────

reviewRouter.post("/start", (req: Request, res: Response) => {
  const userId = getUserId(req);
  const today = new Date().toISOString().substring(0, 10);
  const count = Math.min(Math.max(1, Number(req.body?.count ?? 5)), 10);

  const due = db
    .prepare(
      `SELECT rq.subtask_id, t.id as task_id, t.part, t.specialty
       FROM review_queue rq
       JOIN subtasks s ON s.id = rq.subtask_id
       JOIN tasks t ON t.id = s.task_id
       WHERE rq.user_id = ? AND rq.due_at <= ?
       ORDER BY rq.due_at ASC LIMIT ?`,
    )
    .all(userId, today, count) as { subtask_id: string; task_id: string; part: string; specialty: string }[];

  if (due.length === 0) {
    return res.status(422).json({ success: false, error: "Keine fälligen Wiederholungen." });
  }

  // Deduplizierte Task-IDs
  const uniqueTasks = [...new Map(due.map((d) => [d.task_id, d])).values()];
  const firstTask = uniqueTasks[0];

  // Practice-Session erstellen
  const totalPoints = uniqueTasks.reduce((s, t) => {
    const pts = db.prepare(`SELECT COALESCE(SUM(points), 0) as p FROM subtasks WHERE task_id = ?`).get(t.task_id) as { p: number };
    return s + pts.p;
  }, 0);

  const ins = db.prepare(
    `INSERT INTO exam_sessions (user_id, part, specialty, title, duration_minutes, max_points, status, is_review)
     VALUES (?, ?, ?, ?, 0, ?, 'practice', 1)`,
  ).run(userId, firstTask.part, firstTask.specialty ?? "fiae", `Wiederholung ${new Date().toLocaleDateString("de-DE")}`, totalPoints);

  const session = db.prepare(`SELECT id FROM exam_sessions WHERE rowid = ?`).get(ins.lastInsertRowid) as { id: string };

  uniqueTasks.forEach((t, pos) => {
    db.prepare(`INSERT OR IGNORE INTO session_tasks (session_id, task_id, position) VALUES (?, ?, ?)`).run(session.id, t.task_id, pos);
  });

  res.status(201).json({ success: true, data: { sessionId: session.id } });
});

// ─── POST /api/review/:id/skip ────────────────────────────────────────────────

reviewRouter.post("/:id/skip", (req: Request, res: Response) => {
  const userId = getUserId(req);
  db.prepare(`DELETE FROM review_queue WHERE id = ? AND user_id = ?`).run(req.params.id, userId);
  res.json({ success: true });
});

// ─── Auto-Enqueue nach Evaluation (wird von evaluationRoutes aufgerufen) ──────

export function enqueueForReview(userId: string, subtaskId: string, percentageScore: number): void {
  const today = new Date().toISOString().substring(0, 10);

  const existing = db
    .prepare(`SELECT id, interval_days, ease, repetitions FROM review_queue WHERE user_id = ? AND subtask_id = ?`)
    .get(userId, subtaskId) as { id: string; interval_days: number; ease: number; repetitions: number } | undefined;

  if (percentageScore < 50) {
    if (existing) {
      // Reset
      db.prepare(
        `UPDATE review_queue SET due_at = ?, interval_days = 1, ease = MAX(1.3, ease - 0.2), repetitions = 0, last_score = ? WHERE id = ?`,
      ).run(today, percentageScore, existing.id);
    } else {
      const defaults = defaultReviewEntry();
      db.prepare(
        `INSERT INTO review_queue (user_id, subtask_id, due_at, interval_days, ease, repetitions, last_score)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(userId, subtaskId, today, defaults.intervalDays, defaults.ease, defaults.repetitions, percentageScore);
    }
  } else if (existing) {
    // Score ≥ 50 → Interval verlängern, ggf. aus Queue entfernen wenn gut
    if (percentageScore > 80 && existing.repetitions >= 2) {
      db.prepare(`DELETE FROM review_queue WHERE id = ?`).run(existing.id);
    } else {
      const nextInterval = Math.max(1, Math.round(existing.interval_days * existing.ease));
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + nextInterval);
      db.prepare(
        `UPDATE review_queue SET due_at = ?, interval_days = ?, repetitions = repetitions + 1, last_score = ? WHERE id = ?`,
      ).run(nextDue.toISOString().substring(0, 10), nextInterval, percentageScore, existing.id);
    }
  }
}
