/**
 * db/index.ts — Öffentliche Facade des DB-Moduls.
 *
 * Ersetzt die frühere Monolith-Datei `db/database.ts` (673 LOC). Externe
 * Module (routes/*, routeHelpers, server.ts) importieren ausschließlich
 * von hier.
 *
 * Interne Struktur:
 *   connection.ts              → SQLite-Instanz + Pragmas
 *   schema/initialSchema.ts    → CREATE TABLE IF NOT EXISTS
 *   migrations/                → Subtasks-Rebuild + Spalten + Reklassifikation + Seed
 *   poolConfig.ts              → REQUIRED_TASKS, GENERATE_COUNT, SLOT_PROFILES
 *   assembly/slotMatcher.ts    → probeSlotTask (DRY für canAssemble + assemble)
 *   assembly/slotFiller.ts     → fillSlots (gemeinsame Slot-Schleife)
 *   assembly/canAssemble.ts    → canAssembleExam
 *   assembly/assembleExam.ts   → assembleExam, AssembledTask
 *   init.ts                    → initDatabase-Orchestrator
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

// ─── DB-Instanz ──────────────────────────────────────────────────────────────
export { db, type DatabaseType } from './connection.js';

// ─── Initialisierung ─────────────────────────────────────────────────────────
export { initDatabase } from './init.js';

// ─── Pool-Konfiguration ──────────────────────────────────────────────────────
export { REQUIRED_TASKS, GENERATE_COUNT, type SlotSpec } from './poolConfig.js';

// ─── Exam-Assembly ───────────────────────────────────────────────────────────
export { canAssembleExam } from './assembly/canAssemble.js';
export { assembleExam, type AssembledTask, type AssembleResult } from './assembly/assembleExam.js';

// ─── Classification (re-export aus services/taskKind.ts für BC) ──────────────
export type { TaskKind, ClassifySubtask } from '../services/taskKind.js';
export { classifyTaskFromSubtasks } from '../services/taskKind.js';

// ─── Migrations (explizit aufrufbare) ────────────────────────────────────────
export { reclassifyExistingTasks, migrateAiEvaluationsRemoveUnique } from './migrations/index.js';
