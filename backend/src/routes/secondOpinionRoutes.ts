/**
 * secondOpinionRoutes.ts — Zweitbewertung für eine bereits bewertete Antwort.
 *
 * POST /api/sessions/:sessionId/answers/:answerId/re-evaluate
 *
 * Zugänglich sobald die Session NICHT mehr 'in_progress' ist, d.h. auch für
 * 'practice'- und 'review'-Sessions (Wiederholungsmodus).
 *
 * ## Placeholder policy
 *   expected_answer wird aus session_subtask_overrides geladen (COALESCE),
 *   damit Platzhalter bereits per Code ersetzt sind — identisch zu
 *   evaluationRoutes.ts.
 */
import path from 'path';
import fs from 'fs';
import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { assessFreitext, analyzeDiagram } from '../services/aiService.js';
import { resolveAiConfig } from './settingsRoutes.js';
import { getUserId, evaluateLimiter } from './routeHelpers.js';
import type { TaskType, ExamPart, DiagramType } from '../types/index.js';

export const secondOpinionRouter = Router();

// Limit: max 3 Zweitbewertungen pro Session — persistiert in DB, nicht Memory,
// damit Server-Restarts das Limit nicht zurücksetzen.
const MAX_SECOND_OPINIONS = 3;

/** Liefert die bisherige Anzahl second_opinion-Einträge für diese Session. */
function countSecondOpinions(sessionId: string): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) as cnt
       FROM ai_evaluations ae
       JOIN answers a ON a.id = ae.answer_id
       WHERE a.session_id = ? AND ae.ai_agent = 'second_opinion'`,
    )
    .get(sessionId) as { cnt: number };
  return row?.cnt ?? 0;
}

secondOpinionRouter.post(
  '/:sessionId/answers/:answerId/re-evaluate',
  evaluateLimiter,
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const sessionId = String(req.params.sessionId);
    const answerId = String(req.params.answerId);

    // ── Session-Prüfung ──────────────────────────────────────────────────────
    // Erlaubt: submitted, graded, practice, review — blockiert nur in_progress.
    const session = db
      .prepare(`SELECT id, status FROM exam_sessions WHERE id = ? AND user_id = ?`)
      .get(sessionId, userId) as { id: string; status: string } | undefined;

    if (!session) return res.status(404).json({ success: false, error: 'Session nicht gefunden.' });

    if (session.status === 'in_progress')
      return res.status(400).json({
        success: false,
        error: 'Zweitbewertung nur nach Abgabe möglich.',
      });

    // ── Rate-Limit (DB-basiert, reset-sicher) ────────────────────────────────
    if (countSecondOpinions(sessionId) >= MAX_SECOND_OPINIONS)
      return res.status(429).json({
        success: false,
        error: `Maximal ${MAX_SECOND_OPINIONS} Zweitbewertungen pro Session.`,
      });

    // ── API-Key ──────────────────────────────────────────────────────────────
    const aiConfig = resolveAiConfig(userId);
    if (!aiConfig)
      return res.status(500).json({ success: false, error: 'Kein API-Key konfiguriert.' });
    const { apiKey, meta } = aiConfig;

    // ── Antwort laden — expected_answer aus Override wenn vorhanden ──────────
    const answer = db
      .prepare(
        `SELECT a.id, a.text_value, a.selected_mc_option, a.diagram_image_path,
                s.task_type,
                COALESCE(sso.question_text, s.question_text)   AS question_text,
                COALESCE(sso.expected_answer, s.expected_answer) AS expected_answer,
                s.points, s.diagram_type, s.expected_elements,
                t.topic_area, t.part AS exam_part,
                es.scenario_description
         FROM answers a
         JOIN subtasks s    ON s.id  = a.subtask_id
         JOIN tasks t       ON t.id  = s.task_id
         JOIN exam_sessions es ON es.id = a.session_id
         LEFT JOIN session_subtask_overrides sso
           ON sso.session_id = a.session_id AND sso.subtask_id = a.subtask_id
         WHERE a.id = ? AND a.session_id = ?`,
      )
      .get(answerId, sessionId) as Record<string, unknown> | undefined;

    if (!answer) return res.status(404).json({ success: false, error: 'Antwort nicht gefunden.' });

    // ── Bewertung ────────────────────────────────────────────────────────────
    try {
      const taskType = answer.task_type as TaskType;
      const questionText = answer.question_text as string;
      let expectedAnswer: Record<string, unknown> = {};
      try {
        expectedAnswer = JSON.parse(answer.expected_answer as string);
      } catch {
        /**/
      }

      let evaluation;

      if (taskType === 'diagram_upload') {
        const imagePath = answer.diagram_image_path as string;
        if (!imagePath || !fs.existsSync(imagePath))
          return res.status(400).json({ success: false, error: 'Kein Diagramm.' });
        const imageData = fs.readFileSync(imagePath).toString('base64');
        const ext = path.extname(imagePath).slice(1).toLowerCase();
        let expectedElements: string[] = [];
        try {
          expectedElements = JSON.parse((answer.expected_elements as string) ?? '[]');
        } catch {
          /**/
        }
        evaluation = await analyzeDiagram(
          {
            diagramType: (answer.diagram_type as DiagramType) ?? 'uml_class',
            taskDescription: questionText,
            expectedElements,
            maxPoints: answer.points as number,
            imageBase64: imageData,
            imageMediaType: ext === 'png' ? 'image/png' : 'image/jpeg',
            scenarioContext: (answer.scenario_description as string) ?? '',
          },
          apiKey,
          meta,
        );
      } else {
        const studentAnswer =
          taskType === 'mc' || taskType === 'mc_multi'
            ? ((answer.selected_mc_option as string) ?? '')
            : ((answer.text_value as string) ?? '');
        evaluation = await assessFreitext(
          {
            taskType,
            examPart: answer.exam_part as ExamPart,
            questionText,
            expectedAnswer,
            studentAnswer,
            maxPoints: answer.points as number,
            topicArea: answer.topic_area as string,
            scenarioContext: (answer.scenario_description as string) ?? '',
          },
          apiKey,
          meta,
        );
      }

      // ── In DB schreiben (INSERT, kein UPSERT — zweite Meinung ist eigenständig) ──
      db.prepare(
        `INSERT INTO ai_evaluations (
          answer_id, awarded_points, max_points, percentage_score, ihk_grade,
          feedback_text, criterion_scores, key_mistakes, improvement_hints,
          detected_elements, missing_elements, notation_errors, model_used, ai_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'second_opinion')`,
      ).run(
        answerId,
        evaluation.awardedPoints,
        evaluation.maxPoints,
        evaluation.percentageScore,
        evaluation.ihkGrade,
        evaluation.feedbackText,
        JSON.stringify(evaluation.criterionScores ?? []),
        JSON.stringify(evaluation.keyMistakes ?? []),
        JSON.stringify(evaluation.improvementHints ?? []),
        JSON.stringify((evaluation as Record<string, unknown>).detectedElements ?? []),
        JSON.stringify((evaluation as Record<string, unknown>).missingElements ?? []),
        JSON.stringify((evaluation as Record<string, unknown>).notationErrors ?? []),
        evaluation.modelUsed,
      );

      return res.json({ success: true, data: evaluation });
    } catch (err) {
      console.error('[re-evaluate]', err);
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'KI-Fehler',
      });
    }
  },
);
