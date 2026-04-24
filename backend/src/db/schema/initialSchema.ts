/**
 * db/schema/initialSchema.ts — Initial-Schema (CREATE TABLE IF NOT EXISTS).
 *
 * Wird von `initDatabase()` beim App-Start aufgerufen. Idempotent: existierende
 * Tabellen werden nicht angefasst. Schema-Änderungen an bestehenden Tabellen
 * leben in `db/migrations/` und werden nach diesem File ausgeführt.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { db } from '../connection.js';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id                   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  part                 TEXT NOT NULL CHECK(part IN ('teil_1','teil_2','teil_3')),
  topic_area           TEXT NOT NULL,
  points_value         INTEGER NOT NULL,
  difficulty           TEXT NOT NULL DEFAULT 'medium',
  -- scenario_context/description werden nicht mehr im Task gespeichert —
  -- sie werden beim Zusammenstellen dynamisch zugewiesen
  scenario_context     TEXT,
  scenario_description TEXT,
  -- task_kind: Grobe Klassifikation der Aufgaben-Art (diagram > calc > sql > code > table > text).
  -- Wird von assembleExam für die typ-balancierte Zusammenstellung genutzt.
  task_kind            TEXT NOT NULL DEFAULT 'text',
  created_at           TEXT DEFAULT (datetime('now')),
  times_used           INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS subtasks (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
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
);

CREATE TABLE IF NOT EXISTS exam_sessions (
  id                   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  part                 TEXT NOT NULL CHECK(part IN ('teil_1','teil_2','teil_3')),
  title                TEXT NOT NULL,
  scenario_name        TEXT,
  scenario_description TEXT,
  duration_minutes     INTEGER NOT NULL,
  max_points           INTEGER NOT NULL,
  started_at           TEXT DEFAULT (datetime('now')),
  submitted_at         TEXT,
  status               TEXT NOT NULL DEFAULT 'in_progress'
                         CHECK(status IN ('in_progress','submitted','graded')),
  total_score          INTEGER,
  ihk_grade            TEXT
);

CREATE TABLE IF NOT EXISTS session_tasks (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id TEXT NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  task_id    TEXT NOT NULL REFERENCES tasks(id),
  position   INTEGER NOT NULL,
  UNIQUE(session_id, task_id),
  UNIQUE(session_id, position)
);

CREATE TABLE IF NOT EXISTS answers (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id          TEXT NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  subtask_id          TEXT NOT NULL REFERENCES subtasks(id),
  text_value          TEXT DEFAULT '',
  selected_mc_option  TEXT,
  diagram_image_path  TEXT,
  answered_at         TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_evaluations (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  answer_id         TEXT NOT NULL UNIQUE REFERENCES answers(id) ON DELETE CASCADE,
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
);

CREATE INDEX IF NOT EXISTS idx_tasks_part    ON tasks(part);
CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_session_tasks ON session_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_sess  ON answers(session_id);
CREATE INDEX IF NOT EXISTS idx_eval_answer   ON ai_evaluations(answer_id);

-- Bookkeeping für manuelle Migrationen (aktuell ungenutzt, steht bereit)
CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY);

-- Szenario-spezifische Aufgabentexte je Session (Platzhalter ersetzt).
CREATE TABLE IF NOT EXISTS session_subtask_overrides (
  session_id       TEXT NOT NULL,
  subtask_id       TEXT NOT NULL,
  question_text    TEXT NOT NULL,
  expected_answer  TEXT,
  PRIMARY KEY (session_id, subtask_id)
);

CREATE INDEX IF NOT EXISTS idx_overrides_sess ON session_subtask_overrides(session_id);
`;

export function applyInitialSchema(): void {
  db.exec(SCHEMA_SQL);
}
