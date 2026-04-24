/**
 * grading/tableGrader.ts — Bewertung von Tabellen-Antworten per LLM.
 *
 * Tabellen werden vom Prüfling als string[][] abgegeben (JSON-stringified).
 * Der Prompt baut sowohl Prüflings- als auch Erwartungstabelle als Markdown,
 * damit der LLM beide leicht vergleichen kann.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ProviderMeta } from '../../routes/settingsRoutes.js';
import { callAiProvider } from '../providers/dispatcher.js';
import { buildGradingSystemPrompt } from '../prompts/gradingSystem.js';
import { buildTableUserPrompt } from '../prompts/tablePrompt.js';
import type { AssessAnswerParams } from '../types.js';
import { buildScoredEvaluation, type ScoredEvaluation } from './evaluationShape.js';
import { parseLlmJson } from './jsonParser.js';

export async function gradeTableAnswer(
  params: AssessAnswerParams,
  apiKey: string,
  meta: ProviderMeta,
): Promise<ScoredEvaluation> {
  const systemPrompt = buildGradingSystemPrompt(params.examPart, params.scenarioContext);
  const userPrompt = buildTableUserPrompt(params);
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  const raw = await callAiProvider(fullPrompt, apiKey, meta);
  const parsed = parseLlmJson(raw);
  return buildScoredEvaluation(parsed, params.maxPoints, meta.textModel);
}
