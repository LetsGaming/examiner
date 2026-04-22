/**
 * secondOpinionRoutes.ts — Zweitbewertung für eine bereits bewertete Antwort.
 */
import path from "path";
import fs from "fs";
import { Router, Request, Response } from "express";
import { db } from "../db/database.js";
import { assessFreitext, analyzeDiagram } from "../services/aiService.js";
import { resolveAiConfig } from "./settingsRoutes.js";
import { getUserId, evaluateLimiter } from "./routeHelpers.js";
import type { TaskType, ExamPart, DiagramType } from "../types/index.js";

export const secondOpinionRouter = Router();

const reEvalCounts = new Map<string, number>();

secondOpinionRouter.post(
  "/:sessionId/answers/:answerId/re-evaluate",
  evaluateLimiter,
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const sessionId = String(req.params.sessionId);
    const answerId = String(req.params.answerId);

    const session = db
      .prepare(`SELECT id, status FROM exam_sessions WHERE id = ? AND user_id = ?`)
      .get(sessionId, userId) as { id: string; status: string } | undefined;

    if (!session) return res.status(404).json({ success: false, error: "Session nicht gefunden." });
    if (session.status === "in_progress")
      return res.status(400).json({ success: false, error: "Zweitbewertung nur nach Abgabe möglich." });

    if ((reEvalCounts.get(sessionId) ?? 0) >= 3)
      return res.status(429).json({ success: false, error: "Maximal 3 Zweitbewertungen pro Session." });

    const aiConfig = resolveAiConfig(userId);
    if (!aiConfig) return res.status(500).json({ success: false, error: "Kein API-Key konfiguriert." });
    const { apiKey, meta } = aiConfig;

    const answer = db
      .prepare(
        `SELECT a.id, a.text_value, a.selected_mc_option, a.diagram_image_path,
                s.task_type, s.question_text, s.expected_answer, s.points,
                s.diagram_type, s.expected_elements,
                t.topic_area, t.part as exam_part,
                es.scenario_description,
                COALESCE(o.question_text, s.question_text) as resolved_question
         FROM answers a
         JOIN subtasks s ON s.id = a.subtask_id
         JOIN tasks t ON t.id = s.task_id
         JOIN exam_sessions es ON es.id = a.session_id
         LEFT JOIN session_subtask_overrides o
           ON o.session_id = a.session_id AND o.subtask_id = a.subtask_id
         WHERE a.id = ? AND a.session_id = ?`,
      )
      .get(answerId, sessionId) as Record<string, unknown> | undefined;

    if (!answer) return res.status(404).json({ success: false, error: "Antwort nicht gefunden." });

    try {
      const taskType = answer.task_type as TaskType;
      const questionText = answer.resolved_question as string;
      let expectedAnswer: Record<string, unknown> = {};
      try { expectedAnswer = JSON.parse(answer.expected_answer as string); } catch { /**/ }

      let evaluation;

      if (taskType === "diagram_upload") {
        const imagePath = answer.diagram_image_path as string;
        if (!imagePath || !fs.existsSync(imagePath))
          return res.status(400).json({ success: false, error: "Kein Diagramm." });
        const imageData = fs.readFileSync(imagePath).toString("base64");
        const ext = path.extname(imagePath).slice(1).toLowerCase();
        let expectedElements: string[] = [];
        try { expectedElements = JSON.parse(answer.expected_elements as string ?? "[]"); } catch { /**/ }
        evaluation = await analyzeDiagram(
          {
            diagramType: (answer.diagram_type as DiagramType) ?? "uml_class",
            taskDescription: questionText,
            expectedElements,
            maxPoints: answer.points as number,
            imageBase64: imageData,
            imageMediaType: ext === "png" ? "image/png" : "image/jpeg",
          },
          apiKey, meta,
        );
      } else {
        const studentAnswer = (taskType === "mc" || taskType === "mc_multi")
          ? (answer.selected_mc_option as string ?? "")
          : (answer.text_value as string ?? "");
        evaluation = await assessFreitext(
          {
            taskType,
            examPart: answer.exam_part as ExamPart,
            questionText,
            expectedAnswer,
            studentAnswer,
            maxPoints: answer.points as number,
            topicArea: answer.topic_area as string,
            scenarioContext: answer.scenario_description as string,
          },
          apiKey, meta,
        );
      }

      db.prepare(
        `INSERT INTO ai_evaluations (
          answer_id, awarded_points, max_points, percentage_score, ihk_grade,
          feedback_text, criterion_scores, key_mistakes, improvement_hints,
          detected_elements, missing_elements, notation_errors, model_used, ai_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'second_opinion')`,
      ).run(
        answerId, evaluation.awardedPoints, evaluation.maxPoints,
        evaluation.percentageScore, evaluation.ihkGrade, evaluation.feedbackText,
        JSON.stringify(evaluation.criterionScores ?? []),
        JSON.stringify(evaluation.keyMistakes ?? []),
        JSON.stringify(evaluation.improvementHints ?? []),
        JSON.stringify((evaluation as any).detectedElements ?? []),
        JSON.stringify((evaluation as any).missingElements ?? []),
        JSON.stringify((evaluation as any).notationErrors ?? []),
        evaluation.modelUsed,
      );

      reEvalCounts.set(sessionId, (reEvalCounts.get(sessionId) ?? 0) + 1);
      res.json({ success: true, data: evaluation });
    } catch (err) {
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : "KI-Fehler" });
    }
  },
);
