/**
 * evaluationRoutes.ts — AI evaluation of individual answers.
 *
 * POST /api/sessions/:sessionId/answers/:answerId/evaluate
 *
 * Supports freitext, pseudocode, MC, table, plantuml, and diagram_upload.
 * Uses the user's configured AI provider with a rate limit of 100 req/hour.
 *
 * Placeholder policy:
 *   - questionText is already resolved at session start via session_subtask_overrides
 *   - expectedAnswer text fields may still contain {{PLACEHOLDER}} if the AI wrote them
 *     before scenario assignment. These are replaced here using the session's scenario
 *     values, with any remaining unresolved {{...}} stripped before sending to the LLM.
 */
import path from "path";
import fs from "fs";
import { Router, Request, Response } from "express";
import { db } from "../db/database.js";
import { assessFreitext, analyzeDiagram } from "../services/aiService.js";
import { resolveAiConfig } from "./settingsRoutes.js";
import { getUserId, evaluateLimiter } from "./routeHelpers.js";
import type { AiEvaluation, DiagramType, TaskType, ExamPart } from "../types/index.js";

export const evaluationRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Replace {{PLACEHOLDER}} tokens using session scenario values. */
function applyScenarioToText(
  text: string,
  scenarioName: string,
  scenarioDescription: string,
): string {
  // We only have name and description available from the session row.
  // Strip any remaining tokens that can't be resolved.
  return text
    .replace(/\{\{UNTERNEHMEN\}\}/g, scenarioName)
    .replace(/\{\{[A-Z_]+\}\}/g, ""); // strip any unresolvable tokens
}

/**
 * Walk all string values in an object and apply scenario replacement + placeholder stripping.
 * Returns a new object — does not mutate the original.
 */
function sanitiseExpectedAnswer(
  raw: Record<string, unknown>,
  scenarioName: string,
  scenarioDescription: string,
): Record<string, unknown> {
  function walk(value: unknown): unknown {
    if (typeof value === "string") {
      return applyScenarioToText(value, scenarioName, scenarioDescription);
    }
    if (Array.isArray(value)) return value.map(walk);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, walk(v)]),
      );
    }
    return value;
  }
  return walk(raw) as Record<string, unknown>;
}

// ─── POST /api/sessions/:sessionId/answers/:answerId/evaluate ────────────────

