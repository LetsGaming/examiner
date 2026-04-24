/**
 * db/migrations/index.ts — Orchestrator aller Migrationen.
 *
 * Reihenfolge ist kritisch:
 *   1. subtasksRebuild   — muss vor anderen Spalten-Migrationen laufen, weil
 *                          sie die Tabelle ggf. komplett neu aufbaut.
 *   2. columnAdditions   — idempotent, kann bei jedem Start neu laufen.
 *   3. reclassifyTasks   — braucht task_kind-Spalte (aus columnAdditions).
 *   4. seedLocalUser     — muss nach users-Tabelle existieren (nach
 *                          initialSchema + ggf. Migrationen).
 *
 * `migrateAiEvaluationsRemoveUnique` wird NICHT automatisch hier aufgerufen,
 * weil es in der bestehenden Codebase explizit vom Caller getriggert wird
 * (siehe server.ts / Admin-Route). Diese API bleibt separat importierbar.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { runColumnAdditions } from './columnAdditions.js';
import { runReclassificationSafely } from './reclassifyTasks.js';
import { seedLocalUser } from './seedData.js';
import { runSubtasksRebuildMigration } from './subtasksRebuild.js';

export { migrateAiEvaluationsRemoveUnique } from './evalUniqueRemoval.js';
export { reclassifyExistingTasks } from './reclassifyTasks.js';

export function runAllMigrations(): void {
  runSubtasksRebuildMigration();
  runColumnAdditions();
  runReclassificationSafely();
  seedLocalUser();
}
