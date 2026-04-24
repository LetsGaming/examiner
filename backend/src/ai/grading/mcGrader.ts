/**
 * grading/mcGrader.ts — Deterministische MC-Bewertung (kein LLM-Call).
 *
 * Single-Choice: volle Punkte bei korrekter Option, sonst 0.
 * Multi-Choice: proportionale Teilpunkte — je Option, die der Prüfling korrekt
 * markiert (oder korrekt NICHT markiert) gibt es anteilig Punkte.
 *
 * KONTEXT-AUFLÖSUNG (MD §5.3 vs. Teil 1/2):
 * Die zulässigen Option-IDs werden aus der Aufgabe selbst abgeleitet
 * (`mcOptionIds` des jeweiligen Subtasks) — NICHT hardcoded. WiSo-Subtasks
 * tragen "1"–"5" in ihren mcOptions, Teil-1/2-Subtasks "A"–"D".
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { AiEvaluation } from '../../types/index.js';
import { deriveIhkGrade, stripPlaceholders } from '../../domain/taxonomy.js';
import type { ScoredEvaluation } from './evaluationShape.js';

// ─── Normalisierung je nach Option-Format ────────────────────────────────────

/** Erkennt anhand der Option-IDs, ob es sich um WiSo (Ziffern) handelt. */
function isNumericIdSet(ids: string[]): boolean {
  return ids.length > 0 && ids.every((id) => /^[0-9]+$/.test(id));
}

/** Normalisiert eine ID: Ziffern bleiben wie sind, Buchstaben werden uppercased. */
function normalizeId(raw: string, numericMode: boolean): string {
  return numericMode ? raw.trim() : raw.toUpperCase().trim();
}

// ─── Single-Choice ───────────────────────────────────────────────────────────

export interface GradeMcSingleParams {
  selectedOptionId: string;
  expectedAnswer: Record<string, unknown>;
  maxPoints: number;
  /** Die dem Prüfling gezeigten Option-IDs. Default ['A','B','C','D'] für Backward-
   *  Compatibility. WiSo-Routen MÜSSEN ['1','2','3','4','5'] übergeben. */
  mcOptionIds?: string[];
}

export function gradeMcAnswer(params: GradeMcSingleParams): ScoredEvaluation {
  const allowedIds = params.mcOptionIds ?? ['A', 'B', 'C', 'D'];
  const numericMode = isNumericIdSet(allowedIds);
  const validSet = new Set(allowedIds.map((id) => normalizeId(id, numericMode)));

  const correctOptionId = resolveCorrectId(params.expectedAnswer, validSet, numericMode);
  const selected = normalizeId(params.selectedOptionId ?? '', numericMode);
  const explanation = stripPlaceholders((params.expectedAnswer.explanation as string) ?? '');

  const isCorrect = selected !== '' && correctOptionId !== '' && selected === correctOptionId;
  const awarded = isCorrect ? params.maxPoints : 0;
  const percent = isCorrect ? 100 : 0;

  return {
    awardedPoints: awarded,
    maxPoints: params.maxPoints,
    percentageScore: percent,
    ihkGrade: deriveIhkGrade(percent),
    feedbackText: buildSingleFeedback(isCorrect, correctOptionId, explanation),
    criterionScores: [
      {
        criterion: 'Korrekte Antwort',
        awarded,
        max: params.maxPoints,
        comment: buildSingleCriterionComment(isCorrect, selected, correctOptionId),
      },
    ],
    keyMistakes: isCorrect
      ? []
      : [
          `Falsche Option "${selected}" gewählt${correctOptionId ? ` — korrekt wäre "${correctOptionId}"` : ''}`,
        ],
    improvementHints: isCorrect ? [] : explanation ? [explanation] : [],
    modelUsed: 'local_mc_evaluation',
  };
}

function resolveCorrectId(
  expected: Record<string, unknown>,
  validSet: Set<string>,
  numericMode: boolean,
): string {
  const rawCorrect = normalizeId(
    String((expected.correctOption as string) ?? (expected.correctOptionId as string) ?? ''),
    numericMode,
  );
  return validSet.has(rawCorrect) ? rawCorrect : '';
}

function buildSingleFeedback(
  isCorrect: boolean,
  correctOptionId: string,
  explanation: string,
): string {
  const tail = explanation ? ` ${explanation}` : '';
  if (isCorrect) return `Richtig!${tail}`;
  if (correctOptionId) return `Leider falsch. Die korrekte Antwort ist Option "${correctOptionId}".${tail}`;
  return `Leider falsch.${tail}`;
}

function buildSingleCriterionComment(
  isCorrect: boolean,
  selected: string,
  correctOptionId: string,
): string {
  if (isCorrect) return `Option ${selected} ist korrekt`;
  const correction = correctOptionId ? ` — korrekt wäre ${correctOptionId}` : '';
  return `Option ${selected} ist falsch${correction}`;
}

// ─── Multi-Choice ────────────────────────────────────────────────────────────

export interface GradeMcMultiParams {
  studentSelectionRaw: string;
  mcOptionIds: string[];
  expectedAnswer: Record<string, unknown>;
  maxPoints: number;
}

