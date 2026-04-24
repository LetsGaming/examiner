/**
 * core/generator.ts — Orchestrator für die AP2-Aufgabengenerierung.
 *
 * Verantwortlichkeiten:
 *  - generateOneTask  : erstellt EINE Aufgabe für EIN Thema (ruft LLM, validiert,
 *                       füllt Lücken mit Fallback-Subtasks auf)
 *  - generateTasksForPool : erstellt `count` Aufgaben für den Pool, mit
 *                       dreistufigem Fallback (User-AI → Server-AI → Platzhalter)
 *
 * Verteilung der Sub-Logik:
 *  - Rezept-Auswahl      → recipes/index.ts
 *  - Label/Punkte        → core/labels.ts
 *  - JSON-Schema         → core/schema.ts
 *  - Prompts             → core/promptBuilder.ts
 *  - LLM-Response-Parse  → core/parser.ts
 *  - Subtask-Validierung → core/validator.ts
 *  - Fallback-Aufgabe    → core/fallback.ts
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { callAiProvider } from '../../ai/index.js';
import type { ProviderMeta } from '../../routes/settingsRoutes.js';
import { mcOptionIds, type McContext } from '../../domain/taxonomy.js';
import type { ExamPart, Specialty } from '../../types/index.js';
import { isWisoRecipe, selectRecipe } from '../recipes/index.js';
import { getTopics } from '../../services/topics.js';
import type { GeneratedSubTask, GeneratedTask, TaskRecipe } from '../types.js';
import { buildFallbackTask } from './fallback.js';
import { assignLabels, resolvePoints } from './labels.js';
import { buildSystemPrompt, buildSubtaskInstructions, buildUserPrompt } from './promptBuilder.js';
import { safeParseTask } from './parser.js';
import { buildSubtaskSchema } from './schema.js';
import { validateSubtask } from './validator.js';

// ─── Single-Task-Generierung ─────────────────────────────────────────────────

/** Erzeugt eine AP2-Aufgabe zu einem Thema. Wirft bei LLM-Fehler. */
export async function generateOneTask(
  part: ExamPart,
  topic: string,
  apiKey: string,
  avoidDiagram: boolean,
  meta: ProviderMeta,
  specialty: Specialty,
): Promise<GeneratedTask> {
  const recipe = selectRecipe(part, topic, avoidDiagram);
  const { resolvedPoints, totalPoints, labels, mcContext } = prepareRecipe(recipe);

  const raw = await requestTaskFromLlm(recipe, topic, specialty, resolvedPoints, labels, mcContext, apiKey, meta);
  const parsed = safeParseTask(raw);

  if (!parsed) {
    console.warn(`[generator] JSON-Parse fehlgeschlagen für "${topic}", nutze Fallback-Aufgabe`);
    return buildFallbackTask(topic, recipe, resolvedPoints, labels);
  }

  return finalizeTask(parsed, recipe, topic, totalPoints, resolvedPoints, labels, mcContext);
}

interface RecipePreparation {
  resolvedPoints: number[];
  totalPoints: number;
  labels: string[];
  mcContext: McContext;
}

function prepareRecipe(recipe: TaskRecipe): RecipePreparation {
  const resolvedPoints = recipe.subtasks.map((s) => resolvePoints(s.points));
  const totalPoints = resolvedPoints.reduce((a, b) => a + b, 0);
  const labels = assignLabels(recipe.subtasks);
  const mcContext: McContext = isWisoRecipe(recipe) ? 'wiso' : 'teil12';
  return { resolvedPoints, totalPoints, labels, mcContext };
}

async function requestTaskFromLlm(
  recipe: TaskRecipe,
  topic: string,
  specialty: Specialty,
  resolvedPoints: number[],
  labels: string[],
  mcContext: McContext,
  apiKey: string,
  meta: ProviderMeta,
): Promise<string> {
  const schemas = recipe.subtasks.map((spec, i) =>
    buildSubtaskSchema(spec, labels[i], resolvedPoints[i], mcContext),
  );
  const subtaskInstructions = buildSubtaskInstructions(recipe, labels, resolvedPoints);
  const totalPoints = resolvedPoints.reduce((a, b) => a + b, 0);

  const system = buildSystemPrompt(specialty, recipe);
  const user = buildUserPrompt({ topic, recipe, subtaskInstructions, totalPoints, schemas });

  return callAiProvider(`${system}\n\n${user}`, apiKey, meta);
}

