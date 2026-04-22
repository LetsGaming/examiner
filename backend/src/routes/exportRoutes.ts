/**
 * exportRoutes.ts — Rohdaten-Export für den eingeloggten User.
 *
 * GET /api/export/me.json  — kompletter JSON-Dump
 * GET /api/export/me.csv   — flache CSV pro Subtask-Antwort
 */

import { Router, Request, Response } from "express";
import { db } from "../db/database.js";
import { getUserId } from "./routeHelpers.js";

export const exportRouter = Router();

// ─── GET /api/export/me.json ──────────────────────────────────────────────────

exportRouter.get("/me.json", (req: Request, res: Response) => {
  const userId = getUserId(req);
  const today = new Date().toISOString().substring(0, 10);

  const user = db
    .prepare(`SELECT id, email, display_name, created_at FROM users WHERE id = ?`)
    .get(userId) as Record<string, unknown> | undefined;

  const sessions = db
    .prepare(
      `SELECT id, part, specialty, title, scenario_name, started_at, submitted_at,
              status, total_score, max_points, ihk_grade
       FROM exam_sessions WHERE user_id = ? ORDER BY started_at DESC`,
    )
    .all(userId) as Record<string, unknown>[];

  const reviewQueue = db
    .prepare(
      `SELECT id, subtask_id, due_at, interval_days, ease, repetitions, last_score
       FROM review_queue WHERE user_id = ?`,
    )
    .all(userId) as Record<string, unknown>[];

  const settings = db
    .prepare(`SELECT key, value, updated_at FROM user_settings WHERE user_id = ?`)
    .all(userId) as Record<string, unknown>[];

  const date = new Date().toISOString().split("T")[0];
  res.setHeader("Content-Disposition", `attachment; filename=examiner-export-${date}.json`);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.json({
    exportedAt: new Date().toISOString(),
    user: user
      ? { id: user.id, email: user.email, displayName: user.display_name, createdAt: user.created_at }
      : null,
    sessions,
    reviewQueue,
    settings,
  });
});

// ─── GET /api/export/me.csv ───────────────────────────────────────────────────

exportRouter.get("/me.csv", (req: Request, res: Response) => {
  const userId = getUserId(req);

  const rows = db
    .prepare(
      `SELECT
         es.submitted_at                        AS session_date,
         es.part,
         t.topic_area,
         s.label                                AS subtask_label,
         s.task_type,
         COALESCE(ae.awarded_points, '')         AS points_awarded,
         s.points                               AS points_max,
         COALESCE(ROUND(ae.percentage_score,1),'') AS percentage
       FROM exam_sessions es
       JOIN session_tasks st ON st.session_id = es.id
       JOIN tasks t ON t.id = st.task_id
       JOIN subtasks s ON s.task_id = t.id
       LEFT JOIN answers a ON a.subtask_id = s.id AND a.session_id = es.id
       LEFT JOIN ai_evaluations ae ON ae.answer_id = a.id
       WHERE es.user_id = ? AND es.status IN ('submitted','graded','practice')
       ORDER BY es.submitted_at DESC, st.position ASC, s.position ASC`,
    )
    .all(userId) as Record<string, string | number | null>[];

  const escape = (v: unknown): string => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headers = ["session_date", "part", "topic_area", "subtask_label", "task_type", "points_awarded", "points_max", "percentage"];
  const lines = ["\uFEFF" + headers.join(",")]; // BOM für Excel
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }

  const date = new Date().toISOString().split("T")[0];
  res.setHeader("Content-Disposition", `attachment; filename=examiner-export-${date}.csv`);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.send(lines.join("\r\n"));
});
