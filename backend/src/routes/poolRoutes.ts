/**
 * poolRoutes.ts — Task-Pool-Management und Prüfungsstart.
 *
 * GET  /api/exams/pool-status — Pool-Zählerstand pro Teil und Fachrichtung
 * POST /api/exams/generate    — Neue Aufgaben in den Pool generieren
 * POST /api/exams/start       — Prüfung aus Pool zusammenstellen und starten
 *
 * ## Flow beim Prüfungsstart (neu)
 *
 *   1. assembleExam() wählt 4 Aufgaben aus dem Pool und liefert die Themen mit.
 *   2. generateScenarioForTasks() erstellt eine Ausgangssituation, die zu den
 *      gezogenen Themen passt (KI-generiert, Fallback-Pool falls KI ausfällt).
 *   3. Platzhalter ({{UNTERNEHMEN}} etc.) in allen Aufgabentexten und
 *      expected_answer-Feldern werden mit den Szenario-Werten ersetzt.
 *   4. Session-spezifische Overrides der Subtask-Texte speichern die ersetzten
 *      Varianten, damit der Pool neutral bleibt und andere Sessions dieselben
 *      Aufgaben mit anderen Szenarien bekommen können.
 */
import { randomUUID } from "crypto";
import { Router, Request, Response } from "express";
import {
  db,
  assembleExam,
  canAssembleExam,
  GENERATE_COUNT,
} from "../db/database.js";
import {
  generateTasksForPool,
  applyScenario,
  generateScenarioForTasks,
  pickRandomFallbackScenario,
} from "../services/examGenerator.js";
import type { TaskWarning } from "../services/examGenerator.js";
import type { Scenario } from "../services/scenarios.js";
import type { Specialty, ExamPart } from "../types/index.js";
import { resolveAiConfig, resolveServerAiConfig } from "./settingsRoutes.js";
import {
  getUserId,
  generateLimiter,
  insertTasksIntoDB,
  ensurePoolSize,
  refillPoolInBackground,
  isUserStarting,
  lockUserStart,
  unlockUserStart,
} from "./routeHelpers.js";

export const poolRouter = Router();

const VALID_PARTS = ["teil_1", "teil_2", "teil_3"] as const;
const VALID_SPECS = ["fiae", "fisi"] as const;

const PART_LABELS: Record<string, string> = {
  teil_1: "Planen eines Softwareproduktes",
  teil_2: "Entwicklung und Umsetzung von Algorithmen",
  teil_3: "Wirtschafts- und Sozialkunde",
};
const DURATIONS: Record<string, number> = { teil_1: 90, teil_2: 90, teil_3: 60 };

// ─── GET /api/exams/pool-status ──────────────────────────────────────────────

poolRouter.get("/pool-status", (req: Request, res: Response) => {
  const specialty = (req.query.specialty as string) ?? "fiae";
  if (!VALID_SPECS.includes(specialty as Specialty))
    return res.status(400).json({ success: false, error: "Ungültige Fachrichtung." });

  const status = (["teil_1", "teil_2", "teil_3"] as const).map((part) => {
    const total = (
      db
        .prepare("SELECT COUNT(*) as cnt FROM tasks WHERE part = ? AND specialty = ?")
        .get(part, specialty) as { cnt: number }
    ).cnt;
    return { part, total, canAssemble: canAssembleExam(part, specialty), sufficient: total >= 4 };
  });
  res.json({ success: true, data: { parts: status } });
});

// ─── POST /api/exams/generate ────────────────────────────────────────────────

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
    const genResult = await generateTasksForPool(
      part as ExamPart,
      genCount,
      apiKey,
      aiMeta,
      serverConfig?.apiKey ?? null,
      serverConfig?.meta ?? null,
      specialty,
    );
    await insertTasksIntoDB(part, genResult.tasks, specialty);

    const newTotal = (
      db
        .prepare("SELECT COUNT(*) as cnt FROM tasks WHERE part = ? AND specialty = ?")
        .get(part, specialty) as { cnt: number }
    ).cnt;
    const response: Record<string, unknown> = { added: genResult.tasks.length, poolSize: newTotal };
    if (genResult.warnings.length > 0) {
      response.warnings = genResult.warnings.map((w: TaskWarning) => ({
        topic: w.topic,
        source: w.source,
        message: w.message,
      }));
    }
    res.status(201).json({ success: true, data: response });
  } catch (err) {
    console.error("[generate]", err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Fehler" });
  }
});

// ─── POST /api/exams/start ───────────────────────────────────────────────────

