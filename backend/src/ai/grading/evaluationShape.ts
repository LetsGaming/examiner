/**
 * grading/evaluationShape.ts — Helfer zum Aufbau von AiEvaluation-Objekten.
 *
 * Die Grader (freitext, sql, table, diagram) liefern alle ein AiEvaluation-
 * Objekt (ohne id/answerId/createdAt — die setzt das DB-Layer). Dieses Modul
 * bündelt die wiederkehrenden Normalisierungs-Schritte:
 *
 *  - awardedPoints auf [0, maxPoints] clampen
 *  - percentageScore aus awardedPoints/maxPoints
 *  - ihkGrade aus percentageScore ableiten
 *  - criterionScores / keyMistakes / improvementHints in die Standard-Form bringen
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { AiEvaluation, CriterionScore } from '../../types/index.js';
import { deriveIhkGrade } from '../../domain/taxonomy.js';

export type ScoredEvaluation = Omit<AiEvaluation, 'id' | 'answerId' | 'createdAt'>;

/**
 * Normalisiert einen LLM-Grading-Response zu einer ScoredEvaluation.
 * Clamps awardedPoints in den gültigen Bereich und berechnet den prozentualen
 * Score + die IHK-Note daraus.
 */
export function buildScoredEvaluation(
  parsed: Record<string, unknown>,
  maxPoints: number,
  modelUsed: string,
): ScoredEvaluation {
  const awarded = clampAwardedPoints(parsed.awardedPoints, maxPoints);
  const percent = maxPoints > 0 ? Math.round((awarded / maxPoints) * 100) : 0;

  return {
    awardedPoints: awarded,
    maxPoints,
    percentageScore: percent,
    ihkGrade: deriveIhkGrade(percent),
    feedbackText: String(parsed.feedbackText ?? ''),
    criterionScores: (parsed.criterionScores as CriterionScore[]) ?? [],
    keyMistakes: (parsed.keyMistakes as string[]) ?? [],
    improvementHints: (parsed.improvementHints as string[]) ?? [],
    modelUsed,
  };
}

function clampAwardedPoints(raw: unknown, maxPoints: number): number {
  const n = Math.round(Number(raw) || 0);
  if (n < 0) return 0;
  if (n > maxPoints) return maxPoints;
  return n;
}
