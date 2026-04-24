/**
 * poolRoutes.ts — Task pool management and exam start.
 *
 * GET  /api/exams/pool-status — Pool counts per part and specialty
 * POST /api/exams/generate    — Generate new tasks into the pool
 * POST /api/exams/start       — Assemble an exam from the pool and start a session
 *
 * ## Exam start flow
 *
 *   1. `assembleExam()` selects 4 tasks from the pool inside a read transaction,
 *      returning the selected task IDs and their topics.
 *   2. `generateScenarioForTasks()` uses those topics to create a matching
 *      scenario (AI-generated, with a fallback pool if the AI fails).
 *   3. A write transaction atomically inserts exam_sessions + session_tasks,
 *      using the IDs from step 1.  Because SQLite is single-writer and the
 *      IDs were locked inside a transaction in step 1, no FK violation can
 *      occur between steps 1 and 3 — admin deletes are blocked by the
 *      session_tasks foreign key check in adminRoutes.
 *   4. Scenario placeholders are stored as session_subtask_overrides so the
 *      pool tasks stay neutral and reusable across sessions.
 *
 * ## Concurrency
 *
 *   Per-user examStartMutex prevents two concurrent /start requests from the
 *   same user racing each other.
 */
import { randomUUID } from 'crypto';
import { Router, Request, Response } from 'express';
import { db, assembleExam, canAssembleExam, GENERATE_COUNT } from '../db/database.js';
import {
  generateTasksForPool,
  applyScenario,
  generateScenarioForTasks,
  pickRandomFallbackScenario,
} from '../services/examGenerator.js';
import type { TaskWarning } from '../services/examGenerator.js';
import type { Scenario } from '../services/scenarios.js';
import type { Specialty, ExamPart } from '../types/index.js';
import { resolveAiConfig, resolveServerAiConfig } from './settingsRoutes.js';
import {
  getUserId,
  generateLimiter,
  insertTasksIntoDB,
  ensurePoolSize,
  refillPoolInBackground,
  examStartMutex,
  findUnderrepresentedKinds,
} from './routeHelpers.js';
import { pickTopicsByKinds } from '../services/topics.js';

export const poolRouter = Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_PARTS = ['teil_1', 'teil_2', 'teil_3'] as const;
const VALID_SPECS = ['fiae', 'fisi'] as const;

const PART_LABELS: Record<string, string> = {
  teil_1: 'Planen eines Softwareproduktes',
  teil_2: 'Entwicklung und Umsetzung von Algorithmen',
  teil_3: 'Wirtschafts- und Sozialkunde',
};

