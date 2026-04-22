/**
 * statsRoutes.ts — Statistik-Dashboard pro User.
 *
 * GET /api/stats/me — Aggregierte Lernstatistiken für den eingeloggten User.
 */

import { Router, Request, Response } from "express";
import { db } from "../db/database.js";
import { getUserId } from "./routeHelpers.js";
import {
  calculateStreak,
  classifyTopicPerformance,
} from "../services/statsLogic.js";
import type { ExamPart } from "../types/index.js";
import type { TaskKind } from "../services/taskKind.js";

export const statsRouter = Router();

// Indexe sicherstellen (idempotent)
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_status
      ON exam_sessions(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_evaluations_answer
      ON ai_evaluations(answer_id);
  `);
} catch {
  /* ignorieren — Indexe existieren bereits */
}

// ─── GET /api/stats/me ────────────────────────────────────────────────────────

statsRouter.get("/me", (req: Request, res: Response) => {
  const userId = getUserId(req);

  // ── 1. Basis-Zähler ──────────────────────────────────────────────────────
  const sessions = db
    .prepare(
      `SELECT id, part, specialty, total_score, max_points, ihk_grade,
              started_at, submitted_at, status
       FROM exam_sessions
       WHERE user_id = ? AND status IN ('submitted','graded')
       ORDER BY submitted_at DESC`,
    )
    .all(userId) as {
    id: string;
    part: ExamPart;
    specialty: string;
    total_score: number | null;
    max_points: number;
    ihk_grade: string | null;
    started_at: string;
    submitted_at: string | null;
    status: string;
  }[];

  const totalExams = sessions.length;

  // ── 2. Exams by Part ─────────────────────────────────────────────────────
  const examsByPart: Record<ExamPart, number> = {
    teil_1: 0,
    teil_2: 0,
    teil_3: 0,
  };
  const scoresByPart: Record<ExamPart, number[]> = {
    teil_1: [],
    teil_2: [],
    teil_3: [],
  };

  for (const s of sessions) {
    examsByPart[s.part] = (examsByPart[s.part] ?? 0) + 1;
    if (s.total_score != null && s.max_points > 0) {
      const pct = Math.round((s.total_score / s.max_points) * 100);
      if (!scoresByPart[s.part]) scoresByPart[s.part] = [];
      scoresByPart[s.part].push(pct);
    }
  }

  const averageScoreByPart: Record<ExamPart, number> = {
    teil_1: 0,
    teil_2: 0,
    teil_3: 0,
  };
  for (const part of ["teil_1", "teil_2", "teil_3"] as ExamPart[]) {
    const arr = scoresByPart[part] ?? [];
    averageScoreByPart[part] =
      arr.length > 0
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        : 0;
  }

  // ── 3. Timeline ───────────────────────────────────────────────────────────
  const averageScoreTimeline = sessions
    .filter((s) => s.total_score != null && s.submitted_at)
    .map((s) => ({
      date: s.submitted_at!.substring(0, 10),
      part: s.part,
      percentage: Math.round((s.total_score! / s.max_points) * 100),
      sessionId: s.id,
    }))
    .reverse(); // chronologisch

  // ── 4. Topic Performance ──────────────────────────────────────────────────
  const topicRows = db
    .prepare(
      `SELECT
         t.topic_area,
         es.part,
         es.submitted_at,
         COALESCE(SUM(ae.awarded_points), 0) AS awarded,
         COALESCE(SUM(ae.max_points), 0) AS max_pts
       FROM exam_sessions es
       JOIN session_tasks st ON st.session_id = es.id
       JOIN tasks t ON t.id = st.task_id
       JOIN subtasks s ON s.task_id = t.id
       LEFT JOIN answers a ON a.subtask_id = s.id AND a.session_id = es.id
       LEFT JOIN ai_evaluations ae ON ae.answer_id = a.id
       WHERE es.user_id = ? AND es.status IN ('submitted','graded')
       GROUP BY es.id, t.id`,
    )
    .all(userId) as {
    topic_area: string;
    part: ExamPart;
    submitted_at: string | null;
    awarded: number;
    max_pts: number;
  }[];

  const topicScores = topicRows
    .filter((r) => r.max_pts > 0 && r.submitted_at)
    .map((r) => ({
      topicArea: r.topic_area,
      part: r.part,
      percentage: Math.round((r.awarded / r.max_pts) * 100),
      submittedAt: r.submitted_at!,
    }));

  const topicPerformance = classifyTopicPerformance(topicScores);

  // ── 5. Kind Performance ───────────────────────────────────────────────────
  const kindRows = db
    .prepare(
      `SELECT
         t.task_kind,
         AVG(ae.percentage_score) AS avg_pct,
         COUNT(DISTINCT es.id) AS attempts
       FROM exam_sessions es
       JOIN session_tasks st ON st.session_id = es.id
       JOIN tasks t ON t.id = st.task_id
       JOIN subtasks s ON s.task_id = t.id
       JOIN answers a ON a.subtask_id = s.id AND a.session_id = es.id
       JOIN ai_evaluations ae ON ae.answer_id = a.id
       WHERE es.user_id = ? AND es.status IN ('submitted','graded')
       GROUP BY t.task_kind`,
    )
    .all(userId) as {
    task_kind: TaskKind;
    avg_pct: number;
    attempts: number;
  }[];

  const kindPerformance = kindRows.map((r) => ({
    taskKind: r.task_kind,
    avgPercentage: Math.round(r.avg_pct),
    attempts: r.attempts,
  }));

  // ── 6. Streak ─────────────────────────────────────────────────────────────
  const streakDates = sessions
    .filter((s) => s.submitted_at)
    .map((s) => s.submitted_at!);
  const currentStreak = calculateStreak(streakDates);

  res.json({
    success: true,
    data: {
      totalExams,
      examsByPart,
      averageScoreByPart,
      averageScoreTimeline,
      topicPerformance,
      kindPerformance,
      currentStreak,
    },
  });
});
