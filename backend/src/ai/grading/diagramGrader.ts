/**
 * grading/diagramGrader.ts — Bewertung von UML-/ER-Diagrammen.
 *
 * Zwei Eingabeformen:
 *  - PlantUML-Code (textbasiert, kein Vision-Modell nötig)
 *  - Bild-Upload (Base64 + Media-Type — Vision-Modell wird gewählt)
 *
 * Der Dispatcher (providers/dispatcher.ts) entscheidet anhand des Vorliegens
 * von `imageBase64` automatisch zwischen Text- und Vision-Modell.
 *
 * Liefert AiEvaluation mit zusätzlichen Feldern: detectedElements,
 * missingElements, notationErrors (nicht in der Standard-Scored-Shape, daher
 * hier manuell ergänzt).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { AiEvaluation, CriterionScore } from '../../types/index.js';
import { deriveIhkGrade } from '../../domain/taxonomy.js';
import type { ProviderMeta } from '../../routes/settingsRoutes.js';
import { callAiProvider } from '../providers/dispatcher.js';
import { buildDiagramUserPrompt } from '../prompts/diagramPrompt.js';
import type { AnalyzeDiagramParams } from '../types.js';
import { parseLlmJson } from './jsonParser.js';

export type DiagramEvaluation = Omit<AiEvaluation, 'id' | 'answerId' | 'createdAt'>;

export async function gradeDiagramAnswer(
  params: AnalyzeDiagramParams,
  apiKey: string,
  meta: ProviderMeta,
): Promise<DiagramEvaluation> {
  const prompt = buildDiagramUserPrompt(params);
  const raw = await callAiProvider(
    prompt,
    apiKey,
    meta,
    params.imageBase64,
    params.imageMediaType,
  );
  const parsed = parseLlmJson(raw);
  return buildDiagramEvaluation(parsed, params.maxPoints, meta.visionModel);
}

function buildDiagramEvaluation(
  parsed: Record<string, unknown>,
  maxPoints: number,
  modelUsed: string,
): DiagramEvaluation {
  const awarded = clampAwardedPoints(parsed.awardedPoints, maxPoints);
  const percent = maxPoints > 0 ? Math.round((awarded / maxPoints) * 100) : 0;

  return {
    awardedPoints: awarded,
    maxPoints,
    percentageScore: percent,
    ihkGrade: deriveIhkGrade(percent),
    feedbackText: String(parsed.feedbackText ?? ''),
    criterionScores: (parsed.criterionScores as CriterionScore[]) ?? [],
    detectedElements: (parsed.detectedElements as string[]) ?? [],
    missingElements: (parsed.missingElements as string[]) ?? [],
    notationErrors: (parsed.notationErrors as string[]) ?? [],
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
