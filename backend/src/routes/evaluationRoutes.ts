/**
 * evaluationRoutes.ts — AI evaluation of individual answers.
 *
 * POST /api/sessions/:sessionId/answers/:answerId/evaluate
 *
 * Supports: freitext, pseudocode, mc, mc_multi, table, plantuml, diagram_upload.
 *
 * ## Concurrency
 *
 *   Each (sessionId, answerId) pair is protected by an in-process mutex so
 *   that two concurrent re-evaluation requests for the same answer cannot race
 *   and trigger a SQLite UNIQUE constraint error. The mutex is acquired before
 *   the AI call and released after the DB write.
 *
 * ## Placeholder policy
 *
 *   questionText is resolved at session start via session_subtask_overrides.
 *   expectedAnswer may still contain {{PLACEHOLDER}} tokens if the AI generated
 *   them before scenario assignment. These are replaced here using the session's
 *   scenario values; any remaining unresolved tokens are stripped before the
 *   LLM sees them.
 */
import path from 'path';
import fs from 'fs';
import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { assessFreitext, analyzeDiagram } from '../services/aiService.js';
import { resolveAiConfig } from './settingsRoutes.js';
import { getUserId, evaluateLimiter } from './routeHelpers.js';
import { evaluationMutex } from '../utils/concurrency.js';
import { enqueueForReview } from './reviewRoutes.js';
import type { AiEvaluation, DiagramType, TaskType, ExamPart } from '../types/index.js';

export const evaluationRouter = Router();

// ─── Scenario placeholder helpers ────────────────────────────────────────────

/** Replace known {{PLACEHOLDER}} tokens; strip any that remain unresolved. */
function applyScenarioToText(text: string, scenarioName: string): string {
  return text.replace(/\{\{UNTERNEHMEN\}\}/g, scenarioName).replace(/\{\{[A-Z_]+\}\}/g, '');
}

/** Recursively apply scenario replacement to all string values in an object. */
function sanitiseExpectedAnswer(
  raw: Record<string, unknown>,
  scenarioName: string,
): Record<string, unknown> {
  function walk(value: unknown): unknown {
    if (typeof value === 'string') return applyScenarioToText(value, scenarioName);
    if (Array.isArray(value)) return value.map(walk);
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, walk(v)]),
      );
    }
    return value;
  }
  return walk(raw) as Record<string, unknown>;
}

// ─── DB write ─────────────────────────────────────────────────────────────────

const upsertEvaluation = db.prepare(`
  INSERT INTO ai_evaluations (
    answer_id, awarded_points, max_points, percentage_score, ihk_grade,
    feedback_text, criterion_scores, key_mistakes, improvement_hints,
    detected_elements, missing_elements, notation_errors, model_used, ai_agent
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(answer_id) DO UPDATE SET
    awarded_points    = excluded.awarded_points,
    max_points        = excluded.max_points,
    percentage_score  = excluded.percentage_score,
    ihk_grade         = excluded.ihk_grade,
    feedback_text     = excluded.feedback_text,
    criterion_scores  = excluded.criterion_scores,
    key_mistakes      = excluded.key_mistakes,
    improvement_hints = excluded.improvement_hints,
    detected_elements = excluded.detected_elements,
    missing_elements  = excluded.missing_elements,
    notation_errors   = excluded.notation_errors,
    model_used        = excluded.model_used,
    ai_agent          = excluded.ai_agent,
    created_at        = datetime('now')
`);

function persistEvaluation(
  answerId: string,
  evaluation: Omit<AiEvaluation, 'id' | 'answerId' | 'createdAt'>,
  agentLabel: string,
): void {
  upsertEvaluation.run(
    answerId,
    evaluation.awardedPoints,
    evaluation.maxPoints,
    evaluation.percentageScore,
    evaluation.ihkGrade,
    evaluation.feedbackText,
    JSON.stringify(evaluation.criterionScores ?? []),
    JSON.stringify(evaluation.keyMistakes ?? []),
    JSON.stringify(evaluation.improvementHints ?? []),
    JSON.stringify(evaluation.detectedElements ?? []),
    JSON.stringify(evaluation.missingElements ?? []),
    JSON.stringify(evaluation.notationErrors ?? []),
    evaluation.modelUsed,
    agentLabel,
  );
}

// ─── Answer loading ───────────────────────────────────────────────────────────

interface AnswerRow {
  id: string;
  subtask_id: string;
  task_type: string;
  question_text: string;
  expected_answer: string;
  max_points: number;
  diagram_type: string | null;
  expected_elements: string;
  mc_options: string;
  diagram_image_path: string | null;
  text_value: string | null;
  selected_mc_option: string | null;
  exam_part: string;
  topic_area: string;
  scenario_name: string;
  scenario_description: string;
}

const loadAnswerStmt = db.prepare(`
  SELECT a.*,
         st.task_type,
         COALESCE(sso.question_text, st.question_text) AS question_text,
         st.expected_answer,
         st.points AS max_points,
         st.diagram_type,
         st.expected_elements,
         st.mc_options,
         s.part AS exam_part,
         t.topic_area,
         s.scenario_name,
         s.scenario_description
  FROM answers a
  JOIN subtasks st ON st.id = a.subtask_id
  JOIN tasks t    ON t.id = st.task_id
  JOIN exam_sessions s ON s.id = a.session_id
  LEFT JOIN session_subtask_overrides sso
    ON sso.session_id = a.session_id AND sso.subtask_id = a.subtask_id
  WHERE a.id = ? AND a.session_id = ?
`);