/**
 * Normalisiert LLM-Output: Topic/Points/Difficulty erzwingen, Subtask-Zahl
 * anpassen, jeden Subtask validieren.
 */
function finalizeTask(
  parsed: GeneratedTask,
  recipe: TaskRecipe,
  topic: string,
  totalPoints: number,
  resolvedPoints: number[],
  labels: string[],
  mcContext: McContext,
): GeneratedTask {
  parsed.topicArea = topic;
  parsed.difficulty = parsed.difficulty ?? 'medium';
  parsed.pointsValue = totalPoints;

  reconcileSubtaskCount(parsed, recipe, resolvedPoints, labels, topic);
  enforceSubtaskInvariants(parsed, recipe, resolvedPoints, labels, topic, mcContext);

  return parsed;
}

function reconcileSubtaskCount(
  task: GeneratedTask,
  recipe: TaskRecipe,
  resolvedPoints: number[],
  labels: string[],
  topic: string,
): void {
  if (task.subtasks.length > recipe.subtasks.length) {
    task.subtasks = task.subtasks.slice(0, recipe.subtasks.length);
  }
  while (task.subtasks.length < recipe.subtasks.length) {
    const i = task.subtasks.length;
    task.subtasks.push({
      label: labels[i],
      taskType: recipe.subtasks[i].taskType,
      questionText: `Aufgabentext zum Thema „${topic}".`,
      points: resolvedPoints[i],
      expectedAnswer: { keyPoints: [] },
    });
  }
}

function enforceSubtaskInvariants(
  task: GeneratedTask,
  recipe: TaskRecipe,
  resolvedPoints: number[],
  labels: string[],
  topic: string,
  mcContext: McContext,
): void {
  for (let i = 0; i < task.subtasks.length; i++) {
    const st = task.subtasks[i];
    const spec = recipe.subtasks[i];

    st.label = labels[i];
    st.taskType = spec.taskType;
    st.points = resolvedPoints[i];

    if (!st.expectedAnswer) st.expectedAnswer = {};
    if (spec.gradingHint && !st.expectedAnswer.gradingHint) {
      st.expectedAnswer.gradingHint = spec.gradingHint;
    }
    if (spec.operator) {
      st.expectedAnswer.operator = spec.operator;
    }

    validateSubtask(st, spec, topic, mcContext);
  }
}

// ─── Batch-/Pool-Generierung ─────────────────────────────────────────────────

export type TaskSource = 'user_ai' | 'server_ai' | 'fallback';

export interface TaskWarning {
  topic: string;
  source: TaskSource;
  message: string;
}

export interface GeneratePoolResult {
  tasks: GeneratedTask[];
  warnings: TaskWarning[];
}

/**
 * Maximum an Diagramm-Aufgaben pro Batch. Balance zwischen Pool-Vielfalt
 * (assembleExam braucht ≥2 für Teil 1) und Typ-Mix.
 */
const MAX_DIAGRAM_PER_BATCH = 2;

/** Shuffle+slice: max `n` eindeutige Elemente aus `arr`. */
function pickUnique<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

function truncate(s: string, max = 100): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

interface PoolGenerationConfig {
  part: ExamPart;
  count: number;
  userApiKey: string;
  userMeta?: ProviderMeta;
  serverApiKey?: string | null;
  serverMeta?: ProviderMeta | null;
  specialty: Specialty;
  topics?: string[];
}

/**
 * Generiert `count` Aufgaben für den Pool. Dreistufiger Fallback pro Thema:
 *   1. User-AI
 *   2. Server-AI (falls unterschiedlich konfiguriert)
 *   3. Fallback-Platzhalteraufgabe (immer erfolgreich)
 *
 * Jede Aufgabe bekommt eine explizite Warnung, wenn Tier 2 oder 3 einspringt.
 *
 * @param config.topics Optional: konkrete Themenliste, die abgearbeitet werden soll.
 *   Wenn nicht angegeben, wird eine Zufallsauswahl aus getTopics() getroffen.
 *   routeHelpers.refillPoolInBackground nutzt das, um gezielt Topics für
 *   unterrepräsentierte Kinds zu generieren.
 */
