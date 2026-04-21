import DatabaseConstructor from "better-sqlite3"; // Import the default constructor
import type { Database as DatabaseType } from "better-sqlite3"; // Import the Type
import path from "path";
import fs from "fs";
import { SCENARIOS } from "../services/examGenerator.js";
import type { Scenario } from "../services/examGenerator.js";

const DB_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "fiae_ap2.db");
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

// Explicitly type the exported variable
export const db: DatabaseType = new DatabaseConstructor(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
export function initDatabase(): void {
  db.exec(`
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
      created_at           TEXT DEFAULT (datetime('now')),
      times_used           INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      task_id           TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      label             TEXT NOT NULL,
      task_type         TEXT NOT NULL CHECK(task_type IN ('freitext','pseudocode','mc','plantuml','diagram_upload')),
      question_text     TEXT NOT NULL,
      expected_answer   TEXT NOT NULL DEFAULT '{}',
      points            INTEGER NOT NULL,
      diagram_type      TEXT,
      expected_elements TEXT DEFAULT '[]',
      mc_options        TEXT DEFAULT '[]',
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
      created_at        TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_part    ON tasks(part);
    CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_session_tasks ON session_tasks(session_id);
    CREATE INDEX IF NOT EXISTS idx_answers_sess  ON answers(session_id);
    CREATE INDEX IF NOT EXISTS idx_eval_answer   ON ai_evaluations(answer_id);

    -- Szenario-spezifische Aufgabentexte je Session (Platzhalter ersetzt)
    CREATE TABLE IF NOT EXISTS session_subtask_overrides (
      session_id    TEXT NOT NULL,
      subtask_id    TEXT NOT NULL,
      question_text TEXT NOT NULL,
      PRIMARY KEY (session_id, subtask_id)
    );

    CREATE INDEX IF NOT EXISTS idx_overrides_sess  ON session_subtask_overrides(session_id);
  `);

  db.prepare(
    `
    INSERT OR IGNORE INTO users (id, email, display_name, password_hash)
    VALUES ('local-user', 'local@localhost', 'Lokaler Nutzer', 'local-no-password')
  `,
  ).run();
}

// ─── Prüfung-Struktur ─────────────────────────────────────────────────────────

const STRUCTURES: Record<string, { minPoints: number; maxPoints: number }[]> = {
  teil_1: [
    { minPoints: 20, maxPoints: 30 },
    { minPoints: 20, maxPoints: 30 },
    { minPoints: 18, maxPoints: 28 },
    { minPoints: 15, maxPoints: 25 },
  ],
  teil_2: [
    { minPoints: 20, maxPoints: 30 },
    { minPoints: 18, maxPoints: 28 },
    { minPoints: 18, maxPoints: 28 },
    { minPoints: 15, maxPoints: 25 },
  ],
  teil_3: [
    { minPoints: 8, maxPoints: 15 },
    { minPoints: 8, maxPoints: 15 },
    { minPoints: 8, maxPoints: 15 },
    { minPoints: 8, maxPoints: 15 },
    { minPoints: 8, maxPoints: 15 },
    { minPoints: 10, maxPoints: 20 },
    { minPoints: 10, maxPoints: 20 },
    { minPoints: 8, maxPoints: 15 },
  ],
};

// Anzahl der benötigten Aufgaben pro Teil
export const REQUIRED_TASKS: Record<string, number> = {
  teil_1: 4,
  teil_2: 4,
  teil_3: 8,
};

// Wie viele neue Tasks generiert werden sollen wenn der Pool leer/knapp ist
export const GENERATE_COUNT: Record<string, number> = {
  teil_1: 6,
  teil_2: 6,
  teil_3: 12, // FIX: War 6, aber 8 Slots benötigt → großzügiger generieren
};

// ─── Pool-Status ──────────────────────────────────────────────────────────────

export function canAssembleExam(part: string): boolean {
  const structure = STRUCTURES[part];
  if (!structure) return false;
  const usedTopics = new Set<string>();
  const usedIds: string[] = [];

  for (const slot of structure) {
    const usedIdStr = usedIds.map((id) => `'${id}'`).join(",") || "''";
    const topicEx =
      usedTopics.size > 0
        ? `AND topic_area NOT IN (${[...usedTopics].map((t) => `'${t.replace(/'/g, "''")}'`).join(",")})`
        : "";

    const candidate = db
      .prepare(
        `
      SELECT id, topic_area FROM tasks
      WHERE part = ? AND points_value BETWEEN ? AND ?
        AND id NOT IN (${usedIdStr}) ${topicEx}
      ORDER BY times_used ASC, RANDOM() LIMIT 1
    `,
      )
      .get(part, slot.minPoints, slot.maxPoints) as
      | { id: string; topic_area: string }
      | undefined;

    const fallback =
      candidate ??
      (db
        .prepare(
          `
      SELECT id, topic_area FROM tasks
      WHERE part = ? AND points_value BETWEEN ? AND ?
        AND id NOT IN (${usedIdStr})
      ORDER BY times_used ASC, RANDOM() LIMIT 1
    `,
        )
        .get(part, slot.minPoints, slot.maxPoints) as
        | { id: string; topic_area: string }
        | undefined);

    if (!fallback) return false;
    usedIds.push(fallback.id);
    usedTopics.add(fallback.topic_area);
  }
  return true;
}

