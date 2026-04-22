import DatabaseConstructor from "better-sqlite3"; // Import the default constructor
import type { Database as DatabaseType } from "better-sqlite3"; // Import the Type
import path from "path";
import fs from "fs";
import type { TaskKind } from "../services/taskKind.js";

const DB_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, process.env.DB_FILENAME ?? "ap2_trainer.db");
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
      -- task_kind: Grobe Klassifikation der Aufgaben-Art, für die typ-balancierte
      -- Zusammenstellung in assembleExam. Mögliche Werte:
      --   'diagram'    — enthält mindestens eine UML-/ER-/Mockup-Skizze
      --   'table'      — enthält eine ausfüllbare Tabellen-Aufgabe
      --   'sql'        — enthält SQL-Aufgabe(n) (Teil 2)
      --   'calc'       — enthält Berechnungsaufgabe (Speicher, Kosten, Netzplan)
      --   'code'       — enthält Pseudocode-Aufgabe (Teil 2)
      --   'text'       — reine Freitext-Aufgabe (Default, ~40% der realen IHK-Prüfungen)
      -- Eine Aufgabe kann mehrere Qualitäten haben; der kind wird nach Priorität
      -- gewählt (diagram > calc > sql > code > table > text).
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

    -- Migration: table_config Spalte (idempotent via try/catch in initDatabase)
    CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY);

    -- Szenario-spezifische Aufgabentexte je Session (Platzhalter ersetzt)
    CREATE TABLE IF NOT EXISTS session_subtask_overrides (
      session_id    TEXT NOT NULL,
      subtask_id    TEXT NOT NULL,
      question_text TEXT NOT NULL,
      PRIMARY KEY (session_id, subtask_id)
    );

    CREATE INDEX IF NOT EXISTS idx_overrides_sess  ON session_subtask_overrides(session_id);
  `);

  // ─── Migration: subtasks CHECK-Constraint und table_config ─────────────────
  // SQLite kann CHECK-Constraints nicht per ALTER TABLE ändern.
  // Strategie:
  //   1. Prüfe ob 'table' bereits im CHECK erlaubt ist (Probe-Insert).
  //   2. Falls ja: nur table_config Spalte ergänzen falls noch nicht vorhanden.
  //   3. Falls nein: Tabelle atomar neu erstellen.
  //      - subtasks_new zuerst droppen falls ein vorheriger fehlgeschlagener
  //        Versuch sie hinterlassen hat (das war der UNIQUE constraint Fehler).
  //      - Alles in einer Transaktion, damit kein Halbzustand entsteht.

  const needsRebuild = (() => {
    try {
      const testId = "migration-probe-" + Date.now();
      // FOREIGN KEY ist ON — task_id 'nonexistent' würde scheitern, daher kurz deaktivieren
      db.pragma("foreign_keys = OFF");
      db.prepare(
        `INSERT INTO subtasks (id, task_id, label, task_type, question_text, points, position)
         VALUES (?, 'nonexistent', 'x', 'sql', 'x', 0, 0)`,
      ).run(testId);
      db.prepare("DELETE FROM subtasks WHERE id = ?").run(testId);
      db.pragma("foreign_keys = ON");
      return false; // 'sql' ist bereits erlaubt → CHECK ist aktuell
    } catch {
      db.pragma("foreign_keys = ON");
      return true; // CHECK schlägt fehl → Rebuild nötig (alte Installation ohne 'sql'/'mc_multi')
    }
  })();

  if (needsRebuild) {
    console.log("[migration] Starte subtasks-Tabellen-Migration...");
    db.transaction(() => {
      // Hinterlassenschaften vorheriger fehlgeschlagener Versuche bereinigen
      db.exec("DROP TABLE IF EXISTS subtasks_new");

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

      db.exec("DROP TABLE subtasks");
      db.exec("ALTER TABLE subtasks_new RENAME TO subtasks");
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id)",
      );
    })();
    console.log("[migration] subtasks-Migration abgeschlossen.");
  } else {
    // Tabelle hat korrekten CHECK — nur table_config Spalte ergänzen falls fehlend
    try {
      db.exec("ALTER TABLE subtasks ADD COLUMN table_config TEXT DEFAULT NULL");
    } catch {
      /* bereits vorhanden — ignorieren */
    }
  }

  // ─── Migration: ai_agent Spalte in ai_evaluations ────────────────────────
  try {
    db.exec("ALTER TABLE ai_evaluations ADD COLUMN ai_agent TEXT");
  } catch {
    /* bereits vorhanden — ignorieren */
  }

  // ─── Migration: specialty Spalte in tasks + exam_sessions ────────────────
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN specialty TEXT NOT NULL DEFAULT 'fiae'");
    db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_specialty ON tasks(part, specialty)");
  } catch {
    /* bereits vorhanden — ignorieren */
  }
  try {
    db.exec("ALTER TABLE exam_sessions ADD COLUMN specialty TEXT NOT NULL DEFAULT 'fiae'");
  } catch {
    /* bereits vorhanden — ignorieren */
  }

  // ─── Migration: task_kind Spalte für typ-balancierte Zusammenstellung ─────
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN task_kind TEXT NOT NULL DEFAULT 'text'");
    db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_kind ON tasks(part, specialty, task_kind)");
  } catch {
    /* bereits vorhanden — ignorieren */
  }
  // Bestehende Aufgaben rückwirkend klassifizieren (lookup über subtasks).
  // Das läuft bei jedem Start und ist idempotent: task_kind wird nur gesetzt,
  // wenn die aktuelle Klassifikation "text" ist (Default oder noch ungesetzt).
  try {
    reclassifyExistingTasks();
  } catch (err) {
    console.warn("[db] Reklassifizierung alter Tasks fehlgeschlagen:", err);
  }

  db.prepare(
    `
    INSERT OR IGNORE INTO users (id, email, display_name, password_hash)
    VALUES ('local-user', 'local@localhost', 'Lokaler Nutzer', 'local-no-password')
  `,
  ).run();
}

// ─── Prüfung-Struktur ─────────────────────────────────────────────────────────
// Hinweis: Die Punkte-Ranges pro Slot leben jetzt direkt in SLOT_PROFILES
// (weiter unten), zusammen mit den Kind-Präferenzen. Die alte STRUCTURES-
// Konstante wurde entfernt, damit es nur noch eine Single-Source-of-Truth gibt.

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
//
// canAssembleExam und assembleExam nutzen denselben Such-Algorithmus. Hier wird
// nur simuliert (ohne Rückgabe der Tasks), damit canAssembleExam exakt dasselbe
// Ergebnis trifft wie ein echter Assembly-Versuch. So vermeiden wir Drift:
// wenn canAssembleExam grün zeigt, gelingt assembleExam garantiert.

export function canAssembleExam(part: string, specialty = "fiae"): boolean {
  const profile = SLOT_PROFILES[part];
  if (!profile) return false;

  const usedTopics = new Set<string>();
  const usedIds: string[] = [];
  const kindCounts: Record<string, number> = {};
  const textCap = MAX_TEXT_PER_EXAM[part] ?? 99;

  function probeTask(
    minP: number,
    maxP: number,
    kindFilter: TaskKind | null,
  ): { id: string; topic_area: string; task_kind: string } | undefined {
    const usedIdStr = usedIds.map((id) => `'${id}'`).join(",") || "''";
    const topicEx =
      usedTopics.size > 0
        ? `AND topic_area NOT IN (${[...usedTopics].map((t) => `'${t.replace(/'/g, "''")}'`).join(",")})`
        : "";
    const kindEx = kindFilter ? `AND task_kind = '${kindFilter}'` : "";

    const primary = db
      .prepare(
        `SELECT id, topic_area, task_kind FROM tasks
         WHERE part = ? AND specialty = ? AND points_value BETWEEN ? AND ?
           AND id NOT IN (${usedIdStr}) ${topicEx} ${kindEx}
         ORDER BY times_used ASC, RANDOM() LIMIT 1`,
      )
      .get(part, specialty, minP, maxP) as
      | { id: string; topic_area: string; task_kind: string }
      | undefined;
    if (primary) return primary;

    return db
      .prepare(
        `SELECT id, topic_area, task_kind FROM tasks
         WHERE part = ? AND specialty = ? AND points_value BETWEEN ? AND ?
           AND id NOT IN (${usedIdStr}) ${kindEx}
         ORDER BY times_used ASC, RANDOM() LIMIT 1`,
      )
      .get(part, specialty, minP, maxP) as
      | { id: string; topic_area: string; task_kind: string }
      | undefined;
  }

  for (const slot of profile) {
    let kindsToTry = slot.preferredKinds.slice();
    if ((kindCounts['text'] ?? 0) >= textCap) {
      kindsToTry = kindsToTry.filter((k) => k !== 'text');
    }

    let task: { id: string; topic_area: string; task_kind: string } | undefined;
    for (const kind of kindsToTry) {
      task = probeTask(slot.minPoints, slot.maxPoints, kind);
      if (task) break;
    }
    if (!task) task = probeTask(slot.minPoints, slot.maxPoints, null);
    if (!task) return false;

    usedIds.push(task.id);
    usedTopics.add(task.topic_area);
    const kind = task.task_kind ?? 'text';
    kindCounts[kind] = (kindCounts[kind] ?? 0) + 1;
  }
  return true;
}

// ─── Kind-Quoten pro Prüfungsteil ────────────────────────────────────────────
//
// Abgeleitet aus der Analyse der echten AP2-Prüfungen 2019–2025. Jede Prüfung
// hat 4 Task-Slots (Teil 1/2) oder 8 (Teil 3). Für jeden Slot gibt es eine
// priorisierte Liste von bevorzugten Kinds plus Punktebereich. Der Algorithmus
// geht Slot für Slot durch und wählt die am wenigsten-verwendete passende
// Aufgabe.
//
// Teil 1 (Planen) — reale Verteilung:
//   - 1–2× Diagramm-Aufgabe (UML-Aktivität/Klasse, ER, Mockup/Skizze)
//   - 1–2× Tabellen-Aufgabe (Stakeholder, Teststufen, Vergleich, Fehler)
//   - 0–1× Berechnung (Netzplan, Kosten)
//   - Rest reine Text-Aufgaben
//
// Teil 2 (Entwicklung) — reale Verteilung:
//   - 1–2× SQL-Aufgabe (fast immer dabei)
//   - 1× Pseudocode/Algorithmus (fast immer dabei)
//   - 1× Diagramm (ER, Sequenz, Klasse) oder Berechnung (Speicher)
//   - 0–1× Text-Aufgabe
//
// Teil 3 (WiSo) — bleibt breit: MC + Freitext mix, keine Typbalance nötig.

interface SlotSpec {
  /** Punktebereich des Slots. */
  minPoints: number;
  maxPoints: number;
  /** Priorisierte Kind-Liste: der erste Kind, für den eine passende Task
   *  gefunden wird, wird verwendet. Der letzte Eintrag ist der Fallback-Kind,
   *  die Schleife versucht ihn zuletzt. Wenn gar nichts passt, wird ohne
   *  Kind-Filter gesucht (Gesamt-Fallback, damit die Prüfung nicht scheitert). */
  preferredKinds: TaskKind[];
}

const SLOT_PROFILES: Record<string, SlotSpec[]> = {
  teil_1: [
    // Slot 1 (20-30P): bevorzugt Diagramm-Aufgabe (UML/ER/Mockup)
    { minPoints: 20, maxPoints: 30, preferredKinds: ['diagram', 'table', 'text'] },
    // Slot 2 (20-30P): bevorzugt Tabellen-Aufgabe
    { minPoints: 20, maxPoints: 30, preferredKinds: ['table', 'diagram', 'calc', 'text'] },
    // Slot 3 (18-28P): Berechnung oder zweite Tabelle
    { minPoints: 18, maxPoints: 28, preferredKinds: ['calc', 'table', 'diagram', 'text'] },
    // Slot 4 (15-25P): Text-Aufgabe als Basis
    { minPoints: 15, maxPoints: 25, preferredKinds: ['text', 'table', 'calc', 'diagram'] },
  ],
  teil_2: [
    // Slot 1 (20-30P): SQL-Aufgabe (Teil 2 hat fast immer SQL)
    { minPoints: 20, maxPoints: 30, preferredKinds: ['sql', 'code', 'diagram', 'text'] },
    // Slot 2 (18-28P): Pseudocode/Algorithmus
    { minPoints: 18, maxPoints: 28, preferredKinds: ['code', 'sql', 'diagram', 'text'] },
    // Slot 3 (18-28P): Diagramm (ER/Sequenz) oder Berechnung
    { minPoints: 18, maxPoints: 28, preferredKinds: ['diagram', 'calc', 'table', 'text'] },
    // Slot 4 (15-25P): zweites SQL oder Text
    { minPoints: 15, maxPoints: 25, preferredKinds: ['sql', 'text', 'calc', 'table'] },
  ],
  teil_3: [
    // WiSo: 8 Slots, keine Typbalance — nur Punkte-Range.
    // Leere preferredKinds → alle Kinds gleichwertig
    { minPoints: 8,  maxPoints: 15, preferredKinds: [] },
    { minPoints: 8,  maxPoints: 15, preferredKinds: [] },
    { minPoints: 8,  maxPoints: 15, preferredKinds: [] },
    { minPoints: 8,  maxPoints: 15, preferredKinds: [] },
    { minPoints: 8,  maxPoints: 15, preferredKinds: [] },
    { minPoints: 10, maxPoints: 20, preferredKinds: [] },
    { minPoints: 10, maxPoints: 20, preferredKinds: [] },
    { minPoints: 8,  maxPoints: 15, preferredKinds: [] },
  ],
};

// Reine Text-Aufgaben-Kappe pro Teil — verhindert, dass der Fallback-Pfad
// eine Prüfung mit 4× 'text' aufbaut, selbst wenn der Pool keine Diagramme
// enthält. Bei Teil 3 keine Kappe (alle WiSo-Aufgaben sind quasi "text"-artig).
const MAX_TEXT_PER_EXAM: Record<string, number> = {
  teil_1: 2,
  teil_2: 2,
  teil_3: 99,
};

// ─── Prüfung zusammenstellen ──────────────────────────────────────────────────
// Flow:
//   1. Für jeden Slot die preferredKinds in Reihenfolge durchgehen.
//   2. Erste verfügbare Task finden, die Punkte-Range und Topic-Eindeutigkeit
//      erfüllt, times_used priorisiert (alte Aufgaben zuerst).
//   3. Wenn kein Kind aus der Liste passt, Fallback: irgendeine Aufgabe im
//      Punktebereich (ohne Kind-Filter).
//   4. Text-Kappe enforce'n: wenn bereits MAX_TEXT_PER_EXAM 'text'-Tasks
//      gewählt sind, 'text' aus der preferredKinds-Liste filtern.

export function assembleExam(part: string, specialty = "fiae"): {
  tasks: Record<string, unknown>[];
  totalPoints: number;
  topics: string[];
} | null {
  const profile = SLOT_PROFILES[part];
  if (!profile) return null;

  const usedTopics = new Set<string>();
  const usedIds: string[] = [];
  const selectedTasks: Record<string, unknown>[] = [];
  const kindCounts: Record<string, number> = {};
  const textCap = MAX_TEXT_PER_EXAM[part] ?? 99;

  function findTask(
    minP: number,
    maxP: number,
    kindFilter: TaskKind | null,
  ): Record<string, unknown> | undefined {
    const usedIdStr = usedIds.map((id) => `'${id}'`).join(",") || "''";
    const topicEx =
      usedTopics.size > 0
        ? `AND topic_area NOT IN (${[...usedTopics].map((t) => `'${t.replace(/'/g, "''")}'`).join(",")})`
        : "";
    const kindEx = kindFilter ? `AND task_kind = '${kindFilter}'` : "";

    // Primär: Topic noch ungenutzt (verhindert doppelte Themen in einer Prüfung)
    const primary = db
      .prepare(
        `SELECT * FROM tasks
         WHERE part = ? AND specialty = ? AND points_value BETWEEN ? AND ?
           AND id NOT IN (${usedIdStr}) ${topicEx} ${kindEx}
         ORDER BY times_used ASC, RANDOM() LIMIT 1`,
      )
      .get(part, specialty, minP, maxP) as Record<string, unknown> | undefined;
    if (primary) return primary;

    // Sekundär: Topic-Eindeutigkeit aufweichen (Pool zu klein für strenges Topic-Verbot)
    return db
      .prepare(
        `SELECT * FROM tasks
         WHERE part = ? AND specialty = ? AND points_value BETWEEN ? AND ?
           AND id NOT IN (${usedIdStr}) ${kindEx}
         ORDER BY times_used ASC, RANDOM() LIMIT 1`,
      )
      .get(part, specialty, minP, maxP) as Record<string, unknown> | undefined;
  }

  for (const slot of profile) {
    let kindsToTry = slot.preferredKinds.slice();
    // Text-Kappe: wenn das Limit erreicht ist, 'text' rausfiltern
    if ((kindCounts['text'] ?? 0) >= textCap) {
      kindsToTry = kindsToTry.filter((k) => k !== 'text');
    }

    let task: Record<string, unknown> | undefined;

    // Nacheinander die bevorzugten Kinds versuchen
    for (const kind of kindsToTry) {
      task = findTask(slot.minPoints, slot.maxPoints, kind);
      if (task) break;
    }
    // Wenn keiner der bevorzugten Kinds verfügbar war: ohne Kind-Filter
    // (letzter Ausweg damit die Prüfung zustande kommt)
    if (!task) {
      task = findTask(slot.minPoints, slot.maxPoints, null);
    }
    if (!task) return null;

    selectedTasks.push(task);
    usedIds.push(task.id as string);
    usedTopics.add(task.topic_area as string);
    const kind = (task.task_kind as string) ?? 'text';
    kindCounts[kind] = (kindCounts[kind] ?? 0) + 1;
  }

  const totalPoints = selectedTasks.reduce(
    (s, t) => s + (t.points_value as number),
    0,
  );

  return {
    tasks: selectedTasks,
    totalPoints,
    topics: [...usedTopics],
  };
}

// ─── Task-Klassifikation nach Aufgaben-Art ──────────────────────────────────
// Die pure Klassifikations-Logik lebt in services/taskKind.ts (DB-frei), damit
// Tests die Funktion ohne better-sqlite3-Binding importieren können. Hier
// re-exportieren wir sie für bestehende Importe, plus die DB-seitige
// Reklassifikation alter Tasks.

export type { TaskKind, ClassifySubtask } from '../services/taskKind.js';
export { classifyTaskFromSubtasks } from '../services/taskKind.js';

import { classifyTaskFromSubtasks as _classify } from '../services/taskKind.js';
import type { ClassifySubtask as _ClassifySubtask } from '../services/taskKind.js';

/**
 * Geht alle Tasks im Pool durch und setzt `task_kind` basierend auf den
 * aktuellen Subtasks. Läuft idempotent: wenn task_kind bereits != 'text' gesetzt
 * ist, wird nichts überschrieben (Admin-Overrides bleiben erhalten). Bei 'text'
 * wird trotzdem neu klassifiziert, falls die Aufgabe bei der Einführung nur
 * den Default bekommen hat.
 */
function reclassifyExistingTasks(): void {
  const tasks = db.prepare('SELECT id, task_kind FROM tasks').all() as {
    id: string;
    task_kind: string;
  }[];
  if (tasks.length === 0) return;

  const getSubtasks = db.prepare(
    'SELECT task_type, question_text, expected_answer FROM subtasks WHERE task_id = ?',
  );
  const updateKind = db.prepare('UPDATE tasks SET task_kind = ? WHERE id = ?');

  let updated = 0;
  for (const t of tasks) {
    // Nur neu klassifizieren, wenn aktuell Default "text" gesetzt ist — so
    // bleiben spätere manuelle Overrides erhalten.
    if (t.task_kind !== 'text') continue;
    const subtasks = getSubtasks.all(t.id) as _ClassifySubtask[];
    const kind = _classify(subtasks);
    if (kind !== 'text') {
      updateKind.run(kind, t.id);
      updated++;
    }
  }
  if (updated > 0) {
    console.log(`[db] ${updated} Tasks rückwirkend klassifiziert.`);
  }
}

// ─── Migration: ai_evaluations UNIQUE-Constraint entfernen (Feature 9) ───────
// Ermöglicht mehrere Evaluationen pro Antwort (Zweitbewertung).
// SQLite kann UNIQUE nicht per ALTER TABLE entfernen → Tabellen-Rebuild.
export function migrateAiEvaluationsRemoveUnique(): void {
  try {
    // Probe: Wenn INSERT mit doppelter answer_id durchgeht, ist UNIQUE schon weg
    db.pragma("foreign_keys = OFF");
    const probe = db.prepare(`SELECT id FROM ai_evaluations LIMIT 1`).get() as { id: string } | undefined;
    if (probe) {
      // Versuche zweiten Eintrag mit gleicher answer_id
      db.prepare(
        `INSERT INTO ai_evaluations (answer_id, awarded_points, max_points, percentage_score, ihk_grade, feedback_text, model_used)
         VALUES ((SELECT answer_id FROM ai_evaluations WHERE id = ?), 0, 0, 0, 'sehr_gut', '', '_probe')`,
      ).run(probe.id);
      db.prepare(`DELETE FROM ai_evaluations WHERE model_used = '_probe'`).run();
    }
    db.pragma("foreign_keys = ON");
    // Kein Fehler → UNIQUE ist schon weg oder Tabelle leer
  } catch {
    db.pragma("foreign_keys = ON");
    // UNIQUE existiert noch → Rebuild
    db.transaction(() => {
      db.exec(`DROP TABLE IF EXISTS ai_evaluations_new`);
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
      db.exec(`INSERT INTO ai_evaluations_new SELECT * FROM ai_evaluations`);
      db.exec(`DROP TABLE ai_evaluations`);
      db.exec(`ALTER TABLE ai_evaluations_new RENAME TO ai_evaluations`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_eval_answer ON ai_evaluations(answer_id)`);
    })();
    console.log("[db] ai_evaluations UNIQUE-Constraint entfernt.");
  }
}
