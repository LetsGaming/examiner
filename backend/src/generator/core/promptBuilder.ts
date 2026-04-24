/**
 * core/promptBuilder.ts — System- und User-Prompt für die AP2-Aufgabengenerierung.
 *
 * Trennt:
 *  - System-Prompt (Rolle, Format-Regeln — abhängig von Rezept-Typen-Mix)
 *  - User-Prompt  (Thema, Subtask-Anweisungen, JSON-Schema)
 *
 * Fachliche Bausteine (Type-Rules, Kontext-Blocks, Topic-Hints) kommen aus
 * dem Domain-Modul `domain/prompts.ts` — hier wird nur zusammengesetzt.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { SPECIALTY_LABELS } from '../../domain/taxonomy.js';
import {
  buildTopicContextHint,
  buildTypeRulesBlock,
  taskTypeFlags,
  TEIL12_CONTEXT_BLOCK,
  TEIL12_MC_RULES,
  WISO_CONTEXT_BLOCK,
} from '../../domain/prompts.js';
import type { Specialty } from '../../types/index.js';
import { isWisoRecipe } from '../recipes/index.js';
import type { SubtaskSpec, TaskRecipe } from '../types.js';
import { buildTableSchemaHint } from './schema.js';

// ─── Subtask-Anweisungen für den User-Prompt ─────────────────────────────────

/** Ein Subtask-Anweisungsblock, wie er im User-Prompt erscheint. */
function buildSubtaskInstruction(
  spec: SubtaskSpec,
  label: string,
  points: number,
): string {
  const opLabel = spec.operator ? ` [Operator: ${spec.operator}]` : '';
  const tableHint = spec.taskType === 'table' ? `\n${buildTableSchemaHint(spec)}` : '';
  const gHint = spec.gradingHint ? `\n  Bewertungshinweis: ${spec.gradingHint}` : '';
  return `Unteraufgabe ${label} (${points}P)${opLabel}: ${spec.prompt}${tableHint}${gHint}`;
}

/** Fügt alle Subtask-Anweisungen zu einem Block zusammen. */
export function buildSubtaskInstructions(
  recipe: TaskRecipe,
  labels: string[],
  resolvedPoints: number[],
): string {
  return recipe.subtasks
    .map((spec, i) => buildSubtaskInstruction(spec, labels[i], resolvedPoints[i]))
    .join('\n\n');
}

// ─── System-Prompt ───────────────────────────────────────────────────────────

const OPERATOR_CHEATSHEET =
  'Operatoren: nennen=Stichworte | beschreiben=2–3 Sätze | erläutern=Begründung 3–5 Sätze | berechnen=Rechenweg+Einheit | entwerfen/erstellen/skizzieren=konkrete Umsetzung | vergleichen=Kriterien-Gegenüberstellung | identifizieren=Fehler benennen';

/**
 * Baut das System-Prompt für den Generator-LLM. Enthält nur die Regeln, die für
 * die im Rezept enthaltenen Typen relevant sind — spart Token bei reinen
 * Freitext-Aufgaben (MD-belegte Regeln aus §5.1, §5.2, §5.3, §6.2).
 */
export function buildSystemPrompt(specialty: Specialty, recipe: TaskRecipe): string {
  const specialtyLabel = SPECIALTY_LABELS[specialty];
  const isWiso = isWisoRecipe(recipe);

  const flags = taskTypeFlags(recipe.subtasks);
  const typeSection = buildTypeRulesBlock(flags, isWiso);

  const contextBlock = isWiso ? WISO_CONTEXT_BLOCK : TEIL12_CONTEXT_BLOCK;
  const mcBlock = isWiso ? '' : TEIL12_MC_RULES;

  return `IHK ${specialtyLabel} AP2 Prüfungsersteller. Antworte NUR mit JSON (kein Markdown).

${contextBlock}
${typeSection}
${mcBlock}
${OPERATOR_CHEATSHEET}

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt.`;
}

// ─── User-Prompt ─────────────────────────────────────────────────────────────

export interface UserPromptInput {
  topic: string;
  recipe: TaskRecipe;
  subtaskInstructions: string;
  totalPoints: number;
  schemas: string[];
}

/**
 * Baut das User-Prompt für den Generator-LLM. Enthält:
 *  1. Thema + topic-spezifische Kontexthinweise (domain/prompts.ts)
 *  2. Subtask-Anweisungen mit Operatoren und Bewertungshinweisen
 *  3. Pflicht-JSON-Struktur
 */
export function buildUserPrompt(input: UserPromptInput): string {
  const { topic, recipe, subtaskInstructions, totalPoints, schemas } = input;
  const flags = taskTypeFlags(recipe.subtasks);
  const primaryDiagramType = recipe.subtasks.find((s) => s.taskType === 'plantuml')?.diagramType;
  const hint = buildTopicContextHint(topic, flags, primaryDiagramType);

  return `Thema: "${topic}"${hint}
Unteraufgaben:
${subtaskInstructions}

Aufgabe bezieht sich kohärent auf EINEN Anwendungsfall bei {{UNTERNEHMEN}}. Vergleiche nutzen echte Namen (Scrum/Wasserfall, nicht "Option A/B").

JSON zurückgeben — FRAGE-Platzhalter durch konkreten IHK-Text ersetzen, mcOptions/expectedAnswer mit echten Inhalten füllen:
{"topicArea":"${topic}","pointsValue":${totalPoints},"difficulty":"medium","subtasks":[${schemas.join(',')}]}`;
}
