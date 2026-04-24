/**
 * db/assembly/assembleExam.ts — Stellt eine AP2-Prüfung aus dem Pool zusammen.
 *
 * Nutzt `slotFiller` für die Slot-Befüllung und berechnet zusätzlich:
 *  - totalPoints (Summe aller points_value der gewählten Tasks)
 *  - topics (Liste der Topic-Areas in Reihenfolge)
 *  - taskSummaries (für Szenario-Generierung: id, topic, kind, points + erster Fragetext)
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { PLACEHOLDER_TOKEN_REGEX } from '../../domain/taxonomy.js';
import { db } from '../connection.js';
import { fillSlots } from './slotFiller.js';

/** Full row type as returned from the tasks table (all columns). */
type TaskRow = Record<string, unknown> & {
  id: string;
  topic_area: string;
  task_kind: string;
  points_value: number;
};

export interface AssembledTask {
  id: string;
  topic_area: string;
  task_kind: string;
  points_value: number;
  /** Erster nicht-leerer Fragetext aus subtasks (max. 120 Zeichen) — für die Szenario-Generierung. */
  firstQuestion?: string;
}

export interface AssembleResult {
  tasks: Record<string, unknown>[];
  totalPoints: number;
  topics: string[];
  taskSummaries: AssembledTask[];
}

export function assembleExam(part: string, specialty = 'fiae'): AssembleResult | null {
  const selectedTasks: TaskRow[] = [];
  const topicOrder: string[] = [];

  const allFilled = fillSlots<TaskRow>(part, specialty, (task) => {
    selectedTasks.push(task);
    topicOrder.push(task.topic_area);
  });

  if (!allFilled) return null;

  const totalPoints = selectedTasks.reduce((sum, t) => sum + t.points_value, 0);
  const taskSummaries = selectedTasks.map(buildTaskSummary);

  return {
    tasks: selectedTasks,
    totalPoints,
    topics: topicOrder,
    taskSummaries,
  };
}

/** Holt den ersten Fragetext einer Task und baut daraus die Summary. */
function buildTaskSummary(task: TaskRow): AssembledTask {
  const firstQuestion = getFirstQuestionText(task.id);
  return {
    id: task.id,
    topic_area: task.topic_area,
    task_kind: task.task_kind ?? 'text',
    points_value: task.points_value,
    firstQuestion,
  };
}

function getFirstQuestionText(taskId: string): string | undefined {
  const row = db
    .prepare(
      `SELECT question_text FROM subtasks WHERE task_id = ?
       ORDER BY position ASC LIMIT 1`,
    )
    .get(taskId) as { question_text: string } | undefined;

  if (!row?.question_text) return undefined;

  const cleaned = row.question_text.replace(PLACEHOLDER_TOKEN_REGEX, '').slice(0, 120).trim();
  return cleaned || undefined;
}
