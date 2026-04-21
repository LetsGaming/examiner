import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import {
  db,
  assembleExam,
  canAssembleExam,
  REQUIRED_TASKS,
  GENERATE_COUNT,
} from "../db/database.js";
import { assessFreitext, analyzeDiagram } from "../services/aiService.js";
import {
  generateTasksForPool,
  applyScenario,
} from "../services/examGenerator.js";
import type {
  AiEvaluation,
  DiagramType,
  TaskType,
  ExamPart,
} from "../types/index.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import rateLimit from "express-rate-limit";

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Zu viele Generierungsanfragen. Bitte warte eine Stunde.",
  },
});

const evaluateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Zu viele Bewertungsanfragen. Bitte warte eine Stunde.",
  },
});

// ─── Concurrency Lock ────────────────────────────────────────────────────────
// Verhindert dass mehrere gleichzeitige Requests denselben Pool generieren
// oder mehrere Sessions parallel gestartet werden.
// Node.js ist single-threaded, aber async-Lücken erlauben Race Conditions.

const generatingParts = new Set<string>(); // welche Teile gerade generiert werden
let activeStarts = 0; // gleichzeitige /start Requests
const MAX_CONCURRENT_STARTS = 1; // nur 1 gleichzeitiger Start

// ─── Upload ───────────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.resolve(process.cwd(), "data", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      cb(
        null,
        `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`,
      );
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

function getUserId(req: Request): string {
  return (req as unknown as { userId?: string }).userId ?? "local-user";
}

// ─── Pool-Aufstockung ─────────────────────────────────────────────────────────
// FIX: Generiert neue Tasks wenn Pool zu klein ist, BEVOR eine Prüfung zusammengestellt wird.
// Läuft auch asynchron im Hintergrund um den Pool nach jeder Nutzung wieder aufzufüllen.

async function ensurePoolSize(part: string, apiKey: string): Promise<void> {
  // Lock: verhindert dass zwei Requests gleichzeitig für denselben Teil generieren
  if (generatingParts.has(part)) {
    console.log(`[pool] ${part}: Generierung läuft bereits, warte...`);
    // Warte bis der laufende Generate-Prozess fertig ist (max 120s)
    const deadline = Date.now() + 120_000;
    while (generatingParts.has(part) && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
    }
    return;
  }

  const current = (
    db
      .prepare("SELECT COUNT(*) as cnt FROM tasks WHERE part = ?")
      .get(part) as { cnt: number }
  ).cnt;
  const needed = REQUIRED_TASKS[part] ?? 4;
  const genCount = GENERATE_COUNT[part] ?? 8;

  if (current >= needed) return;

  generatingParts.add(part);
  try {
    console.log(
      `[pool] ${part}: ${current} Tasks — generiere ${genCount} neue...`,
    );
    const newTasks = await generateTasksForPool(
      part as ExamPart,
      genCount,
      apiKey,
    );
    await insertTasksIntoDB(part, newTasks);
    console.log(`[pool] ${part}: ${newTasks.length} neue Tasks hinzugefügt`);
  } finally {
    generatingParts.delete(part);
  }
}

async function refillPoolInBackground(
  part: string,
  apiKey: string,
): Promise<void> {
  // Lock: Hintergrund-Refill nicht starten wenn bereits aktiv
  if (generatingParts.has(part)) return;

  try {
    const current = (
      db
        .prepare("SELECT COUNT(*) as cnt FROM tasks WHERE part = ?")
        .get(part) as { cnt: number }
    ).cnt;
    const target = (REQUIRED_TASKS[part] ?? 4) * 3;
    const genCount = GENERATE_COUNT[part] ?? 8;
    if (current >= target) return;

    generatingParts.add(part);
    console.log(
      `[pool-refill] ${part}: ${current}/${target} — generiere ${genCount} Tasks im Hintergrund`,
    );
    const newTasks = await generateTasksForPool(
      part as ExamPart,
      genCount,
      apiKey,
    );
    await insertTasksIntoDB(part, newTasks);
    console.log(
      `[pool-refill] ${part}: +${newTasks.length} Tasks, Pool jetzt ${current + newTasks.length}`,
    );
  } catch (err) {
    console.warn("[pool-refill] Fehler (ignoriert):", err);
  } finally {
    generatingParts.delete(part);
  }
}