export async function generateTasksForPool(
  part: ExamPart,
  count: number,
  userApiKey: string,
  userMeta?: ProviderMeta,
  serverApiKey?: string | null,
  serverMeta?: ProviderMeta | null,
  specialty: Specialty = 'fiae',
  topics?: string[],
): Promise<GeneratePoolResult> {
  const config: PoolGenerationConfig = {
    part,
    count,
    userApiKey,
    userMeta,
    serverApiKey,
    serverMeta,
    specialty,
    topics,
  };
  return runPoolBatch(config);
}

async function runPoolBatch(config: PoolGenerationConfig): Promise<GeneratePoolResult> {
  const topicsToUse =
    config.topics ?? pickUnique(getTopics(config.part, config.specialty), config.count);
  const hasDistinctServer = isDistinctServerConfigured(config);

  const tasks: GeneratedTask[] = [];
  const warnings: TaskWarning[] = [];
  let diagramCount = 0;

  for (const topic of topicsToUse) {
    const avoidDiagram = diagramCount >= MAX_DIAGRAM_PER_BATCH;
    const result = await generateWithFallbackTiers(topic, avoidDiagram, config, hasDistinctServer);

    tasks.push(result.task);
    if (result.warning) warnings.push(result.warning);

    const hasDiagram = result.task.subtasks.some(
      (st) => st.taskType === 'plantuml' || st.taskType === 'diagram_upload',
    );
    if (hasDiagram) diagramCount++;
  }

  return { tasks, warnings };
}

function isDistinctServerConfigured(config: PoolGenerationConfig): boolean {
  return (
    !!config.serverApiKey &&
    !!config.serverMeta &&
    (config.serverApiKey !== config.userApiKey || config.serverMeta.id !== config.userMeta?.id)
  );
}

interface TierResult {
  task: GeneratedTask;
  warning?: TaskWarning;
}

async function generateWithFallbackTiers(
  topic: string,
  avoidDiagram: boolean,
  config: PoolGenerationConfig,
  hasDistinctServer: boolean,
): Promise<TierResult> {
  // Tier 1: User-AI
  let userError: string | null = null;
  if (config.userMeta) {
    try {
      const task = await generateOneTask(
        config.part,
        topic,
        config.userApiKey,
        avoidDiagram,
        config.userMeta,
        config.specialty,
      );
      return { task };
    } catch (err) {
      userError = err instanceof Error ? err.message : String(err);
      console.warn(`[generator] "${topic}" User-AI fehlgeschlagen: ${userError.slice(0, 120)}`);
    }
  }

  // Tier 2: Server-AI
  let serverError: string | null = null;
  if (hasDistinctServer) {
    try {
      const task = await generateOneTask(
        config.part,
        topic,
        config.serverApiKey!,
        avoidDiagram,
        config.serverMeta!,
        config.specialty,
      );
      return {
        task,
        warning: {
          topic,
          source: 'server_ai',
          message: `„${topic}": ${config.userMeta?.label ?? 'KI'} fehlgeschlagen (${truncate(userError ?? 'Fehler')}). Server-KI (${config.serverMeta!.label}) eingesprungen.`,
        },
      };
    } catch (err) {
      serverError = err instanceof Error ? err.message : String(err);
      console.warn(`[generator] "${topic}" Server-AI fehlgeschlagen: ${serverError.slice(0, 120)}`);
    }
  }

  // Tier 3: Fallback-Platzhalter
  const recipe = selectRecipe(config.part, topic, avoidDiagram);
  const points = recipe.subtasks.map((s) => resolvePoints(s.points));
  const labels = assignLabels(recipe.subtasks);
  const task = buildFallbackTask(topic, recipe, points, labels);

  const bothFailed = hasDistinctServer && serverError;
  const message = bothFailed
    ? `„${topic}": Alle KIs fehlgeschlagen. Platzhalter verwendet. User: ${truncate(userError ?? '-')} | Server: ${truncate(serverError ?? '-')}`
    : `„${topic}": KI nicht verfügbar (${truncate(userError ?? 'Kein Provider')}). Platzhalter verwendet.`;

  return {
    task,
    warning: { topic, source: 'fallback', message },
  };
}

// ─── Hilfsfunktion für externen Zugriff ──────────────────────────────────────
// MC-Fallback-IDs sind abhängig vom Kontext; wenn externer Code Defaults
// braucht, liefert die Taxonomie die Wahrheit.
export { mcOptionIds };
export type { GeneratedSubTask };
