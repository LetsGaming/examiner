/**
 * historyRoutes.ts — Prüfungshistorie: Liste aller Sessions + Detailansicht.
 *
 * GET /api/sessions              — Liste aller Sessions des Users
 * GET /api/sessions/:id/detail   — Vollständige Session inkl. Antworten + Musterlösungen
 */

import { Router, Request, Response } from "express";
import { db } from "../db/database.js";
import { getUserId } from "./routeHelpers.js";

export const historyRouter = Router();

// ─── GET /api/sessions (Liste) ────────────────────────────────────────────────

historyRouter.get("/", (req: Request, res: Response) => {
  const userId = getUserId(req);
  const sessions = db
    .prepare(
      `SELECT id, part, specialty, title, scenario_name,
              started_at, submitted_at, status,
              total_score, max_points, ihk_grade,
              COALESCE(is_review, 0) as is_review
       FROM exam_sessions
       WHERE user_id = ?
         AND status != 'in_progress'
       ORDER BY COALESCE(submitted_at, started_at) DESC`,
    )
    .all(userId) as {
    id: string;
    part: string;
    specialty: string;
    title: string;
    scenario_name: string | null;
    started_at: string;
    submitted_at: string | null;
    status: string;
    total_score: number | null;
    max_points: number;
    ihk_grade: string | null;
    is_review: number;
  }[];

  const data = sessions.map((s) => ({
    id: s.id,
    part: s.part,
    specialty: s.specialty,
    title: s.title,
    scenarioName: s.scenario_name,
    startedAt: s.started_at,
    submittedAt: s.submitted_at,
    status: s.status,
    totalScore: s.total_score,
    maxPoints: s.max_points,
    ihkGrade: s.ihk_grade,
    isPractice: s.status === "practice" || s.status === "review",
    isReview: !!(s.is_review),
  }));

  res.json({ success: true, data });
});

// ─── GET /api/sessions/:id/detail (Vollständige History-Detailansicht) ────────

historyRouter.get("/:sessionId/detail", (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { sessionId } = req.params;

  const session = db
    .prepare(
      `SELECT id, user_id, part, specialty, title, scenario_name,
              scenario_description, duration_minutes, max_points,
              started_at, submitted_at, status, total_score, ihk_grade
       FROM exam_sessions WHERE id = ? AND user_id = ?`,
    )
    .get(sessionId, userId) as Record<string, unknown> | undefined;

  if (!session) {
    return res.status(404).json({ success: false, error: "Session nicht gefunden." });
  }

  // Nur abgeschlossene Sessions dürfen Musterlösungen sehen
  const isCompleted = ["submitted", "graded", "practice"].includes(
    session.status as string,
  );

  const overrides = new Map<string, string>();
  const overrideRows = db
    .prepare(
      `SELECT subtask_id, question_text FROM session_subtask_overrides WHERE session_id = ?`,
    )
    .all(sessionId) as { subtask_id: string; question_text: string }[];
  for (const row of overrideRows) overrides.set(row.subtask_id, row.question_text);

  const rawTasks = db
    .prepare(
      `SELECT t.id, t.topic_area, t.task_kind, st_join.position
       FROM session_tasks st_join
       JOIN tasks t ON t.id = st_join.task_id
       WHERE st_join.session_id = ?
       ORDER BY st_join.position ASC`,
    )
    .all(sessionId) as {
    id: string;
    topic_area: string;
    task_kind: string;
    position: number;
  }[];

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
      taskKind: t.task_kind,
      maxPoints: totalPts,
      subtasks: subtasks.map((st) => {
        const sub: Record<string, unknown> = {
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
        // Musterlösung nur bei abgeschlossenen Sessions
        if (isCompleted) {
          try {
            sub.expectedAnswer = JSON.parse(
              (st.expected_answer as string) ?? "{}",
            );
          } catch {
            sub.expectedAnswer = {};
          }
        }
        return sub;
      }),
    };
  });

  // Antworten + Evaluationen für History
  const answers = db
    .prepare(
      `SELECT a.id, a.subtask_id, a.text_value, a.selected_mc_option,
              a.diagram_image_path, a.answered_at,
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

  res.json({
    success: true,
    data: {
      id: session.id,
      userId: session.user_id,
      part: session.part,
      specialty: session.specialty,
      startedAt: session.started_at,
      submittedAt: session.submitted_at,
      status: session.status,
      totalScore: session.total_score,
      maxPoints: session.max_points,
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
    },
  });
});
