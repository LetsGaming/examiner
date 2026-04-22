/**
 * sessionRoutes.ts — Exam session data access and answer persistence.
 *
 * GET  /api/sessions/:sessionId                              — load session + answers
 * PUT  /api/sessions/:sessionId/answers/:subtaskId          — save text/MC answer
 * POST /api/sessions/:sessionId/answers/:subtaskId/upload   — save diagram image
 * POST /api/sessions/:sessionId/submit                      — grade and close session
 */
import path from "path";
import { Router, Request, Response } from "express";
import { db } from "../db/database.js";
import { getUserId, upload } from "./routeHelpers.js";

export const sessionRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assertOwnership(sessionId: string, userId: string, res: Response): boolean {
  const owns = db
    .prepare(`SELECT id FROM exam_sessions WHERE id = ? AND user_id = ?`)
    .get(sessionId, userId);
  if (!owns) {
    res.status(403).json({ success: false, error: "Keine Berechtigung." });
    return false;
  }
  return true;
}

function calcGrade(total: number, maxPoints: number): string {
  const pct = Math.round((total / maxPoints) * 100);
  if (pct >= 92) return "sehr_gut";
  if (pct >= 81) return "gut";
  if (pct >= 67) return "befriedigend";
  if (pct >= 50) return "ausreichend";
  if (pct >= 30) return "mangelhaft";
  return "ungenuegend";
}

function loadSession(sessionId: string, userId: string) {
  const session = db
    .prepare(
      `SELECT id, user_id, part, title, scenario_name, scenario_description,
              duration_minutes, max_points, started_at, submitted_at, status,
              total_score, ihk_grade
       FROM exam_sessions WHERE id = ? AND user_id = ?`,
    )
    .get(sessionId, userId) as Record<string, unknown> | undefined;
  if (!session) return null;

  const overrides = new Map<string, string>();
  const overrideRows = db
    .prepare(`SELECT subtask_id, question_text FROM session_subtask_overrides WHERE session_id = ?`)
    .all(sessionId) as { subtask_id: string; question_text: string }[];
  for (const row of overrideRows) overrides.set(row.subtask_id, row.question_text);

  const rawTasks = db
    .prepare(
      `SELECT t.id, t.topic_area, st_join.position
       FROM session_tasks st_join
       JOIN tasks t ON t.id = st_join.task_id
       WHERE st_join.session_id = ?
       ORDER BY st_join.position ASC`,
    )
    .all(sessionId) as { id: string; topic_area: string; position: number }[];

  const tasks = rawTasks.map((t) => {
    const subtasks = db
      .prepare(
        `SELECT id, label, task_type, question_text, expected_answer, points,
                diagram_type, expected_elements, mc_options, table_config, position
         FROM subtasks WHERE task_id = ? ORDER BY position ASC`,
      )
      .all(t.id) as Record<string, unknown>[];

    const totalPts = subtasks.reduce((s, st) => s + (st.points as number), 0);

    return {
      id: t.id,
      position: t.position,
      topicArea: t.topic_area,
      maxPoints: totalPts,
      subtasks: subtasks.map((st) => {
        const base: Record<string, unknown> = {
          id: st.id,
          label: st.label,
          taskType: st.task_type,
          questionText: overrides.get(st.id as string) ?? st.question_text,
          points: st.points,
          diagramType: st.diagram_type ?? null,
          expectedElements: JSON.parse((st.expected_elements as string) ?? "[]"),
          mcOptions: JSON.parse((st.mc_options as string) ?? "[]"),
          tableConfig: st.table_config ? JSON.parse(st.table_config as string) : null,
        };
        // Feature 4 Security: Musterlösung nur nach Abgabe ausliefern
        if (session && (session.status as string) !== "in_progress") {
          try {
            base.expectedAnswer = JSON.parse(
              (st.expected_answer as string) ?? "{}",
            );
          } catch {
            base.expectedAnswer = {};
          }
        }
        return base;
      }),
    };
  });

  const answers = db
    .prepare(
      `SELECT a.id, a.subtask_id, a.text_value, a.selected_mc_option,
              a.diagram_image_path, a.answered_at, a.flagged,
              ae.awarded_points, ae.max_points, ae.percentage_score,
              ae.ihk_grade, ae.feedback_text, ae.criterion_scores,
              ae.key_mistakes, ae.improvement_hints,
              ae.detected_elements, ae.missing_elements, ae.notation_errors,
              ae.model_used
       FROM answers a
       LEFT JOIN ai_evaluations ae ON ae.answer_id = a.id
       WHERE a.session_id = ?`,
    )
    .all(sessionId) as Record<string, unknown>[];

  const parsedAnswers = answers.map((a) => ({
    id: a.id,
    sessionId,
    subtaskId: a.subtask_id,
    textValue: a.text_value,
    selectedMcOption: a.selected_mc_option,
    diagramImagePath: a.diagram_image_path,
    answeredAt: a.answered_at,
    flagged: !!(a.flagged as number),
    evaluation:
      a.awarded_points != null
        ? {
            awardedPoints: a.awarded_points,
            maxPoints: a.max_points,
            percentageScore: a.percentage_score,
            ihkGrade: a.ihk_grade,
            feedbackText: a.feedback_text,
            criterionScores: JSON.parse((a.criterion_scores as string) ?? "[]"),
            keyMistakes: JSON.parse((a.key_mistakes as string) ?? "[]"),
            improvementHints: JSON.parse((a.improvement_hints as string) ?? "[]"),
            detectedElements: JSON.parse((a.detected_elements as string) ?? "[]"),
            missingElements: JSON.parse((a.missing_elements as string) ?? "[]"),
            notationErrors: JSON.parse((a.notation_errors as string) ?? "[]"),
            modelUsed: a.model_used,
          }
        : null,
  }));

  return {
    id: session.id,
    userId: session.user_id,
    part: session.part,
    startedAt: session.started_at,
    submittedAt: session.submitted_at,
    status: session.status,
    totalScore: session.total_score,
    ihkGrade: session.ihk_grade,
    examTemplate: {
      id: session.id,
      title: session.title,
      part: session.part,
      scenarioName: session.scenario_name,
      scenarioDescription: session.scenario_description,
      durationMinutes: session.duration_minutes,
      maxPoints: session.max_points,
      tasks,
    },
    answers: parsedAnswers,
  };
}

