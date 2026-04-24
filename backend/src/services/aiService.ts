/**
 * services/aiService.ts — Backward-Compatibility-Shim.
 *
 * Die eigentliche AI-Layer-Implementation wohnt seit Runde 3 in `src/ai/`,
 * aufgeteilt in providers/ + prompts/ + grading/. Diese Datei re-exportiert
 * die bekannten Symbole, damit bestehende Imports in den Route-Modulen
 * (evaluationRoutes, secondOpinionRoutes, scenarios) ohne Sofort-Anpassung
 * weiter funktionieren.
 *
 * Neuer Code sollte direkt von `src/ai/index.ts` importieren.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

export {
  callAiProvider,
  assessFreitext,
  analyzeDiagram,
  type AssessAnswerParams,
  type AnalyzeDiagramParams,
} from '../ai/index.js';
