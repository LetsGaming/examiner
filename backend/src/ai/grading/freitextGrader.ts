/**
 * grading/freitextGrader.ts — Bewertung von Freitext- und SQL-Antworten.
 *
 * Routing:
 *  - taskType === 'sql'   → buildSqlUserPrompt (eigenes Kriterien-Schema)
 *  - taskType === 'table' → tableGrader (eigener Grader, siehe tableGrader.ts)
 *  - taskType === 'mc'    → mcGrader.gradeMcAnswer (deterministisch)
 *  - taskType === 'mc_multi' → mcGrader.gradeMcMultiAnswer (deterministisch)
 *  - sonst (freitext, pseudocode) → buildFreitextUserPrompt
 *
 * Das Dispatching steht in ai/index.ts `assessFreitext` — dieses Modul deckt
 * nur den eigentlichen LLM-Call-Pfad ab.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ProviderMeta } from '../../routes/settingsRoutes.js';
import { callAiProvider } from '../providers/dispatcher.js';
import { buildFreitextUserPrompt } from '../prompts/freitextPrompt.js';
import { buildGradingSystemPrompt } from '../prompts/gradingSystem.js';
import { buildSqlUserPrompt } from '../prompts/sqlPrompt.js';
import type { AssessAnswerParams } from '../types.js';
import { buildScoredEvaluation, type ScoredEvaluation } from './evaluationShape.js';
import { parseLlmJson } from './jsonParser.js';

/**
 * Führt den LLM-basierten Bewertungs-Call für Freitext- oder SQL-Antworten durch.
 * Erwartet, dass das Routing (MC/Tabelle/Diagramm-Sonderfälle) bereits durch
 * den Caller erfolgt ist.
 */
export async function gradeTextAnswer(
  params: AssessAnswerParams,
  apiKey: string,
  meta: ProviderMeta,
): Promise<ScoredEvaluation> {
  const userPrompt =
    params.taskType === 'sql' ? buildSqlUserPrompt(params) : buildFreitextUserPrompt(params);
  const systemPrompt = buildGradingSystemPrompt(params.examPart, params.scenarioContext);
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  const raw = await callAiProvider(fullPrompt, apiKey, meta);
  const parsed = parseLlmJson(raw);
  return buildScoredEvaluation(parsed, params.maxPoints, meta.textModel);
}