export function gradeMcMultiAnswer(params: GradeMcMultiParams): ScoredEvaluation {
  const numericMode = isNumericIdSet(params.mcOptionIds);
  const allIds = params.mcOptionIds.map((id) => normalizeId(id, numericMode));

  const studentSet = parseStudentSelection(params.studentSelectionRaw, allIds, numericMode);
  const correctSet = parseCorrectOptions(params.expectedAnswer, numericMode);

  const { correctMarks, wrongSelected, missed } = compareSelections(allIds, studentSet, correctSet);

  const ratio = allIds.length > 0 ? correctMarks / allIds.length : 0;
  const awarded = Math.round(ratio * params.maxPoints);
  const percent = Math.round(ratio * 100);
  const isPerfect = correctMarks === allIds.length;

  const explanation = stripPlaceholders((params.expectedAnswer.explanation as string) ?? '');
  const correctList = Array.from(correctSet).sort().join(', ');
  const studentList = Array.from(studentSet).sort().join(', ') || '(keine)';

  return {
    awardedPoints: awarded,
    maxPoints: params.maxPoints,
    percentageScore: percent,
    ihkGrade: deriveIhkGrade(percent),
    feedbackText: buildMultiFeedback({
      isPerfect,
      correctMarks,
      allCount: allIds.length,
      correctList,
      studentList,
      explanation,
    }),
    criterionScores: [
      {
        criterion: 'Korrekte Mehrfachauswahl',
        awarded,
        max: params.maxPoints,
        comment: `${correctMarks} von ${allIds.length} Optionen korrekt eingeordnet`,
      },
    ],
    keyMistakes: buildMultiMistakes(wrongSelected, missed),
    improvementHints: isPerfect ? [] : explanation ? [explanation] : [],
    modelUsed: 'local_mc_multi_evaluation',
  };
}

function parseStudentSelection(
  raw: string,
  allowedIds: string[],
  numericMode: boolean,
): Set<string> {
  const trimmed = (raw ?? '').trim();
  const parsed = parseSelectionRaw(trimmed, numericMode);
  const allowed = new Set(allowedIds);
  return new Set(parsed.filter((id) => allowed.has(id)));
}

function parseSelectionRaw(trimmed: string, numericMode: boolean): string[] {
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return (parsed as unknown[]).map((v) => normalizeId(String(v), numericMode));
      }
    } catch {
      /* fall through to comma-split */
    }
  }
  if (!trimmed) return [];
  return trimmed
    .split(',')
    .map((v) => normalizeId(v, numericMode))
    .filter(Boolean);
}

function parseCorrectOptions(
  expected: Record<string, unknown>,
  numericMode: boolean,
): Set<string> {
  const raw = expected.correctOptions;
  if (!Array.isArray(raw)) return new Set();
  return new Set((raw as unknown[]).map((v) => normalizeId(String(v), numericMode)));
}

interface SelectionComparison {
  correctMarks: number;
  wrongSelected: string[];
  missed: string[];
}

function compareSelections(
  allIds: string[],
  studentSet: Set<string>,
  correctSet: Set<string>,
): SelectionComparison {
  let correctMarks = 0;
  const wrongSelected: string[] = [];
  const missed: string[] = [];

  for (const id of allIds) {
    const shouldBe = correctSet.has(id);
    const isSelected = studentSet.has(id);
    if (shouldBe === isSelected) {
      correctMarks++;
    } else if (isSelected && !shouldBe) {
      wrongSelected.push(id);
    } else if (!isSelected && shouldBe) {
      missed.push(id);
    }
  }

  return { correctMarks, wrongSelected, missed };
}

interface MultiFeedbackInput {
  isPerfect: boolean;
  correctMarks: number;
  allCount: number;
  correctList: string;
  studentList: string;
  explanation: string;
}

function buildMultiFeedback(input: MultiFeedbackInput): string {
  const tail = input.explanation ? ` ${input.explanation}` : '';
  if (input.isPerfect) {
    return `Richtig! Alle korrekten Optionen (${input.correctList}) wurden ausgewählt und keine falschen markiert.${tail}`;
  }
  if (input.correctMarks === 0) {
    return `Leider komplett daneben. Korrekte Auswahl wäre: ${input.correctList}. Du hast ausgewählt: ${input.studentList}.${tail}`;
  }
  return `Teilweise korrekt (${input.correctMarks} von ${input.allCount} Optionen richtig eingeordnet). Erwartet: ${input.correctList}. Ausgewählt: ${input.studentList}.${tail}`;
}

function buildMultiMistakes(wrongSelected: string[], missed: string[]): string[] {
  const mistakes: string[] = [];
  if (wrongSelected.length) {
    mistakes.push(`Fälschlicherweise ausgewählt: ${wrongSelected.sort().join(', ')}`);
  }
  if (missed.length) {
    mistakes.push(`Richtige Option(en) übersehen: ${missed.sort().join(', ')}`);
  }
  return mistakes;
}

// ─── Re-Export ───────────────────────────────────────────────────────────────
export type { AiEvaluation };