type GeneratedTask = Awaited<ReturnType<typeof generateTasksForPool>>[0];

async function insertTasksIntoDB(
  part: string,
  tasks: GeneratedTask[],
): Promise<void> {
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, part, topic_area, points_value, difficulty, scenario_context, scenario_description)
    VALUES (?, ?, ?, ?, ?, null, null)
  `);
  const insertSubtask = db.prepare(`
    INSERT INTO subtasks (id, task_id, label, task_type, question_text,
                          expected_answer, points, diagram_type,
                          expected_elements, mc_options, table_config, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const task of tasks) {
      const taskId = randomUUID().replace(/-/g, "");
      insertTask.run(
        taskId,
        part,
        task.topicArea,
        task.pointsValue,
        task.difficulty ?? "medium",
      );
      for (let i = 0; i < task.subtasks.length; i++) {
        const st = task.subtasks[i];
        insertSubtask.run(
          randomUUID().replace(/-/g, ""),
          taskId,
          st.label,
          st.taskType,
          st.questionText,
          JSON.stringify(st.expectedAnswer ?? {}),
          st.points,
          st.diagramType ?? null,
          JSON.stringify(st.expectedElements ?? []),
          JSON.stringify(st.mcOptions ?? []),
          st.tableConfig ? JSON.stringify(st.tableConfig) : null,
          i,
        );
      }
    }
  })();
}

// ─── examRouter ───────────────────────────────────────────────────────────────
export const examRouter = Router();

// GET /api/exams/pool-status
examRouter.get("/pool-status", (_req, res: Response) => {
  const POOL_MIN = REQUIRED_TASKS;
  const status = ["teil_1", "teil_2", "teil_3"].map((part) => {
    const total = (
      db
        .prepare("SELECT COUNT(*) as cnt FROM tasks WHERE part = ?")
        .get(part) as { cnt: number }
    ).cnt;
    return {
      part,
      total,
      canAssemble: canAssembleExam(part),
      sufficient: total >= (POOL_MIN[part] ?? 4),
    };
  });
  res.json({ success: true, data: { parts: status } });
});

// POST /api/exams/generate
examRouter.post(
  "/generate",
  generateLimiter,
  async (req: Request, res: Response) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
      return res
        .status(500)
        .json({ success: false, error: "OPENAI_API_KEY nicht konfiguriert." });

    const { part, count = 4 } = req.body;
    if (!["teil_1", "teil_2", "teil_3"].includes(part))
      return res
        .status(400)
        .json({ success: false, error: "Ungültiger Teil." });

    try {
      const genCount = Math.min(count, GENERATE_COUNT[part] ?? 8);
      const newTasks = await generateTasksForPool(
        part as ExamPart,
        genCount,
        apiKey,
      );
      await insertTasksIntoDB(part, newTasks);

      const newTotal = (
        db
          .prepare("SELECT COUNT(*) as cnt FROM tasks WHERE part = ?")
          .get(part) as { cnt: number }
      ).cnt;
      res
        .status(201)
        .json({
          success: true,
          data: { added: newTasks.length, poolSize: newTotal },
        });
    } catch (err) {
      console.error("[generate]", err);
      res
        .status(500)
        .json({
          success: false,
          error: err instanceof Error ? err.message : "Fehler",
        });
    }
  },
);

