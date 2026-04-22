/**
 * taskKind.ts — Pure helpers for task kind classification.
 *
 * Extracted from database.ts so tests can import the classification logic
 * without pulling in better-sqlite3 (which needs a native binding that isn't
 * always available in CI/test environments).
 *
 * The actual DB-touching operations (reclassifyExistingTasks, task_kind column)
 * stay in database.ts — they import from here.
 */

export type TaskKind = 'diagram' | 'calc' | 'sql' | 'code' | 'table' | 'text';

export interface ClassifySubtask {
  task_type: string;
  question_text?: string;
  expected_answer?: string;
}

/**
 * Bestimmt den `task_kind` einer Aufgabe anhand der enthaltenen Subtasks.
 * Priorität (erste zutreffende Regel gewinnt):
 *   1. 'diagram'  — plantuml/diagram_upload-Subtask ODER Mockup/Skizze im Text
 *   2. 'calc'     — Operator "berechnen" ODER Schlüsselwörter (Speicherbedarf,
 *                   Netzplan, kritischer Pfad, Gesamtkosten/-aufwand)
 *   3. 'sql'      — mindestens ein sql-Subtask
 *   4. 'code'     — mindestens ein pseudocode-Subtask
 *   5. 'table'    — mindestens ein table-Subtask
 *   6. 'text'     — Default (reine Freitext-/MC-Aufgabe)
 */
export function classifyTaskFromSubtasks(subtasks: ClassifySubtask[]): TaskKind {
  const questionBlob = subtasks.map((s) => s.question_text ?? '').join(' ').toLowerCase();
  const expectedBlob = subtasks.map((s) => s.expected_answer ?? '').join(' ').toLowerCase();

  // 1. Diagram
  if (subtasks.some((s) => s.task_type === 'plantuml' || s.task_type === 'diagram_upload')) {
    return 'diagram';
  }
  // Mockup/Skizze im Text erkannt → auch als diagram behandeln, da visuelle
  // Darstellung vom Prüfling gefordert wird
  if (/\b(mockup|skizze|skizzieren|oberfläche.* entwerf|formular.* entwerf)\b/.test(questionBlob)) {
    return 'diagram';
  }

  // 2. Calc
  if (/\boperator\"?\s*:\s*\"berechnen\"/.test(expectedBlob) ||
      /berechnen sie|berechne |speicherbedarf|netzplan|kritischer pfad|gesamtkosten|gesamtaufwand/.test(questionBlob)) {
    return 'calc';
  }

  // 3. SQL
  if (subtasks.some((s) => s.task_type === 'sql')) {
    return 'sql';
  }

  // 4. Code
  if (subtasks.some((s) => s.task_type === 'pseudocode')) {
    return 'code';
  }

  // 5. Table
  if (subtasks.some((s) => s.task_type === 'table')) {
    return 'table';
  }

  return 'text';
}
