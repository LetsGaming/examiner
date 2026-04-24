/**
 * generator/index.ts — Öffentliche API des Aufgabengenerator-Moduls.
 *
 * Ersetzt die frühere Monolith-Datei `services/examGenerator.ts`. Externe Module
 * (routes/poolRoutes.ts, routes/routeHelpers.ts, routes/practiceRoutes.ts)
 * importieren ausschließlich von hier.
 *
 * Interne Struktur:
 *   types.ts         → TaskRecipe, SubtaskSpec, GeneratedTask, GeneratedSubTask
 *   recipes/         → Rezept-Register (Teil 1/2/3) + selectRecipe + isWisoRecipe
 *   core/labels.ts   → assignLabels, resolvePoints
 *   core/schema.ts   → buildSubtaskSchema, buildTableSchemaHint
 *   core/promptBuilder → buildSystemPrompt, buildUserPrompt, buildSubtaskInstructions
 *   core/parser.ts   → safeParseTask
 *   core/validator.ts → validateSubtask
 *   core/fallback.ts → buildFallbackTask
 *   core/generator.ts → generateOneTask, generateTasksForPool
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

// ─── Haupt-API: Generierung ──────────────────────────────────────────────────
export {
  generateOneTask,
  generateTasksForPool,
  type GeneratePoolResult,
  type TaskSource,
  type TaskWarning,
} from './core/generator.js';

// ─── Typen für Consumer ──────────────────────────────────────────────────────
export type {
  GeneratedSubTask,
  GeneratedTask,
  SubtaskSpec,
  TableKind,
  TaskRecipe,
} from './types.js';

// ─── Scenarios (Legacy-Re-Export für Kompatibilität) ─────────────────────────
// Alte Stellen im Code importieren Scenario-Funktionen aus examGenerator —
// bis zur vollständigen Umstellung der Routen leiten wir weiter.
export {
  SCENARIOS,
  applyScenario,
  generateScenarioForTasks,
  pickRandomFallbackScenario,
  type Scenario,
} from '../services/scenarios.js';