evaluationRouter.post(
  "/:sessionId/answers/:answerId/evaluate",
  evaluateLimiter,
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const aiConfig = resolveAiConfig(userId);
    if (!aiConfig)
      return res.status(500).json({
        success: false,
        error: "Kein API-Key konfiguriert. Bitte in den Einstellungen hinterlegen.",
      });

    const { apiKey, meta } = aiConfig;

    // Load answer + subtask info.
    // questionText comes from session_subtask_overrides (placeholder-resolved at exam start).
    // expected_answer may still contain {{PLACEHOLDER}} — sanitised below.
    const answer = db
      .prepare(
        `SELECT a.*,
                st.task_type,
                COALESCE(sso.question_text, st.question_text) AS question_text,
                st.expected_answer,
                st.points AS max_points, st.diagram_type, st.expected_elements,
                st.mc_options,
                s.part AS exam_part, t.topic_area,
                s.scenario_name, s.scenario_description
         FROM answers a
         JOIN subtasks st ON st.id = a.subtask_id
         JOIN tasks t ON t.id = st.task_id
         JOIN exam_sessions s ON s.id = a.session_id
         LEFT JOIN session_subtask_overrides sso
           ON sso.session_id = a.session_id AND sso.subtask_id = a.subtask_id
         WHERE a.id = ? AND a.session_id = ?`,
      )
      .get(req.params.answerId, req.params.sessionId) as Record<string, unknown> | undefined;

    if (!answer)
      return res.status(404).json({ success: false, error: "Antwort nicht gefunden." });

    const scenarioName = (answer.scenario_name as string) ?? "";
    const scenarioDescription = (answer.scenario_description as string) ?? "";

    // Build scenario context string used in AI system prompt
    const scenarioContext = scenarioName
      ? `Unternehmenskontext: ${scenarioName}${scenarioDescription ? ` — ${scenarioDescription}` : ""}`
      : "";

    // Parse and sanitise expected_answer — replace {{PLACEHOLDER}} and strip leftovers
    const rawExpected = JSON.parse((answer.expected_answer as string) ?? "{}");
    const expectedAnswer = scenarioName
      ? sanitiseExpectedAnswer(rawExpected, scenarioName, scenarioDescription)
      : rawExpected;

    try {
      let evaluation: Omit<AiEvaluation, "id" | "answerId" | "createdAt">;
      const taskType = answer.task_type as string;

      if (taskType === "table") {
        evaluation = await assessFreitext(
          {
            taskType: "table" as TaskType,
            examPart: answer.exam_part as ExamPart,
            questionText: answer.question_text as string,
            expectedAnswer,
            studentAnswer: (answer.text_value as string) ?? "{}",
            maxPoints: answer.max_points as number,
            topicArea: answer.topic_area as string | undefined,
            scenarioContext,
          },
          apiKey,
          meta,
        );
      } else if (taskType === "plantuml" || taskType === "diagram_upload") {
        let imageBase64: string | undefined;
        let imageMediaType: string | undefined;

        if (taskType === "diagram_upload" && answer.diagram_image_path) {
          const buf = fs.readFileSync(answer.diagram_image_path as string);
          imageBase64 = buf.toString("base64");
          const ext = path.extname(answer.diagram_image_path as string).toLowerCase();
          imageMediaType =
            ext === ".png" ? "image/png" : ext === ".gif" ? "image/gif" : "image/jpeg";
        }

        evaluation = await analyzeDiagram(
          {
            diagramType: (answer.diagram_type as DiagramType) ?? "uml_class",
            taskDescription: answer.question_text as string,
            expectedElements: JSON.parse((answer.expected_elements as string) ?? "[]"),
            maxPoints: answer.max_points as number,
            plantUmlCode: taskType === "plantuml" ? (answer.text_value as string) : undefined,
            imageBase64,
            imageMediaType,
            scenarioContext,
          },
          apiKey,
          meta,
        );
      } else {
        // freitext, pseudocode, sql, mc, mc_multi.
        // MC types use selected_mc_option; mc_multi stores a JSON array there.
        // MC/MC-Multi dispatch to local scoring (no LLM call).
        const studentAnswer =
          taskType === "mc" || taskType === "mc_multi"
            ? ((answer.selected_mc_option as string) ?? "")
            : ((answer.text_value as string) ?? "");

        // mc_multi needs the list of presented option IDs for scoring.
        let mcOptionIds: string[] | undefined;
        if (taskType === "mc_multi") {
          try {
            const opts = JSON.parse(
              (answer.mc_options as string) ?? "[]",
            ) as { id: string }[];
            mcOptionIds = opts.map((o) => o.id);
          } catch {
            mcOptionIds = ["A", "B", "C", "D"];
          }
        }

        evaluation = await assessFreitext(
          {
            taskType: taskType as TaskType,
            examPart: answer.exam_part as ExamPart,
            questionText: answer.question_text as string,
            expectedAnswer,
            studentAnswer,
            maxPoints: answer.max_points as number,
            topicArea: answer.topic_area as string | undefined,
            scenarioContext,
            mcOptionIds,
          },
          apiKey,
          meta,
        );
      }

      db.prepare(
        `INSERT INTO ai_evaluations (
          answer_id, awarded_points, max_points, percentage_score, ihk_grade,
          feedback_text, criterion_scores, key_mistakes, improvement_hints,
          detected_elements, missing_elements, notation_errors, model_used, ai_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(answer_id) DO UPDATE SET
          awarded_points=excluded.awarded_points, max_points=excluded.max_points,
          percentage_score=excluded.percentage_score, ihk_grade=excluded.ihk_grade,
          feedback_text=excluded.feedback_text, criterion_scores=excluded.criterion_scores,
          key_mistakes=excluded.key_mistakes, improvement_hints=excluded.improvement_hints,
          detected_elements=excluded.detected_elements, missing_elements=excluded.missing_elements,
          notation_errors=excluded.notation_errors, model_used=excluded.model_used,
          ai_agent=excluded.ai_agent, created_at=datetime('now')`,
      ).run(
        req.params.answerId,
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
        meta.label,
      );

      res.json({ success: true, data: evaluation });
    } catch (err) {
      console.error("[evaluate]", err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : "KI-Fehler",
      });
    }
  },
);