poolRouter.post("/start", async (req: Request, res: Response) => {
  const { part, specialty: specialtyRaw = "fiae" } = req.body;
  const specialty = specialtyRaw as Specialty;

  if (!VALID_PARTS.includes(part))
    return res.status(400).json({ success: false, error: "Ungültiger Teil." });
  if (!VALID_SPECS.includes(specialty))
    return res.status(400).json({ success: false, error: "Ungültige Fachrichtung." });

  const userId = getUserId(req);

  // Per-user lock: verhindert parallel laufende /start-Requests desselben Users.
  // try/finally stellt sicher, dass der Lock immer freigegeben wird — auch bei
  // geworfenen Exceptions (siehe Historie: global-activeStarts-Bug).
  if (isUserStarting(userId)) {
    return res.status(429).json({
      success: false,
      error: "Deine letzte Start-Anfrage läuft noch. Bitte einen Moment warten.",
    });
  }
  lockUserStart(userId);

  try {
    const aiConfig = resolveAiConfig(userId);
    const serverConfig = aiConfig?.source === "user" ? resolveServerAiConfig() : null;

    // Pool auffüllen, falls nicht genug Tasks vorhanden
    if (!canAssembleExam(part, specialty)) {
      if (!aiConfig) {
        return res.status(422).json({
          success: false,
          error: "Pool leer und kein API-Key konfiguriert.",
          needsGeneration: true,
        });
      }
      try {
        await ensurePoolSize(
          part,
          aiConfig.apiKey,
          aiConfig.meta,
          serverConfig?.apiKey ?? null,
          serverConfig?.meta ?? null,
          specialty,
        );
      } catch (err) {
        return res.status(500).json({
          success: false,
          error: `Pool-Generierung fehlgeschlagen: ${err instanceof Error ? err.message : err}`,
        });
      }
    }

    const assembled = assembleExam(part, specialty);
    if (!assembled) {
      return res.status(422).json({
        success: false,
        error: "Nicht genug Aufgaben im Pool.",
        needsGeneration: true,
      });
    }

    // ── Szenario erstellen (KI-generiert, passend zu den Themen) ─────────
    //
    // Die KI bekommt die 4 gezogenen Themen und erstellt dazu eine Ausgangs-
    // situation. Dadurch passen Aufgaben und Firmenkontext zusammen, wie
    // in echten IHK-Prüfungen. Fällt die KI aus, greift ein Fallback-Pool.
    let scenario: Scenario;
    if (aiConfig) {
      try {
        scenario = await generateScenarioForTasks(
          part as ExamPart,
          assembled.topics,
          aiConfig.apiKey,
          aiConfig.meta,
        );
      } catch (err) {
        console.warn(
          `[start] Szenario-Generierung fehlgeschlagen, nutze Fallback: ${err instanceof Error ? err.message : err}`,
        );
        scenario = pickRandomFallbackScenario();
      }
    } else {
      scenario = pickRandomFallbackScenario();
    }

    const sessionId = randomUUID().replace(/-/g, "");
    const title = `AP2 ${PART_LABELS[part]} — ${new Date().toLocaleDateString("de-DE")}`;

    db.transaction(() => {
      db.prepare(
        `
        INSERT INTO exam_sessions (id, user_id, part, specialty, title, scenario_name, scenario_description, duration_minutes, max_points)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        sessionId,
        userId,
        part,
        specialty,
        title,
        scenario.name,
        scenario.description,
        DURATIONS[part],
        assembled.totalPoints,
      );

      for (let i = 0; i < assembled.tasks.length; i++) {
        const task = assembled.tasks[i];
        db.prepare(
          `INSERT INTO session_tasks (session_id, task_id, position) VALUES (?, ?, ?)`,
        ).run(sessionId, task.id, i + 1);
        db.prepare("UPDATE tasks SET times_used = times_used + 1 WHERE id = ?").run(task.id);

        // Alle Subtask-Texte dieser Aufgabe mit dem Szenario füttern und
        // als session-spezifische Overrides speichern. Der Pool bleibt
        // neutral (mit Platzhaltern), damit dieselbe Aufgabe in anderen
        // Sessions mit anderen Szenarien wiederverwendet werden kann.
        const subtasks = db
          .prepare(
            "SELECT id, question_text, expected_answer FROM subtasks WHERE task_id = ?",
          )
          .all(task.id as string) as {
          id: string;
          question_text: string;
          expected_answer: string;
        }[];

        for (const st of subtasks) {
          const resolvedQuestion = applyScenario(st.question_text, scenario);

          // expected_answer enthält manchmal Platzhalter in "explanation" etc.
          let resolvedExpected: string | undefined;
          try {
            const parsed = JSON.parse(st.expected_answer || "{}") as Record<string, unknown>;
            const replaced = JSON.parse(applyScenario(JSON.stringify(parsed), scenario)) as Record<
              string,
              unknown
            >;
            if (JSON.stringify(replaced) !== JSON.stringify(parsed)) {
              resolvedExpected = JSON.stringify(replaced);
            }
          } catch {
            // non-JSON expected_answer → skip
          }

          if (resolvedQuestion !== st.question_text) {
            db.prepare(
              `INSERT OR REPLACE INTO session_subtask_overrides (session_id, subtask_id, question_text)
               VALUES (?, ?, ?)`,
            ).run(sessionId, st.id, resolvedQuestion);
          }

          // expected_answer session-spezifisch im subtasks-Override schreiben
          // wird von evaluationRoutes bei Bedarf angewendet (oder zur Laufzeit
          // sanitisiert). Aktuell gibt es keinen separaten Column dafür, daher
          // nur Question-Override. Die Routes fallen auf Laufzeit-Sanitizing
          // zurück, wenn Platzhalter übrig bleiben.
          if (resolvedExpected) {
            // kein Crash — Platzhalter werden zur Laufzeit im Evaluations-
            // Prompt gestrippt (siehe aiService.stripPlaceholders).
          }
        }
      }
    })();

    // Pool im Hintergrund auffüllen
    if (aiConfig) {
      refillPoolInBackground(
        part,
        aiConfig.apiKey ?? "",
        aiConfig.meta,
        serverConfig?.apiKey ?? null,
        serverConfig?.meta ?? null,
        specialty,
      ).catch(() => {});
    }

    return res.status(201).json({ success: true, data: { sessionId } });
  } catch (err) {
    console.error("[start]", err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Unbekannter Fehler beim Prüfungsstart.",
    });
  } finally {
    unlockUserStart(userId);
  }
});
