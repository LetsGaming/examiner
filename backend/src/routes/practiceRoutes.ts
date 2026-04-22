/**
 * practiceRoutes.ts — Gezielter Übungsmodus.
 *
 * POST /api/practice/start  — Erstellt eine Practice-Session mit 1-10 gezielten Aufgaben
 */

import { Router, Request, Response } from "express";
import { db } from "../db/database.js";
import { getUserId } from "./routeHelpers.js";
import { resolveAiConfig } from "./settingsRoutes.js";
import { generateTasksForPool } from "../services/examGenerator.js";
import { insertTasksIntoDB } from "./routeHelpers.js";
import type { ExamPart, Specialty } from "../types/index.js";
import type { TaskKind } from "../services/taskKind.js";

export const practiceRouter = Router();

// ─── Migration: practice + review Status in exam_sessions ────────────────────
// SQLite kann CHECK-Constraints nicht per ALTER TABLE ändern →
// Tabelle neu erstellen wenn nötig.
(function migratePracticeStatus() {
  try {
    db.pragma("foreign_keys = OFF");
    db.prepare(
      `INSERT INTO exam_sessions (id, user_id, part, title, duration_minutes, max_points, status)
       VALUES ('_probe_practice', 'local-user', 'teil_1', 'probe', 0, 0, 'practice')`,
    ).run();
    db.prepare(`DELETE FROM exam_sessions WHERE id = '_probe_practice'`).run();
    db.pragma("foreign_keys = ON");
  } catch {
    db.pragma("foreign_keys = ON");
    // Rebuild nötig
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
  }
})();

// ─── POST /api/practice/start ─────────────────────────────────────────────────

practiceRouter.post("/start", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const {
    part,
    topic,
    taskKind,
    count = 3,
    specialty = "fiae",
  } = req.body as {
    part?: ExamPart;
    topic?: string;
    taskKind?: TaskKind;
    count?: number;
    specialty?: Specialty;
  };

  if (!part) {
    return res.status(400).json({ success: false, error: "part ist erforderlich." });
  }

  const n = Math.min(Math.max(1, Number(count)), 10);

  // Aufgaben aus dem Pool holen
  let tasks: Record<string, unknown>[] = [];

  const usedIdStr = () => tasks.map((t) => `'${t.id}'`).join(",") || "''";

  for (let i = 0; i < n; i++) {
    const kindClause = taskKind ? `AND task_kind = '${taskKind}'` : "";
    const topicClause = topic ? `AND topic_area = '${topic.replace(/'/g, "''")}'` : "";

    const task = db
      .prepare(
        `SELECT * FROM tasks
         WHERE part = ? AND specialty = ?
           AND id NOT IN (${usedIdStr()})
           ${kindClause} ${topicClause}
         ORDER BY times_used ASC, RANDOM() LIMIT 1`,
      )
      .get(part, specialty) as Record<string, unknown> | undefined;

    if (task) {
      tasks.push(task);
    }
  }

  // Pool zu klein → nachladen
  if (tasks.length < n) {
    const aiConfig = resolveAiConfig(userId);
    if (aiConfig) {
      try {
        const generated = await generateTasksForPool(part, 6, aiConfig.apiKey, aiConfig.meta, undefined, undefined, specialty);
        await insertTasksIntoDB(part, generated.tasks, specialty);
        // Nochmal versuchen
        for (let i = tasks.length; i < n; i++) {
          const kindClause = taskKind ? `AND task_kind = '${taskKind}'` : "";
          const topicClause = topic ? `AND topic_area = '${topic.replace(/'/g, "''")}'` : "";
          const task = db
            .prepare(
              `SELECT * FROM tasks
               WHERE part = ? AND specialty = ?
                 AND id NOT IN (${usedIdStr()})
                 ${kindClause} ${topicClause}
               ORDER BY times_used ASC, RANDOM() LIMIT 1`,
            )
            .get(part, specialty) as Record<string, unknown> | undefined;
          if (task) tasks.push(task);
        }
      } catch {
        // Weiter mit was da ist
      }
    }
  }

  if (tasks.length === 0) {
    return res.status(422).json({ success: false, error: "Kein Pool verfügbar. Bitte erst Aufgaben generieren." });
  }

  // Session anlegen
  const totalPoints = tasks.reduce((s, t) => s + (t.points_value as number), 0);
  const sessionId = (
    db.prepare(
      `INSERT INTO exam_sessions (user_id, part, specialty, title, duration_minutes, max_points, status)
       VALUES (?, ?, ?, ?, 0, ?, 'practice')`,
    ).run(userId, part, specialty, `Übungssession ${new Date().toLocaleDateString("de-DE")}`, totalPoints)
  );

  const newSession = db.prepare(`SELECT id FROM exam_sessions WHERE rowid = ?`).get(
    sessionId.lastInsertRowid,
  ) as { id: string };

  // Session-Tasks verknüpfen
  tasks.forEach((task, pos) => {
    db.prepare(
      `INSERT INTO session_tasks (session_id, task_id, position) VALUES (?, ?, ?)`,
    ).run(newSession.id, task.id as string, pos);
    db.prepare(`UPDATE tasks SET times_used = times_used + 1 WHERE id = ?`).run(task.id as string);
  });

  res.status(201).json({ success: true, data: { sessionId: newSession.id } });
});
