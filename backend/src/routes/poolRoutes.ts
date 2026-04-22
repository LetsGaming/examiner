/**
 * poolRoutes.ts — Task pool management and exam start.
 *
 * GET  /api/exams/pool-status  — pool counts per specialty
 * POST /api/exams/generate     — generate new tasks into pool
 * POST /api/exams/start        — assemble and start an exam session
 */
import { randomUUID } from "crypto";
import { Router, Request, Response } from "express";
import {
  db,
  assembleExam,
  canAssembleExam,
  GENERATE_COUNT,
} from "../db/database.js";
import { generateTasksForPool, applyScenario } from "../services/examGenerator.js";
import type { TaskWarning } from "../services/examGenerator.js";
import type { Specialty, ExamPart } from "../types/index.js";
import { resolveAiConfig, resolveServerAiConfig } from "./settingsRoutes.js";
import {
  getUserId,
  generateLimiter,
  insertTasksIntoDB,
  ensurePoolSize,
  refillPoolInBackground,
  activeStarts,
  MAX_CONCURRENT_STARTS,
  incrementActiveStarts,
  decrementActiveStarts,
} from "./routeHelpers.js";

export const poolRouter = Router();

const VALID_PARTS  = ["teil_1", "teil_2", "teil_3"] as const;
const VALID_SPECS  = ["fiae", "fisi"] as const;

const PART_LABELS: Record<string, string> = {
  teil_1: "Planen eines Softwareproduktes",
  teil_2: "Entwicklung und Umsetzung von Algorithmen",
  teil_3: "Wirtschafts- und Sozialkunde",
};
const DURATIONS: Record<string, number> = { teil_1: 90, teil_2: 90, teil_3: 60 };

// ─── GET /api/exams/pool-status ───────────────────────────────────────────────