// ─── Prüfung zusammenstellen ──────────────────────────────────────────────────
// FIX: Szenario wird hier zufällig gewählt und Platzhalter in allen Subtasks ersetzt.
// Das bedeutet jede Prüfung hat eine andere Ausgangssituation — auch wenn dieselben
// Aufgaben aus dem Pool gewählt werden.

export function assembleExam(part: string): {
  tasks: Record<string, unknown>[];
  totalPoints: number;
  scenarioName: string;
  scenarioDescription: string;
} | null {
  const structure = STRUCTURES[part];
  if (!structure) return null;

  // Szenario zufällig wählen — jede Prüfung bekommt ein anderes
  const scenario: Scenario =
    SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];

  const usedTopics = new Set<string>();
  const selectedTasks: Record<string, unknown>[] = [];

  for (const slot of structure) {
    const usedIds = selectedTasks.map((t) => `'${t.id}'`).join(",") || "''";
    const topicEx =
      usedTopics.size > 0
        ? `AND topic_area NOT IN (${[...usedTopics].map((t) => `'${t.replace(/'/g, "''")}'`).join(",")})`
        : "";

    const candidate = db
      .prepare(
        `
      SELECT * FROM tasks
      WHERE part = ? AND points_value BETWEEN ? AND ?
        AND id NOT IN (${usedIds}) ${topicEx}
      ORDER BY times_used ASC, RANDOM() LIMIT 1
    `,
      )
      .get(part, slot.minPoints, slot.maxPoints) as
      | Record<string, unknown>
      | undefined;

    const task =
      candidate ??
      (db
        .prepare(
          `
      SELECT * FROM tasks
      WHERE part = ? AND points_value BETWEEN ? AND ?
        AND id NOT IN (${usedIds})
      ORDER BY times_used ASC, RANDOM() LIMIT 1
    `,
        )
        .get(part, slot.minPoints, slot.maxPoints) as
        | Record<string, unknown>
        | undefined);

    if (!task) return null;
    selectedTasks.push(task);
    usedTopics.add(task.topic_area as string);
  }

  const totalPoints = selectedTasks.reduce(
    (s, t) => s + (t.points_value as number),
    0,
  );

  return {
    tasks: selectedTasks,
    totalPoints,
    scenarioName: scenario.name,
    scenarioDescription: scenario.description,
    // Szenario-Objekt mitgeben für Platzhalter-Ersetzung in Routes
    _scenario: scenario,
  } as Record<string, unknown> & {
    tasks: Record<string, unknown>[];
    totalPoints: number;
    scenarioName: string;
    scenarioDescription: string;
  };
}
