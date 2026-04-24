/**
 * db/database.ts — Backward-Compatibility-Shim.
 *
 * Die eigentliche DB-Layer-Implementation wohnt seit Runde 4 in den
 * Geschwister-Modulen dieses Verzeichnisses (connection, schema/, migrations/,
 * assembly/, poolConfig, init). Dieser File re-exportiert die bekannten Symbole,
 * damit bestehende Imports in den Routes ohne Sofort-Anpassung weiter funktionieren.
 *
 * Neuer Code sollte direkt von `src/db/index.js` importieren.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

export {
  db,
  initDatabase,
  REQUIRED_TASKS,
  GENERATE_COUNT,
  canAssembleExam,
  assembleExam,
  classifyTaskFromSubtasks,
  reclassifyExistingTasks,
  migrateAiEvaluationsRemoveUnique,
  type TaskKind,
  type ClassifySubtask,
  type AssembledTask,
  type AssembleResult,
  type DatabaseType,
} from './index.js';
