/**
 * core/fallback.ts — Platzhalter-Aufgabe für den Fall, dass beide KI-Tiers
 * (User-AI + Server-AI) ausfallen.
 *
 * Wird vom Batch-Generator aufgerufen; erzeugt eine strukturell gültige Aufgabe,
 * die im Pool landen darf, aber als "fallback" markiert ist (siehe TaskWarning
 * in generator.ts).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { mcOptionIds, PLACEHOLDERS, type McContext } from '../../domain/taxonomy.js';
import { isWisoRecipe } from '../recipes/index.js';
import type { GeneratedSubTask, GeneratedTask, SubtaskSpec, TaskRecipe } from '../types.js';

export function buildFallbackTask(
  topic: string,
  recipe: TaskRecipe,
  points: number[],
  labels: string[],
): GeneratedTask {
  const mcContext: McContext = isWisoRecipe(recipe) ? 'wiso' : 'teil12';

  const subtasks: GeneratedSubTask[] = recipe.subtasks.map((spec, i) =>
    buildFallbackSubtask(topic, spec, labels[i], points[i], mcContext),
  );

  return {
    topicArea: topic,
    pointsValue: points.reduce((a, b) => a + b, 0),
    difficulty: 'medium',
    subtasks,
  };
}

function buildFallbackSubtask(
  topic: string,
  spec: SubtaskSpec,
  label: string,
  points: number,
  mcContext: McContext,
): GeneratedSubTask {
  const base: GeneratedSubTask = {
    label,
    taskType: spec.taskType,
    questionText: buildFallbackQuestionText(topic, spec),
    points,
    expectedAnswer: buildFallbackExpectedAnswer(spec),
  };

  applyFallbackTypeSpecifics(base, spec, mcContext);
  return base;
}

function buildFallbackQuestionText(topic: string, spec: SubtaskSpec): string {
  if (spec.taskType === 'table') {
    return `Füllen Sie die Tabelle zum Thema „${topic}" aus.`;
  }
  return `Bearbeiten Sie die Aufgabe zum Thema „${topic}" im Kontext von ${PLACEHOLDERS.company}.`;
}

function buildFallbackExpectedAnswer(spec: SubtaskSpec): Record<string, unknown> {
  return {
    keyPoints: [],
    ...(spec.gradingHint ? { gradingHint: spec.gradingHint } : {}),
  };
}

function applyFallbackTypeSpecifics(
  base: GeneratedSubTask,
  spec: SubtaskSpec,
  mcContext: McContext,
): void {
  if (spec.taskType === 'table' && spec.tableColumns) {
    base.tableConfig = buildFallbackTableConfig(spec);
  }
  if (spec.taskType === 'mc' || spec.taskType === 'mc_multi') {
    applyFallbackMcOptions(base, spec.taskType, mcContext);
  }
  if (spec.taskType === 'plantuml' || spec.taskType === 'diagram_upload') {
    base.diagramType = spec.diagramType ?? 'uml_activity';
    base.expectedElements = ['Element 1', 'Element 2', 'Element 3'];
  }
}

function buildFallbackTableConfig(spec: SubtaskSpec): GeneratedSubTask['tableConfig'] {
  const cols = spec.tableColumns!;
  const rowCount = spec.tableRowCount ?? 3;
  const firstCol = spec.fixedFirstColumnValues;
  return {
    columns: cols.slice(),
    rows: Array.from({ length: rowCount }, (_r, ri) =>
      cols.map((_c, ci) =>
        ci === 0 && spec.fixedFirstColumn && firstCol && firstCol[ri] ? firstCol[ri] : '',
      ),
    ),
    rowCount,
    fixedFirstColumn: spec.fixedFirstColumn ?? false,
    fixedFirstColumnValues: firstCol,
  };
}

function applyFallbackMcOptions(
  base: GeneratedSubTask,
  taskType: 'mc' | 'mc_multi',
  mcContext: McContext,
): void {
  const ids = mcOptionIds(mcContext);
  const textPrefix = taskType === 'mc' ? 'Antwort' : 'Aussage';
  base.mcOptions = ids.map((id) => ({ id, text: `${textPrefix} ${id}` }));

  base.expectedAnswer =
    taskType === 'mc'
      ? { correctOption: ids[0], explanation: '' }
      : { correctOptions: [ids[0], ids[2]], explanation: '' };
}