// POST /api/exams/start
// FIX: Automatisch neue Aufgaben generieren wenn Pool zu klein ist.
// FIX: Szenario wird beim Start gewählt und Platzhalter in Subtask-Texten ersetzt.
examRouter.post("/start", async (req: Request, res: Response) => {
  const { part } = req.body;
  if (!["teil_1", "teil_2", "teil_3"].includes(part))
    return res.status(400).json({ success: false, error: "Ungültiger Teil." });

  // Concurrency-Lock: max 1 gleichzeitiger Start (verhindert Race Conditions beim Pool)
  if (activeStarts >= MAX_CONCURRENT_STARTS) {
    return res.status(429).json({
      success: false,
      error: "Eine Prüfung wird gerade gestartet. Bitte einen Moment warten.",
    });
  }
  activeStarts++;

  const apiKey = process.env.OPENAI_API_KEY;
  const userId = getUserId(req);

  // FIX: Automatisch Pool auffüllen wenn nötig (auch beim ersten Aufruf)
  if (!canAssembleExam(part)) {
    if (!apiKey) {
      activeStarts--;
      return res.status(422).json({
        success: false,
        error: "Pool leer und OPENAI_API_KEY nicht konfiguriert.",
        needsGeneration: true,
      });
    }
    try {
      await ensurePoolSize(part, apiKey);
    } catch (err) {
      activeStarts--;
      return res
        .status(500)
        .json({
          success: false,
          error: `Pool-Generierung fehlgeschlagen: ${err instanceof Error ? err.message : err}`,
        });
    }
  }

  const assembled = assembleExam(part);
  if (!assembled) {
    activeStarts--;
    return res
      .status(422)
      .json({
        success: false,
        error: "Nicht genug Aufgaben im Pool.",
        needsGeneration: true,
      });
  }

  // FIX: Szenario aus assembleExam extrahieren für Platzhalter-Ersetzung
  const scenario = (assembled as Record<string, unknown>)._scenario as
    | Parameters<typeof applyScenario>[1]
    | undefined;

  const PART_LABELS: Record<string, string> = {
    teil_1: "Planen eines Softwareproduktes",
    teil_2: "Entwicklung und Umsetzung von Algorithmen",
    teil_3: "Wirtschafts- und Sozialkunde",
  };
  const DURATIONS: Record<string, number> = {
    teil_1: 90,
    teil_2: 90,
    teil_3: 60,
  };

  const sessionId = randomUUID().replace(/-/g, "");
  const title = `AP2 ${PART_LABELS[part]} — ${new Date().toLocaleDateString("de-DE")}`;

  db.transaction(() => {
    db.prepare(
      `
      INSERT INTO exam_sessions (id, user_id, part, title, scenario_name, scenario_description, duration_minutes, max_points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      sessionId,
      userId,
      part,
      title,
      assembled.scenarioName,
      assembled.scenarioDescription,
      DURATIONS[part],
      assembled.totalPoints,
    );

    for (let i = 0; i < assembled.tasks.length; i++) {
      const task = assembled.tasks[i];
      db.prepare(
        `INSERT INTO session_tasks (session_id, task_id, position) VALUES (?, ?, ?)`,
      ).run(sessionId, task.id, i + 1);
      db.prepare(
        "UPDATE tasks SET times_used = times_used + 1 WHERE id = ?",
      ).run(task.id);

      // FIX: Platzhalter in Subtask-Texten ersetzen und in der Session speichern
      if (scenario) {
        const subtasks = db
          .prepare("SELECT id, question_text FROM subtasks WHERE task_id = ?")
          .all(task.id as string) as { id: string; question_text: string }[];
        for (const st of subtasks) {
          const resolved = applyScenario(st.question_text, scenario);
          if (resolved !== st.question_text) {
            // Wir klonen den Subtask für diese Session — gespeichert als session-spezifischer Override
            // Einfachste Lösung: question_text direkt in answers-Metadaten nicht, stattdessen
            // speichern wir eine session-spezifische Kopie der Subtask-Texte in der DB
            db.prepare(
              `
              INSERT OR IGNORE INTO session_subtask_overrides (session_id, subtask_id, question_text)
              VALUES (?, ?, ?)
            `,
            ).run(sessionId, st.id, resolved);
          }
        }
      }
    }
  })();

  // FIX: Pool im Hintergrund auffüllen nach Nutzung (feuern und vergessen)
  if (apiKey) {
    refillPoolInBackground(part, apiKey).catch(() => {
      /* ignorieren */
    });
  }

  activeStarts--;
  res.status(201).json({ success: true, data: { sessionId } });
});

// ─── sessionRouter ────────────────────────────────────────────────────────────
export const sessionRouter = Router();

function loadSession(sessionId: string) {
  const session = db
    .prepare(
      `
    SELECT id, user_id, part, title, scenario_name, scenario_description,
           duration_minutes, max_points, started_at, submitted_at, status,
           total_score, ihk_grade
    FROM exam_sessions WHERE id = ?
  `,
    )
    .get(sessionId) as Record<string, unknown> | undefined;
  if (!session) return null;

  // Session-spezifische Overrides laden (Platzhalter-ersetzt)
  const overrides = new Map<string, string>();
  const overrideRows = db
    .prepare(
      `
    SELECT subtask_id, question_text FROM session_subtask_overrides WHERE session_id = ?
  `,
    )
    .all(sessionId) as { subtask_id: string; question_text: string }[];
  for (const row of overrideRows)
    overrides.set(row.subtask_id, row.question_text);

  const rawTasks = db
    .prepare(
      `
    SELECT t.id, t.topic_area, st_join.position
    FROM session_tasks st_join
    JOIN tasks t ON t.id = st_join.task_id
    WHERE st_join.session_id = ?
    ORDER BY st_join.position ASC
  `,
    )
    .all(sessionId) as { id: string; topic_area: string; position: number }[];

  const tasks = rawTasks.map((t) => {
    const subtasks = db
      .prepare(
        `
      SELECT id, label, task_type, question_text, points,
             diagram_type, expected_elements, mc_options, table_config, position
      FROM subtasks WHERE task_id = ? ORDER BY position ASC
    `,
      )
      .all(t.id) as Record<string, unknown>[];

    const totalPts = subtasks.reduce((s, st) => s + (st.points as number), 0);

    return {
      id: t.id,
      position: t.position,
      topicArea: t.topic_area,
      maxPoints: totalPts,
      subtasks: subtasks.map((st) => ({
        id: st.id,
        label: st.label,
        taskType: st.task_type,
        // FIX: Override-Text verwenden wenn vorhanden (Platzhalter ersetzt)
        questionText: overrides.get(st.id as string) ?? st.question_text,
        points: st.points,
        diagramType: st.diagram_type ?? null,
        expectedElements: JSON.parse((st.expected_elements as string) ?? "[]"),
        mcOptions: JSON.parse((st.mc_options as string) ?? "[]"),
        tableConfig: st.table_config
          ? JSON.parse(st.table_config as string)
          : null,
      })),
    };
  });

  const answers = db
    .prepare(
      `
    SELECT a.id, a.subtask_id, a.text_value, a.selected_mc_option,
           a.diagram_image_path, a.answered_at,
           ae.awarded_points, ae.max_points, ae.percentage_score,
           ae.ihk_grade, ae.feedback_text, ae.criterion_scores,
           ae.key_mistakes, ae.improvement_hints,
           ae.detected_elements, ae.missing_elements, ae.notation_errors,
           ae.model_used
    FROM answers a
    LEFT JOIN ai_evaluations ae ON ae.answer_id = a.id
    WHERE a.session_id = ?
  `,
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
            improvementHints: JSON.parse(
              (a.improvement_hints as string) ?? "[]",
            ),
            detectedElements: JSON.parse(
              (a.detected_elements as string) ?? "[]",
            ),
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

sessionRouter.get("/:sessionId", (req: Request, res: Response) => {
  const data = loadSession(req.params.sessionId as string);
  if (!data)
    return res
      .status(404)
      .json({ success: false, error: "Session nicht gefunden." });
  res.json({ success: true, data });
});

// PUT /api/sessions/:sessionId/answers/:subtaskId
sessionRouter.put(
  "/:sessionId/answers/:subtaskId",
  (req: Request, res: Response) => {
    const { textValue, selectedMcOption } = req.body;
    const { sessionId, subtaskId } = req.params;

    const existing = db
      .prepare("SELECT id FROM answers WHERE session_id = ? AND subtask_id = ?")
      .get(sessionId, subtaskId) as { id: string } | undefined;

    if (existing) {
      db.prepare(
        `
      UPDATE answers SET text_value = ?, selected_mc_option = ?, answered_at = datetime('now')
      WHERE id = ?
    `,
      ).run(textValue ?? "", selectedMcOption ?? null, existing.id);
      return res.json({ success: true, data: { answerId: existing.id } });
    }

    const result = db
      .prepare(
        `
    INSERT INTO answers (session_id, subtask_id, text_value, selected_mc_option)
    VALUES (?, ?, ?, ?)
  `,
      )
      .run(sessionId, subtaskId, textValue ?? "", selectedMcOption ?? null);

    const newAnswer = db
      .prepare("SELECT id FROM answers WHERE rowid = ?")
      .get(result.lastInsertRowid) as { id: string };
    res.status(201).json({ success: true, data: { answerId: newAnswer.id } });
  },
);

// POST /api/sessions/:sessionId/answers/:subtaskId/upload
sessionRouter.post(
  "/:sessionId/answers/:subtaskId/upload",
  upload.single("diagram"),
  (req: Request, res: Response) => {
    if (!req.file)
      return res.status(400).json({ success: false, error: "Keine Datei." });
    const { sessionId, subtaskId } = req.params;
    const imagePath = req.file.path;

    const existing = db
      .prepare("SELECT id FROM answers WHERE session_id = ? AND subtask_id = ?")
      .get(sessionId, subtaskId) as { id: string } | undefined;

    if (existing) {
      db.prepare("UPDATE answers SET diagram_image_path = ? WHERE id = ?").run(
        imagePath,
        existing.id,
      );
      return res.json({
        success: true,
        data: { answerId: existing.id, imagePath },
      });
    }

    const result = db
      .prepare(
        `
      INSERT INTO answers (session_id, subtask_id, text_value, diagram_image_path)
      VALUES (?, ?, '', ?)
    `,
      )
      .run(sessionId, subtaskId, imagePath);

    const newAnswer = db
      .prepare("SELECT id FROM answers WHERE rowid = ?")
      .get(result.lastInsertRowid) as { id: string };
    res
      .status(201)
      .json({ success: true, data: { answerId: newAnswer.id, imagePath } });
  },
);

// POST /api/sessions/:sessionId/answers/:answerId/evaluate
sessionRouter.post(
  "/:sessionId/answers/:answerId/evaluate",
  evaluateLimiter,
  async (req: Request, res: Response) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
      return res
        .status(500)
        .json({ success: false, error: "OPENAI_API_KEY nicht konfiguriert." });

    const answer = db
      .prepare(
        `
    SELECT a.*, st.task_type, st.question_text, st.expected_answer,
           st.points AS max_points, st.diagram_type, st.expected_elements,
           s.part AS exam_part, t.topic_area
    FROM answers a
    JOIN subtasks st ON st.id = a.subtask_id
    JOIN tasks t ON t.id = st.task_id
    JOIN exam_sessions s ON s.id = a.session_id
    WHERE a.id = ? AND a.session_id = ?
  `,
      )
      .get(req.params.answerId, req.params.sessionId) as
      | Record<string, unknown>
      | undefined;

    if (!answer)
      return res
        .status(404)
        .json({ success: false, error: "Antwort nicht gefunden." });

    try {
      let evaluation: Omit<AiEvaluation, "id" | "answerId" | "createdAt">;
      const isTable = answer.task_type === "table";
      const isDiagram =
        answer.task_type === "plantuml" ||
        answer.task_type === "diagram_upload";

      if (isTable) {
        const studentAnswer = (answer.text_value as string) ?? "{}";
        evaluation = await assessFreitext(
          {
            taskType: "table" as import("../types/index.js").TaskType,
            examPart: answer.exam_part as import("../types/index.js").ExamPart,
            questionText: answer.question_text as string,
            expectedAnswer: JSON.parse(
              (answer.expected_answer as string) ?? "{}",
            ),
            studentAnswer,
            maxPoints: answer.max_points as number,
            topicArea: answer.topic_area as string | undefined,
          },
          apiKey,
        );
      } else if (isDiagram) {
        let imageBase64: string | undefined;
        let imageMediaType: string | undefined;
        if (
          answer.task_type === "diagram_upload" &&
          answer.diagram_image_path
        ) {
          const buf = fs.readFileSync(answer.diagram_image_path as string);
          imageBase64 = buf.toString("base64");
          const ext = path
            .extname(answer.diagram_image_path as string)
            .toLowerCase();
          imageMediaType =
            ext === ".png"
              ? "image/png"
              : ext === ".gif"
                ? "image/gif"
                : "image/jpeg";
        }
        evaluation = await analyzeDiagram(
          {
            diagramType: (answer.diagram_type as DiagramType) ?? "uml_class",
            taskDescription: answer.question_text as string,
            expectedElements: JSON.parse(
              (answer.expected_elements as string) ?? "[]",
            ),
            maxPoints: answer.max_points as number,
            plantUmlCode:
              answer.task_type === "plantuml"
                ? (answer.text_value as string)
                : undefined,
            imageBase64,
            imageMediaType,
          },
          apiKey,
        );
      } else {
        const studentAnswer =
          (answer.task_type as string) === "mc"
            ? ((answer.selected_mc_option as string) ?? "")
            : ((answer.text_value as string) ?? "");
        evaluation = await assessFreitext(
          {
            taskType: answer.task_type as TaskType,
            examPart: answer.exam_part as ExamPart,
            questionText: answer.question_text as string,
            expectedAnswer: JSON.parse(
              (answer.expected_answer as string) ?? "{}",
            ),
            studentAnswer,
            maxPoints: answer.max_points as number,
            topicArea: answer.topic_area as string | undefined,
          },
          apiKey,
        );
      }

      db.prepare(
        `
      INSERT INTO ai_evaluations (
        answer_id, awarded_points, max_points, percentage_score, ihk_grade,
        feedback_text, criterion_scores, key_mistakes, improvement_hints,
        detected_elements, missing_elements, notation_errors, model_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(answer_id) DO UPDATE SET
        awarded_points=excluded.awarded_points, max_points=excluded.max_points,
        percentage_score=excluded.percentage_score, ihk_grade=excluded.ihk_grade,
        feedback_text=excluded.feedback_text, criterion_scores=excluded.criterion_scores,
        key_mistakes=excluded.key_mistakes, improvement_hints=excluded.improvement_hints,
        detected_elements=excluded.detected_elements, missing_elements=excluded.missing_elements,
        notation_errors=excluded.notation_errors, model_used=excluded.model_used,
        created_at=datetime('now')
    `,
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
      );

      res.json({ success: true, data: evaluation });
    } catch (err) {
      console.error("[evaluate]", err);
      res
        .status(500)
        .json({
          success: false,
          error: err instanceof Error ? err.message : "KI-Fehler",
        });
    }
  },
);

// POST /api/sessions/:sessionId/submit
sessionRouter.post("/:sessionId/submit", (req: Request, res: Response) => {
  const session = db
    .prepare(
      `SELECT id, max_points FROM exam_sessions WHERE id = ? AND status = 'in_progress'`,
    )
    .get(req.params.sessionId) as
    | { id: string; max_points: number }
    | undefined;

  if (!session)
    return res
      .status(404)
      .json({ success: false, error: "Aktive Session nicht gefunden." });

  const scoreRow = db
    .prepare(
      `
    SELECT COALESCE(SUM(ae.awarded_points), 0) AS total
    FROM answers a
    LEFT JOIN ai_evaluations ae ON ae.answer_id = a.id
    WHERE a.session_id = ?
  `,
    )
    .get(req.params.sessionId) as { total: number };

  const total = scoreRow.total;
  const percent = Math.round((total / session.max_points) * 100);
  const grade =
    percent >= 92
      ? "sehr_gut"
      : percent >= 81
        ? "gut"
        : percent >= 67
          ? "befriedigend"
          : percent >= 50
            ? "ausreichend"
            : percent >= 30
              ? "mangelhaft"
              : "ungenuegend";

  db.prepare(
    `
    UPDATE exam_sessions SET status='graded', submitted_at=datetime('now'), total_score=?, ihk_grade=?
    WHERE id=?
  `,
  ).run(total, grade, req.params.sessionId);

  res.json({
    success: true,
    data: {
      totalScore: total,
      maxPoints: session.max_points,
      percentageScore: percent,
      ihkGrade: grade,
    },
  });
});
