/**
 * db/migrations/subtasksRebuild.ts — Migration der subtasks-Tabelle.
 *
 * SQLite kann CHECK-Constraints nicht per ALTER TABLE ändern. Strategie:
 *   1. Probe-Insert: Testet, ob der aktuelle CHECK-Constraint neue task_types
 *      ('sql', 'mc_multi', 'table') bereits erlaubt. Wenn ja → kein Rebuild.
 *   2. Andernfalls: Atomarer Tabellen-Rebuild in einer Transaktion.
 *   3. Danach sicherstellen, dass die `table_config`-Spalte existiert
 *      (separater ALTER, idempotent).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { db } from '../connection.js';

export function runSubtasksRebuildMigration(): void {
  if (subtasksCheckAcceptsNewTypes()) {
    ensureTableConfigColumn();
    return;
  }

  console.log('[migration] Starte subtasks-Tabellen-Migration...');
  rebuildSubtasksTable();
  console.log('[migration] subtasks-Migration abgeschlossen.');
}

/**
 * Probe-Insert: versucht, einen Subtask mit task_type='sql' anzulegen.
 * FOREIGN KEY wird kurz deaktiviert, weil die task_id-Referenz 'nonexistent'
 * sonst failt. Erfolg bedeutet: CHECK-Constraint kennt alle neuen Typen.
 */
function subtasksCheckAcceptsNewTypes(): boolean {
  const testId = `migration-probe-${Date.now()}`;
  try {
    db.pragma('foreign_keys = OFF');
    db.prepare(
      `INSERT INTO subtasks (id, task_id, label, task_type, question_text, points, position)
       VALUES (?, 'nonexistent', 'x', 'sql', 'x', 0, 0)`,
    ).run(testId);
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(testId);
    return true;
  } catch {
    return false;
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

function ensureTableConfigColumn(): void {
  try {
    db.exec('ALTER TABLE subtasks ADD COLUMN table_config TEXT DEFAULT NULL');
  } catch {
    // Spalte existiert bereits — erwartet und OK.
  }
}

function rebuildSubtasksTable(): void {
  db.transaction(() => {
    // Hinterlassenschaften vorheriger fehlgeschlagener Versuche bereinigen
    db.exec('DROP TABLE IF EXISTS subtasks_new');

    db.exec(`
      CREATE TABLE subtasks_new (
        id                TEXT PRIMARY KEY,
        task_id           TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        label             TEXT NOT NULL,
        task_type         TEXT NOT NULL CHECK(task_type IN ('freitext','pseudocode','sql','mc','mc_multi','plantuml','diagram_upload','table')),
        question_text     TEXT NOT NULL,
        expected_answer   TEXT NOT NULL DEFAULT '{}',
        points            INTEGER NOT NULL,
        diagram_type      TEXT,
        expected_elements TEXT DEFAULT '[]',
        mc_options        TEXT DEFAULT '[]',
        table_config      TEXT DEFAULT NULL,
        position          INTEGER NOT NULL DEFAULT 0
      )
    `);

    db.exec(`
      INSERT INTO subtasks_new
        (id, task_id, label, task_type, question_text, expected_answer,
         points, diagram_type, expected_elements, mc_options, position)
      SELECT
        id, task_id, label, task_type, question_text, expected_answer,
        points, diagram_type, expected_elements, mc_options, position
      FROM subtasks
    `);

    db.exec('DROP TABLE subtasks');
    db.exec('ALTER TABLE subtasks_new RENAME TO subtasks');
    db.exec('CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id)');
  })();
}