// ─── GET /api/sessions/:sessionId ────────────────────────────────────────────

sessionRouter.get("/:sessionId", (req: Request, res: Response) => {
  const data = loadSession(req.params.sessionId as string, getUserId(req));
  if (!data) return res.status(404).json({ success: false, error: "Session nicht gefunden." });
  res.json({ success: true, data });
});

// ─── PUT /api/sessions/:sessionId/answers/:subtaskId ─────────────────────────

sessionRouter.put("/:sessionId/answers/:subtaskId", (req: Request, res: Response) => {
  const { textValue, selectedMcOption } = req.body;
  const { sessionId, subtaskId } = req.params;

  if (!assertOwnership(sessionId as string, getUserId(req), res)) return;

  const existing = db
    .prepare("SELECT id FROM answers WHERE session_id = ? AND subtask_id = ?")
    .get(sessionId, subtaskId) as { id: string } | undefined;

  if (existing) {
    db.prepare(`UPDATE answers SET text_value = ?, selected_mc_option = ?, answered_at = datetime('now') WHERE id = ?`)
      .run(textValue ?? "", selectedMcOption ?? null, existing.id);
    return res.json({ success: true, data: { answerId: existing.id } });
  }

  const result = db
    .prepare(`INSERT INTO answers (session_id, subtask_id, text_value, selected_mc_option) VALUES (?, ?, ?, ?)`)
    .run(sessionId, subtaskId, textValue ?? "", selectedMcOption ?? null);

  const newAnswer = db.prepare("SELECT id FROM answers WHERE rowid = ?").get(result.lastInsertRowid) as { id: string };
  res.status(201).json({ success: true, data: { answerId: newAnswer.id } });
});

