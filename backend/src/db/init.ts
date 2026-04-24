/**
 * db/init.ts — Initialisierung der Datenbank beim App-Start.
 *
 * Reihenfolge:
 *   1. applyInitialSchema()  — CREATE TABLE IF NOT EXISTS für alle Tabellen
 *   2. runAllMigrations()    — Rebuild-Migration + Column-Migrationen + Reklassifikation + Seed
 *
 * `migrateAiEvaluationsRemoveUnique` wird NICHT automatisch ausgeführt
 * (Legacy-Verhalten: wird separat vom Admin getriggert).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { runAllMigrations } from './migrations/index.js';
import { applyInitialSchema } from './schema/initialSchema.js';

export function initDatabase(): void {
  applyInitialSchema();
  runAllMigrations();
}