// ─── POST /:sessionId/answers/:answerId/evaluate ──────────────────────────────

evaluationRouter.post(
  '/:sessionId/answers/:answerId/evaluate',
  evaluateLimiter,
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const aiConfig = resolveAiConfig(userId);
    if (!aiConfig) {
      return res.status(500).json({
        success: false,
        error: 'Kein API-Key konfiguriert. Bitte in den Einstellungen hinterlegen.',
      });
    }

    const answerId = req.params.answerId as string;
    const sessionId = req.params.sessionId as string;
    const mutexKey = `${sessionId}:${answerId}`;

    // Per-answer mutex: prevents two concurrent re-evaluation requests from
    // racing into the DB upsert and hitting a UNIQUE constraint error on
    // systems where the migration (migrateAiEvaluationsRemoveUnique) hasn't
    // run yet, or as a second line of defence on any SQLite version.
    if (!evaluationMutex.acquire(mutexKey)) {
      return res.status(429).json({
        success: false,
        error: 'Diese Antwort wird gerade bewertet. Bitte einen Moment warten.',
      });
    }

    try {
      const answer = loadAnswerStmt.get(answerId, sessionId) as AnswerRow | undefined;
      if (!answer) {
        return res.status(404).json({ success: false, error: 'Antwort nicht gefunden.' });
      }

      // aiConfig is guaranteed non-null here — the guard above returns early if null.
      // We cast explicitly because TypeScript loses the narrowing through the mutex block.
      const { apiKey, meta } = aiConfig as NonNullable<ReturnType<typeof resolveAiConfig>>;
      const scenarioName = answer.scenario_name ?? '';
      const scenarioDescription = answer.scenario_description ?? '';
      const scenarioContext = scenarioName
        ? `Unternehmenskontext: ${scenarioName}${scenarioDescription ? ` — ${scenarioDescription}` : ''}`
        : '';

      const rawExpected = JSON.parse(answer.expected_answer || '{}') as Record<string, unknown>;
      const expectedAnswer = scenarioName
        ? sanitiseExpectedAnswer(rawExpected, scenarioName)
        : rawExpected;

      const taskType = answer.task_type as TaskType;
      let evaluation: Omit<AiEvaluation, 'id' | 'answerId' | 'createdAt'>;

      if (taskType === 'table') {
        evaluation = await assessFreitext(
          {
            taskType: 'table',
            examPart: answer.exam_part as ExamPart,
            questionText: answer.question_text,
            expectedAnswer,
            studentAnswer: answer.text_value ?? '{}',
            maxPoints: answer.max_points,
            topicArea: answer.topic_area,
            scenarioContext,
          },
          apiKey,
          meta,
        );
      } else if (taskType === 'plantuml' || taskType === 'diagram_upload') {
        let imageBase64: string | undefined;
        let imageMediaType: string | undefined;

        if (taskType === 'diagram_upload' && answer.diagram_image_path) {
          const buf = fs.readFileSync(answer.diagram_image_path);
          imageBase64 = buf.toString('base64');
          const ext = path.extname(answer.diagram_image_path).toLowerCase();
          imageMediaType =
            ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
        }

        evaluation = await analyzeDiagram(
          {
            diagramType: (answer.diagram_type as DiagramType) ?? 'uml_class',
            taskDescription: answer.question_text,
            expectedElements: JSON.parse(answer.expected_elements ?? '[]'),
            maxPoints: answer.max_points,
            plantUmlCode: taskType === 'plantuml' ? (answer.text_value ?? undefined) : undefined,
            imageBase64,
            imageMediaType,
            scenarioContext,
          },
          apiKey,
          meta,
        );
      } else {
        // freitext, pseudocode, sql, mc, mc_multi
        const studentAnswer =
          taskType === 'mc' || taskType === 'mc_multi'
            ? (answer.selected_mc_option ?? '')
            : (answer.text_value ?? '');

        let mcOptionIds: string[] | undefined;
        if (taskType === 'mc_multi') {
          try {
            const opts = JSON.parse(answer.mc_options ?? '[]') as { id: string }[];
            mcOptionIds = opts.map((o) => o.id);
          } catch {
            mcOptionIds = ['A', 'B', 'C', 'D'];
          }
        }

        evaluation = await assessFreitext(
          {
            taskType,
            examPart: answer.exam_part as ExamPart,
            questionText: answer.question_text,
            expectedAnswer,
            studentAnswer,
            maxPoints: answer.max_points,
            topicArea: answer.topic_area,
            scenarioContext,
            mcOptionIds,
          },
          apiKey,
          meta,
        );
      }

      persistEvaluation(answerId, evaluation, meta.label);
      res.json({ success: true, data: evaluation });

      // Auto-enqueue for spaced repetition — non-critical, must not throw.
      try {
        enqueueForReview(userId, answer.subtask_id, evaluation.percentageScore);
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error('[evaluate]', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'KI-Fehler',
      });
    } finally {
      evaluationMutex.release(mutexKey);
    }
  },
);
