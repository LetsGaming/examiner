/**
 * ai/index.ts — Öffentliche Facade des AI-Layer-Moduls.
 *
 * Ersetzt die frühere Monolith-Datei `services/aiService.ts`. Externe Module
 * (routes/evaluationRoutes.ts, routes/secondOpinionRoutes.ts, generator/) importieren
 * ausschließlich von hier.
 *
 * Dispatching in `assessFreitext`:
 *   taskType === 'table'    → gradeTableAnswer (LLM-basiert)
 *   taskType === 'mc'       → gradeMcAnswer (deterministisch, kontext-aware IDs)
 *   taskType === 'mc_multi' → gradeMcMultiAnswer (deterministisch, mit Teilpunkten)
 *   taskType === 'sql' | sonst → gradeTextAnswer (LLM mit SQL- oder Freitext-Prompt)
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ProviderMeta } from '../routes/settingsRoutes.js';
import { callAiProvider } from './providers/dispatcher.js';
import { gradeDiagramAnswer, type DiagramEvaluation } from './grading/diagramGrader.js';
import { gradeTextAnswer } from './grading/freitextGrader.js';
import { gradeMcAnswer, gradeMcMultiAnswer } from './grading/mcGrader.js';
import { gradeTableAnswer } from './grading/tableGrader.js';
import type { ScoredEvaluation } from './grading/evaluationShape.js';
import type { AnalyzeDiagramParams, AssessAnswerParams } from './types.js';

// ─── Typen (öffentliche Re-Exports) ──────────────────────────────────────────
export type { AssessAnswerParams, AnalyzeDiagramParams };
export type { ScoredEvaluation };
export type { DiagramEvaluation };

// ─── Provider-Dispatcher (einziger Pfad für externe KI-Requests) ────────────
export { callAiProvider };

// ─── Default-MC-Option-IDs für Backward-Compatibility ────────────────────────
// Routes, die `mcOptionIds` nicht setzen (alt), bekommen die Teil-1/2-Konvention.
// Neue/angepasste Routes sollen die tatsächlichen IDs aus der DB-Subtask
// weiterreichen — WiSo-Subtasks (MD §5.3) nutzen "1"–"5".
const DEFAULT_MC_IDS = ['A', 'B', 'C', 'D'];

/**
 * Bewertet eine Nicht-Diagramm-Antwort. Dispatcht nach taskType auf den
 * passenden Grader.
 */
export async function assessFreitext(
  params: AssessAnswerParams,
  apiKey: string,
  meta: ProviderMeta,
): Promise<ScoredEvaluation> {
  switch (params.taskType) {
    case 'table':
      return gradeTableAnswer(params, apiKey, meta);
    case 'mc':
      return gradeMcAnswer({
        selectedOptionId: params.studentAnswer,
        expectedAnswer: params.expectedAnswer,
        maxPoints: params.maxPoints,
        mcOptionIds: params.mcOptionIds ?? DEFAULT_MC_IDS,
      });
    case 'mc_multi':
      return gradeMcMultiAnswer({
        studentSelectionRaw: params.studentAnswer,
        mcOptionIds: params.mcOptionIds ?? DEFAULT_MC_IDS,
        expectedAnswer: params.expectedAnswer,
        maxPoints: params.maxPoints,
      });
    default:
      // 'freitext', 'sql', 'pseudocode' — gehen durch den Text-Grader,
      // der intern bei 'sql' auf das SQL-Prompt-Schema umschaltet.
      return gradeTextAnswer(params, apiKey, meta);
  }
}

/**
 * Bewertet ein UML-/ER-Diagramm (PlantUML-Code ODER Bild-Upload).
 * Dispatching auf Vision-Modell passiert im Provider-Dispatcher anhand
 * des Vorliegens von `imageBase64`.
 */
export async function analyzeDiagram(
  params: AnalyzeDiagramParams,
  apiKey: string,
  meta: ProviderMeta,
): Promise<DiagramEvaluation> {
  return gradeDiagramAnswer(params, apiKey, meta);
}
