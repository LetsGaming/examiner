/**
 * services/examGenerator.ts — Backward-Compatibility-Shim.
 *
 * Die eigentliche Generator-Implementation wohnt seit Runde 2 in `src/generator/`,
 * aufgeteilt in recipes/ + core/ + types.ts. Diese Datei re-exportiert die
 * bekannten Symbole, damit bestehende Imports in den Route-Modulen
 * (poolRoutes, practiceRoutes, routeHelpers) ohne Sofort-Anpassung weiter
 * funktionieren.
 *
 * Neuer Code sollte direkt von `src/generator/index.ts` importieren.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

export {
  generateOneTask,
  generateTasksForPool,
  type GeneratedSubTask,
  type GeneratedTask,
  type GeneratePoolResult,
  type SubtaskSpec,
  type TableKind,
  type TaskRecipe,
  type TaskSource,
  type TaskWarning,
  // Legacy-Szenario-Re-Exports (alte Importe aus examGenerator)
  SCENARIOS,
  applyScenario,
  generateScenarioForTasks,
  pickRandomFallbackScenario,
  type Scenario,
} from '../generator/index.js';
