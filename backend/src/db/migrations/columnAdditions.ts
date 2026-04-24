/**
 * db/migrations/columnAdditions.ts — Idempotente ALTER TABLE ADD COLUMN-Migrationen.
 *
 * Jede Funktion kapselt eine einzelne Schema-Ergänzung. Alle Aufrufe sind
 * idempotent: SQLite wirft beim zweiten ADD COLUMN einen Fehler, den wir
 * absichtlich schlucken — das ist hier das etablierte Muster für "Migration
 * bereits angewendet".
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { db } from '../connection.js';

/** Führt eine idempotente DDL-Änderung aus; "already exists"-Fehler werden geschluckt. */
function safeExec(sql: string): void {
  try {
    db.exec(sql);
  } catch {
    // Spalte/Index existiert bereits — erwartet.
  }
}

export function addAiAgentColumn(): void {
  safeExec('ALTER TABLE ai_evaluations ADD COLUMN ai_agent TEXT');
}

export function addSpecialtyColumns(): void {
  safeExec("ALTER TABLE tasks ADD COLUMN specialty TEXT NOT NULL DEFAULT 'fiae'");
  safeExec('CREATE INDEX IF NOT EXISTS idx_tasks_specialty ON tasks(part, specialty)');
  safeExec("ALTER TABLE exam_sessions ADD COLUMN specialty TEXT NOT NULL DEFAULT 'fiae'");
}

export function addTaskKindColumn(): void {
  safeExec("ALTER TABLE tasks ADD COLUMN task_kind TEXT NOT NULL DEFAULT 'text'");
  safeExec('CREATE INDEX IF NOT EXISTS idx_tasks_kind ON tasks(part, specialty, task_kind)');
}

export function addSessionOverrideExpectedAnswer(): void {
  safeExec('ALTER TABLE session_subtask_overrides ADD COLUMN expected_answer TEXT');
}

/** Führt alle Spalten-Migrationen in definierter Reihenfolge aus. */
export function runColumnAdditions(): void {
  addAiAgentColumn();
  addSpecialtyColumns();
  addTaskKindColumn();
  addSessionOverrideExpectedAnswer();
}