const DURATIONS: Record<string, number> = { teil_1: 90, teil_2: 90, teil_3: 60 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveServerConfig(aiConfig: ReturnType<typeof resolveAiConfig>) {
  return aiConfig?.source === 'user' ? resolveServerAiConfig() : null;
}

function countPool(part: string, specialty: Specialty): number {
  return (
    db
      .prepare('SELECT COUNT(*) as cnt FROM tasks WHERE part = ? AND specialty = ?')
      .get(part, specialty) as { cnt: number }
  ).cnt;
}

// ─── GET /api/exams/pool-status ───────────────────────────────────────────────

poolRouter.get('/pool-status', (req: Request, res: Response) => {
  const specialty = (req.query.specialty as string) ?? 'fiae';
  if (!VALID_SPECS.includes(specialty as Specialty)) {
    return res.status(400).json({ success: false, error: 'Ungültige Fachrichtung.' });
  }

  const parts = (['teil_1', 'teil_2', 'teil_3'] as const).map((part) => ({
    part,
    total: countPool(part, specialty as Specialty),
    canAssemble: canAssembleExam(part, specialty),
    sufficient: countPool(part, specialty as Specialty) >= 4,
  }));

  res.json({ success: true, data: { parts } });
});

// ─── POST /api/exams/generate ─────────────────────────────────────────────────

poolRouter.post('/generate', generateLimiter, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const aiConfig = resolveAiConfig(userId);
  if (!aiConfig) {
    return res.status(500).json({
      success: false,
      error: 'Kein API-Key konfiguriert. Bitte in den Einstellungen hinterlegen.',
    });
  }

  const { part, count = 4, specialty: specialtyRaw = 'fiae' } = req.body;
  const specialty = specialtyRaw as Specialty;

  if (!VALID_PARTS.includes(part)) {
    return res.status(400).json({ success: false, error: 'Ungültiger Teil.' });
  }
  if (!VALID_SPECS.includes(specialty)) {
    return res.status(400).json({ success: false, error: 'Ungültige Fachrichtung.' });
  }

  const { apiKey, meta: aiMeta } = aiConfig;
  const serverConfig = resolveServerConfig(aiConfig);

  try {
    const genCount = Math.min(count, GENERATE_COUNT[part] ?? 8);

    const underrepresented = findUnderrepresentedKinds(part, specialty);
    const topics =
      underrepresented.length > 0
        ? pickTopicsByKinds(part as ExamPart, underrepresented, genCount, specialty)
        : undefined;

    const genResult = await generateTasksForPool(
      part as ExamPart,
      genCount,
      apiKey,
      aiMeta,
      serverConfig?.apiKey ?? null,
      serverConfig?.meta ?? null,
      specialty,
      topics,
    );
    await insertTasksIntoDB(part, genResult.tasks, specialty);

    const response: Record<string, unknown> = {
      added: genResult.tasks.length,
      poolSize: countPool(part, specialty),
    };
    if (genResult.warnings.length > 0) {
      response.warnings = genResult.warnings.map((w: TaskWarning) => ({
        topic: w.topic,
        source: w.source,
        message: w.message,
      }));
    }

    res.status(201).json({ success: true, data: response });
  } catch (err) {
    console.error('[generate]', err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Fehler' });
  }
});

// ─── POST /api/exams/start ────────────────────────────────────────────────────

poolRouter.post('/start', async (req: Request, res: Response) => {
  const { part, specialty: specialtyRaw = 'fiae' } = req.body;
  const specialty = specialtyRaw as Specialty;

  if (!VALID_PARTS.includes(part)) {
    return res.status(400).json({ success: false, error: 'Ungültiger Teil.' });
  }
  if (!VALID_SPECS.includes(specialty)) {
    return res.status(400).json({ success: false, error: 'Ungültige Fachrichtung.' });
  }

  const userId = getUserId(req);

  if (!examStartMutex.acquire(userId)) {
    return res.status(429).json({
      success: false,
      error: 'Deine letzte Start-Anfrage läuft noch. Bitte einen Moment warten.',
    });
  }

  try {
    const aiConfig = resolveAiConfig(userId);
    const serverConfig = resolveServerConfig(aiConfig);

    if (!canAssembleExam(part, specialty)) {
      if (!aiConfig) {
        return res.status(422).json({
          success: false,
          error: 'Pool leer und kein API-Key konfiguriert.',
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

    // ── Step 1: Assemble tasks (read-only, no DB write yet) ───────────────────
    //
    // assembleExam() runs inside its own read transaction.  We do NOT start
    // the write transaction yet so the async scenario generation below can't
    // hold a write lock for seconds.  Admin deletes are safe because
    // adminRoutes checks session_tasks references before deleting a task.
    const assembled = assembleExam(part, specialty);
    if (!assembled) {
      return res.status(422).json({
        success: false,
        error: 'Nicht genug Aufgaben im Pool.',
        needsGeneration: true,
      });
    }

    // ── Step 2: Generate scenario using the actual assembled topics ───────────
    //
    // The topics from step 1 are passed so the AI can create a scenario that
    // thematically fits every task in the exam — matching the real IHK flow.
    let scenario: Scenario;
    if (aiConfig) {
      try {
        scenario = await generateScenarioForTasks(
          part as ExamPart,
          assembled.topics,
          aiConfig.apiKey,
          aiConfig.meta,
          assembled.taskSummaries, // ← echte Aufgaben-Summaries
        );
      } catch (err) {
        console.warn(
          `[start] Szenario-Generierung fehlgeschlagen, nutze Fallback: ${
            err instanceof Error ? err.message : err
          }`,
        );
        scenario = pickRandomFallbackScenario();
      }
    } else {
      scenario = pickRandomFallbackScenario();
    }

    // ── Step 3: Atomic write — session + task links ───────────────────────────
    //
    // All INSERTs happen in one transaction.  Because the task IDs come from
    // step 1 (already validated against the pool) and admin deletes are
    // guarded by FK checks on session_tasks, FK violations are not possible.
    const sessionId = randomUUID().replace(/-/g, '');
    const title = `AP2 ${PART_LABELS[part]} — ${new Date().toLocaleDateString('de-DE')}`;

    db.transaction(() => {
      db.prepare(
        `
        INSERT INTO exam_sessions
          (id, user_id, part, specialty, title, scenario_name, scenario_description,
           duration_minutes, max_points)
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
          'INSERT INTO session_tasks (session_id, task_id, position) VALUES (?, ?, ?)',
        ).run(sessionId, task.id, i + 1);
        db.prepare('UPDATE tasks SET times_used = times_used + 1 WHERE id = ?').run(task.id);

        const subtasks = db
          .prepare('SELECT id, question_text, expected_answer FROM subtasks WHERE task_id = ?')
          .all(task.id as string) as {
          id: string;
          question_text: string;
          expected_answer: string;
        }[];

        for (const st of subtasks) {
          const resolvedQuestion = applyScenario(st.question_text, scenario);
          const resolvedAnswer = applyScenario(st.expected_answer, scenario);

          const questionChanged = resolvedQuestion !== st.question_text;
          const answerChanged = resolvedAnswer !== st.expected_answer;

          if (questionChanged || answerChanged) {
            db.prepare(
              `INSERT OR REPLACE INTO session_subtask_overrides
                 (session_id, subtask_id, question_text, expected_answer)
               VALUES (?, ?, ?, ?)`,
            ).run(
              sessionId,
              st.id,
              questionChanged ? resolvedQuestion : st.question_text,
              answerChanged ? resolvedAnswer : null,
            );
          }
        }
      }
    })();

    // Refill pool asynchronously — fire-and-forget, never blocks the response.
    if (aiConfig) {
      refillPoolInBackground(
        part,
        aiConfig.apiKey ?? '',
        aiConfig.meta,
        serverConfig?.apiKey ?? null,
        serverConfig?.meta ?? null,
        specialty,
      ).catch(() => {});
    }

    return res.status(201).json({ success: true, data: { sessionId } });
  } catch (err) {
    console.error('[start]', err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Unbekannter Fehler beim Prüfungsstart.',
    });
  } finally {
    examStartMutex.release(userId);
  }
});