// ─── POST /api/sessions/:sessionId/answers/:subtaskId/upload ─────────────────

sessionRouter.post(
  "/:sessionId/answers/:subtaskId/upload",
  upload.single("diagram"),
  (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ success: false, error: "Keine Datei." });
    const sessionId = req.params.sessionId as string;
    const subtaskId = req.params.subtaskId as string;

    if (!assertOwnership(sessionId, getUserId(req), res)) return;

    const imagePath = req.file.path;
    const existing = db
      .prepare("SELECT id FROM answers WHERE session_id = ? AND subtask_id = ?")
      .get(sessionId, subtaskId) as { id: string } | undefined;

    if (existing) {
      db.prepare("UPDATE answers SET diagram_image_path = ? WHERE id = ?").run(imagePath, existing.id);
      return res.json({ success: true, data: { answerId: existing.id, imagePath } });
    }

    const result = db
      .prepare(`INSERT INTO answers (session_id, subtask_id, text_value, diagram_image_path) VALUES (?, ?, '', ?)`)
      .run(sessionId, subtaskId, imagePath);

    const newAnswer = db.prepare("SELECT id FROM answers WHERE rowid = ?").get(result.lastInsertRowid) as { id: string };
    res.status(201).json({ success: true, data: { answerId: newAnswer.id, imagePath } });
  },
);

// ─── POST /api/sessions/:sessionId/submit ────────────────────────────────────

sessionRouter.post("/:sessionId/submit", (req: Request, res: Response) => {
  const session = db
    .prepare(`SELECT id, max_points FROM exam_sessions WHERE id = ? AND user_id = ? AND status = 'in_progress'`)
    .get(req.params.sessionId as string, getUserId(req)) as { id: string; max_points: number } | undefined;

  if (!session)
    return res.status(404).json({ success: false, error: "Aktive Session nicht gefunden." });

  const { total } = db
    .prepare(
      `SELECT COALESCE(SUM(ae.awarded_points), 0) AS total
       FROM answers a
       LEFT JOIN ai_evaluations ae ON ae.answer_id = a.id
       WHERE a.session_id = ?`,
    )
    .get(req.params.sessionId as string) as { total: number };

  const percent = Math.round((total / session.max_points) * 100);
  const grade = calcGrade(total, session.max_points);

  db.prepare(`UPDATE exam_sessions SET status='graded', submitted_at=datetime('now'), total_score=?, ihk_grade=? WHERE id=?`)
    .run(total, grade, req.params.sessionId as string);

  res.json({ success: true, data: { totalScore: total, maxPoints: session.max_points, percentageScore: percent, ihkGrade: grade } });
});

// ─── Feature 8: Flagged-Spalte Migration ─────────────────────────────────────
try {
  db.exec("ALTER TABLE answers ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0");
} catch { /* bereits vorhanden */ }

// ─── PATCH /api/sessions/:sessionId/answers/:subtaskId (flag toggle) ─────────
sessionRouter.patch("/:sessionId/answers/:subtaskId", (req: Request, res: Response) => {
  const { sessionId, subtaskId } = req.params;
  const { flagged } = req.body;

  if (!assertOwnership(sessionId as string, getUserId(req), res)) return;

  // Sicherstellen dass ein Answer-Record existiert
  const existing = db
    .prepare("SELECT id FROM answers WHERE session_id = ? AND subtask_id = ?")
    .get(sessionId, subtaskId) as { id: string } | undefined;

  if (!existing) {
    // Leeren Record anlegen damit das Flag gespeichert werden kann
    db.prepare(`INSERT INTO answers (session_id, subtask_id, text_value, flagged) VALUES (?, ?, '', ?)`)
      .run(sessionId, subtaskId, flagged ? 1 : 0);
  } else {
    db.prepare("UPDATE answers SET flagged = ? WHERE id = ?").run(flagged ? 1 : 0, existing.id);
  }

  res.json({ success: true });
});
