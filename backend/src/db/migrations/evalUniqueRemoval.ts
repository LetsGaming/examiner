/**
 * db/migrations/evalUniqueRemoval.ts — Entfernt UNIQUE(answer_id) auf ai_evaluations.
 *
 * Hintergrund (Feature 9 "Zweitbewertung"): Mehrere AI-Bewertungen pro Antwort
 * müssen möglich sein. SQLite kann UNIQUE nicht per ALTER TABLE entfernen,
 * daher Tabellen-Rebuild.
 *
 * Erkennungsstrategie: Probe-Insert einer zweiten Zeile mit identischer
 * answer_id. Schlägt fehl → UNIQUE noch aktiv → Rebuild nötig.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { db } from '../connection.js';

interface ProbeRow {
  id: string;
}

export function migrateAiEvaluationsRemoveUnique(): void {
  if (isUniqueConstraintAbsent()) {
    return;
  }
  rebuildAiEvaluationsTable();
  console.log('[db] ai_evaluations UNIQUE-Constraint entfernt.');
}

/**
 * Versucht, einen zweiten Eintrag mit derselben answer_id einzufügen.
 * Erfolg → UNIQUE ist bereits weg (oder Tabelle ist leer). Rollback der Probe
 * via DELETE mit Marker im model_used-Feld.
 */
function isUniqueConstraintAbsent(): boolean {
  try {
    db.pragma('foreign_keys = OFF');
    const probe = db.prepare('SELECT id FROM ai_evaluations LIMIT 1').get() as
      | ProbeRow
      | undefined;
    if (!probe) return true; // Tabelle leer → Rebuild unnötig

    db.prepare(
      `INSERT INTO ai_evaluations (answer_id, awarded_points, max_points, percentage_score, ihk_grade, feedback_text, model_used)
       VALUES ((SELECT answer_id FROM ai_evaluations WHERE id = ?), 0, 0, 0, 'sehr_gut', '', '_probe')`,
    ).run(probe.id);
    db.prepare(`DELETE FROM ai_evaluations WHERE model_used = '_probe'`).run();
    return true;
  } catch {
    return false;
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

function rebuildAiEvaluationsTable(): void {
  db.transaction(() => {
    db.exec('DROP TABLE IF EXISTS ai_evaluations_new');
    db.exec(`
      CREATE TABLE ai_evaluations_new (
        id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        answer_id         TEXT NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
        awarded_points    INTEGER NOT NULL,
        max_points        INTEGER NOT NULL,
        percentage_score  REAL NOT NULL,
        ihk_grade         TEXT NOT NULL,
        feedback_text     TEXT NOT NULL,
        criterion_scores  TEXT NOT NULL DEFAULT '[]',
        key_mistakes      TEXT NOT NULL DEFAULT '[]',
        improvement_hints TEXT NOT NULL DEFAULT '[]',
        detected_elements TEXT DEFAULT '[]',
        missing_elements  TEXT DEFAULT '[]',
        notation_errors   TEXT DEFAULT '[]',
        model_used        TEXT NOT NULL,
        ai_agent          TEXT,
        created_at        TEXT DEFAULT (datetime('now'))
      )
    `);
    db.exec('INSERT INTO ai_evaluations_new SELECT * FROM ai_evaluations');
    db.exec('DROP TABLE ai_evaluations');
    db.exec('ALTER TABLE ai_evaluations_new RENAME TO ai_evaluations');
    db.exec('CREATE INDEX IF NOT EXISTS idx_eval_answer ON ai_evaluations(answer_id)');
  })();
}
