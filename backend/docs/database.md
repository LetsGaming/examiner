# Datenbankschema

Die Anwendung verwendet **SQLite** via `better-sqlite3`. Die Datenbankdatei wird beim ersten Start automatisch unter `data/fiae_ap2.db` angelegt. Beim ersten Start werden außerdem Demo-Prüfungsvorlagen eingespielt (`seedDemoData()`).

## Konfiguration

```typescript
db.pragma('journal_mode = WAL')   // Write-Ahead Logging: bessere Concurrent-Read-Performance
db.pragma('foreign_keys = ON')    // Referentielle Integrität erzwingen
```

---

## Tabellen

### `users`

Lokale Nutzer der Anwendung. Für den Einzelnutzer-Betrieb wird `local-user` als Standard-ID verwendet.

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now'))
);
```

### `exam_templates`

Prüfungsvorlagen — die Blaupausen, aus denen Sessions erstellt werden.

```sql
CREATE TABLE exam_templates (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title            TEXT NOT NULL,
  year             INTEGER NOT NULL,
  part             TEXT NOT NULL CHECK(part IN ('teil_1','teil_2','teil_3')),
  max_points       INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at       TEXT DEFAULT (datetime('now'))
);
```

### `tasks`

Einzelne Aufgaben innerhalb einer Prüfungsvorlage. JSON-Felder (`expected_answer`, `expected_elements`, `mc_options`) werden als TEXT gespeichert und im Anwendungscode geparst.

```sql
CREATE TABLE tasks (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  exam_template_id  TEXT NOT NULL REFERENCES exam_templates(id) ON DELETE CASCADE,
  position          INTEGER NOT NULL,
  task_type         TEXT NOT NULL CHECK(task_type IN
                      ('freitext','pseudocode','mc','plantuml','diagram_upload')),
  question_text     TEXT NOT NULL,
  expected_answer   TEXT NOT NULL DEFAULT '{}',  -- JSON
  max_points        INTEGER NOT NULL,
  topic_area        TEXT,
  diagram_type      TEXT,
  expected_elements TEXT DEFAULT '[]',            -- JSON Array
  mc_options        TEXT DEFAULT '[]'             -- JSON Array von {id, text}
);
```

#### `expected_answer` — Struktur je Aufgabentyp

**freitext / pseudocode:**
```json
{
  "keyPoints": ["Punkt 1", "Punkt 2", "Punkt 3"],
  "minKeyPointsRequired": 3
}
```

**mc:**
```json
{
  "correctOptionId": "b",
  "explanation": "Erklärung warum b korrekt ist"
}
```

**plantuml / diagram_upload:**
```json
{
  "requiredClasses": ["Buch", "Autor"],
  "requiredRelations": ["Buch *--* Autor"],
  "requiredAttributes": true
}
```

### `exam_sessions`

Eine laufende oder abgeschlossene Prüfungssitzung eines Nutzers.

```sql
CREATE TABLE exam_sessions (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_template_id  TEXT NOT NULL REFERENCES exam_templates(id),
  started_at        TEXT DEFAULT (datetime('now')),
  submitted_at      TEXT,
  status            TEXT NOT NULL DEFAULT 'in_progress'
                      CHECK(status IN ('in_progress','submitted','graded')),
  total_score       INTEGER,
  ihk_grade         TEXT
);
```

**Statusübergänge:**
```
in_progress → graded   (nach POST /submit)
```

### `answers`

Einzelne Antworten eines Nutzers auf eine Aufgabe innerhalb einer Session.

```sql
CREATE TABLE answers (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id          TEXT NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  task_id             TEXT NOT NULL REFERENCES tasks(id),
  text_value          TEXT DEFAULT '',
  selected_mc_option  TEXT,
  diagram_image_path  TEXT,       -- Lokaler Dateipfad im data/uploads/ Verzeichnis
  answered_at         TEXT DEFAULT (datetime('now'))
);
```

### `ai_evaluations`

KI-Bewertungen. `answer_id` ist UNIQUE — pro Antwort gibt es maximal eine Bewertung (UPSERT bei Neu-Bewertung).

```sql
CREATE TABLE ai_evaluations (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  answer_id         TEXT NOT NULL UNIQUE REFERENCES answers(id) ON DELETE CASCADE,
  awarded_points    INTEGER NOT NULL,
  max_points        INTEGER NOT NULL,
  percentage_score  REAL NOT NULL,
  ihk_grade         TEXT NOT NULL,
  feedback_text     TEXT NOT NULL,
  criterion_scores  TEXT NOT NULL DEFAULT '[]',   -- JSON Array
  key_mistakes      TEXT NOT NULL DEFAULT '[]',   -- JSON Array
  improvement_hints TEXT NOT NULL DEFAULT '[]',   -- JSON Array
  detected_elements TEXT DEFAULT '[]',            -- JSON Array (Diagramme)
  missing_elements  TEXT DEFAULT '[]',            -- JSON Array (Diagramme)
  notation_errors   TEXT DEFAULT '[]',            -- JSON Array (Diagramme)
  model_used        TEXT NOT NULL,
  created_at        TEXT DEFAULT (datetime('now'))
);
```

---

## Indizes

```sql
CREATE INDEX idx_tasks_template  ON tasks(exam_template_id);
CREATE INDEX idx_sessions_user   ON exam_sessions(user_id);
CREATE INDEX idx_answers_session ON answers(session_id);
CREATE INDEX idx_eval_answer     ON ai_evaluations(answer_id);
```

---

## Entity-Relationship-Diagramm

```
exam_templates ──< tasks
      │
      └──< exam_sessions >── users
               │
               └──< answers >── tasks
                       │
                       └── ai_evaluations
```

Kardinalitäten:
- Eine `exam_template` hat viele `tasks` (1:n)
- Eine `exam_template` hat viele `exam_sessions` (1:n)
- Eine `exam_session` hat viele `answers` (1:n)
- Eine `answer` hat maximal eine `ai_evaluation` (1:0..1)

---

## Demo-Daten

Beim ersten Start werden drei Prüfungsvorlagen eingespielt:

| ID | Titel | Teil | Aufgaben |
|---|---|---|---|
| `demo-teil1-2024` | AP2 Musterpüfung 2024 – Teil 1 | teil_1 | 3 (Freitext, PlantUML, MC) |
| `demo-teil2-2024` | AP2 Musterpüfung 2024 – Teil 2 | teil_2 | 2 (Pseudocode, SQL-Freitext) |
| `demo-teil3-2024` | AP2 Musterpüfung 2024 – Teil 3 | teil_3 | 2 (MC, Freitext) |

Die Seed-Funktion prüft mit `SELECT COUNT(*) FROM exam_templates`, ob bereits Daten vorhanden sind, und überspringt den Seed bei einem Neustart.