poolRouter.get("/pool-status", (req: Request, res: Response) => {
  const specialty = (req.query.specialty as string) ?? "fiae";
  if (!VALID_SPECS.includes(specialty as Specialty))
    return res.status(400).json({ success: false, error: "Ungültige Fachrichtung." });

  const status = (["teil_1", "teil_2", "teil_3"] as const).map((part) => {
    const total = (db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE part = ? AND specialty = ?").get(part, specialty) as { cnt: number }).cnt;
    return { part, total, canAssemble: canAssembleExam(part, specialty), sufficient: total >= 4 };
  });
  res.json({ success: true, data: { parts: status } });
});

// ─── POST /api/exams/generate ─────────────────────────────────────────────────

poolRouter.post("/generate", generateLimiter, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const aiConfig = resolveAiConfig(userId);
  if (!aiConfig)
    return res.status(500).json({ success: false, error: "Kein API-Key konfiguriert. Bitte in den Einstellungen hinterlegen." });

  const { part, count = 4, specialty: specialtyRaw = "fiae" } = req.body;
  const specialty = specialtyRaw as Specialty;

  if (!VALID_PARTS.includes(part)) return res.status(400).json({ success: false, error: "Ungültiger Teil." });
  if (!VALID_SPECS.includes(specialty)) return res.status(400).json({ success: false, error: "Ungültige Fachrichtung." });

  const { apiKey, meta: aiMeta } = aiConfig;
  const serverConfig = aiConfig.source === "user" ? resolveServerAiConfig() : null;

  try {
    const genCount = Math.min(count, GENERATE_COUNT[part] ?? 8);
    const genResult = await generateTasksForPool(part as ExamPart, genCount, apiKey, aiMeta, serverConfig?.apiKey ?? null, serverConfig?.meta ?? null, specialty);
    await insertTasksIntoDB(part, genResult.tasks, specialty);

    const newTotal = (db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE part = ? AND specialty = ?").get(part, specialty) as { cnt: number }).cnt;
    const response: Record<string, unknown> = { added: genResult.tasks.length, poolSize: newTotal };
    if (genResult.warnings.length > 0) {
      response.warnings = genResult.warnings.map((w: TaskWarning) => ({ topic: w.topic, source: w.source, message: w.message }));
    }
    res.status(201).json({ success: true, data: response });
  } catch (err) {
    console.error("[generate]", err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Fehler" });
  }
});

// ─── POST /api/exams/start ────────────────────────────────────────────────────

poolRouter.post("/start", async (req: Request, res: Response) => {
  const { part, specialty: specialtyRaw = "fiae" } = req.body;
  const specialty = specialtyRaw as Specialty;

  if (!VALID_PARTS.includes(part)) return res.status(400).json({ success: false, error: "Ungültiger Teil." });
  if (!VALID_SPECS.includes(specialty)) return res.status(400).json({ success: false, error: "Ungültige Fachrichtung." });

  if (activeStarts >= MAX_CONCURRENT_STARTS)
    return res.status(429).json({ success: false, error: "Eine Prüfung wird gerade gestartet. Bitte einen Moment warten." });

  incrementActiveStarts();
  const userId = getUserId(req);
  const aiConfig = resolveAiConfig(userId);
  const serverConfig = aiConfig?.source === "user" ? resolveServerAiConfig() : null;

  if (!canAssembleExam(part, specialty)) {
    if (!aiConfig) {
      decrementActiveStarts();
      return res.status(422).json({ success: false, error: "Pool leer und kein API-Key konfiguriert.", needsGeneration: true });
    }
    try {
      await ensurePoolSize(part, aiConfig.apiKey, aiConfig.meta, serverConfig?.apiKey ?? null, serverConfig?.meta ?? null, specialty);
    } catch (err) {
      decrementActiveStarts();
      return res.status(500).json({ success: false, error: `Pool-Generierung fehlgeschlagen: ${err instanceof Error ? err.message : err}` });
    }
  }

  const assembled = assembleExam(part, specialty);
  if (!assembled) {
    decrementActiveStarts();
    return res.status(422).json({ success: false, error: "Nicht genug Aufgaben im Pool.", needsGeneration: true });
  }

  const scenario = (assembled as Record<string, unknown>)._scenario as Parameters<typeof applyScenario>[1] | undefined;
  const sessionId = randomUUID().replace(/-/g, "");
  const title = `AP2 ${PART_LABELS[part]} — ${new Date().toLocaleDateString("de-DE")}`;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO exam_sessions (id, user_id, part, specialty, title, scenario_name, scenario_description, duration_minutes, max_points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, userId, part, specialty, title, assembled.scenarioName, assembled.scenarioDescription, DURATIONS[part], assembled.totalPoints);

    for (let i = 0; i < assembled.tasks.length; i++) {
      const task = assembled.tasks[i];
      db.prepare(`INSERT INTO session_tasks (session_id, task_id, position) VALUES (?, ?, ?)`).run(sessionId, task.id, i + 1);
      db.prepare("UPDATE tasks SET times_used = times_used + 1 WHERE id = ?").run(task.id);

      if (scenario) {
        const subtasks = db
          .prepare("SELECT id, question_text, expected_answer FROM subtasks WHERE task_id = ?")
          .all(task.id as string) as { id: string; question_text: string; expected_answer: string }[];

        for (const st of subtasks) {
          const resolvedQuestion = applyScenario(st.question_text, scenario);

          // Also apply scenario to expected_answer text fields (MC explanation, keyPoints, etc.)
          // so the LLM and gradeMcAnswer receive company-specific context, not raw {{PLACEHOLDERS}}.
          let resolvedExpected: string | undefined;
          try {
            const parsed = JSON.parse(st.expected_answer || "{}") as Record<string, unknown>;
            const replaced = JSON.parse(
              applyScenario(JSON.stringify(parsed), scenario),
            ) as Record<string, unknown>;
            // Only store if something changed
            if (JSON.stringify(replaced) !== JSON.stringify(parsed)) {
              resolvedExpected = JSON.stringify(replaced);
            }
          } catch {
            // non-JSON expected_answer — skip
          }

          if (resolvedQuestion !== st.question_text || resolvedExpected) {
            db.prepare(
              `INSERT OR REPLACE INTO session_subtask_overrides (session_id, subtask_id, question_text)
               VALUES (?, ?, ?)`,
            ).run(sessionId, st.id, resolvedQuestion);
          }

          // Store resolved expected_answer in a separate column if the table supports it
          // (if not, the evaluationRoutes sanitiser handles it at eval time)
          if (resolvedExpected) {
            try {
              db.prepare(
                `UPDATE subtasks SET expected_answer = ? WHERE id = ? AND NOT EXISTS (
                   SELECT 1 FROM session_tasks WHERE task_id = ? AND session_id != ?
                 )`,
              ).run(resolvedExpected, st.id, task.id, sessionId);
              // Note: this only updates when the subtask belongs to exactly this session,
              // preventing cross-session contamination of shared pool tasks.
            } catch {
              // Column or constraint issue — evaluationRoutes will sanitise at runtime
            }
          }
        }
      }
    }
  })();

  if (aiConfig) {
    refillPoolInBackground(part, aiConfig.apiKey ?? "", aiConfig.meta, serverConfig?.apiKey ?? null, serverConfig?.meta ?? null, specialty).catch(() => {});
  }

  decrementActiveStarts();
  res.status(201).json({ success: true, data: { sessionId } });
});
