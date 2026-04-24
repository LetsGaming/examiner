/**
 * db/migrations/reclassifyTasks.ts — Reklassifikation bestehender Aufgaben.
 *
 * Läuft bei jedem Start nach den Column-Migrationen und klassifiziert Tasks
 * mit task_kind='text' (Default oder noch nie gesetzt) anhand ihrer tatsächlichen
 * Subtasks neu. Idempotent: Tasks mit explizit gesetztem nicht-'text'-Kind
 * (z.B. durch Admin-Override) bleiben unangetastet.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { classifyTaskFromSubtasks } from '../../services/taskKind.js';
import type { ClassifySubtask } from '../../services/taskKind.js';
import { db } from '../connection.js';

interface TaskRow {
  id: string;
  task_kind: string;
}

export function reclassifyExistingTasks(): void {
  const tasks = db.prepare('SELECT id, task_kind FROM tasks').all() as TaskRow[];
  if (tasks.length === 0) return;

  const getSubtasks = db.prepare(
    'SELECT task_type, question_text, expected_answer FROM subtasks WHERE task_id = ?',
  );
  const updateKind = db.prepare('UPDATE tasks SET task_kind = ? WHERE id = ?');

  let updated = 0;
  for (const task of tasks) {
    if (task.task_kind !== 'text') continue; // Explizite Override-Kinds bleiben erhalten
    const subtasks = getSubtasks.all(task.id) as ClassifySubtask[];
    const kind = classifyTaskFromSubtasks(subtasks);
    if (kind !== 'text') {
      updateKind.run(kind, task.id);
      updated++;
    }
  }
  if (updated > 0) {
    console.log(`[db] ${updated} Tasks rückwirkend klassifiziert.`);
  }
}

export function runReclassificationSafely(): void {
  try {
    reclassifyExistingTasks();
  } catch (err) {
    console.warn('[db] Reklassifizierung alter Tasks fehlgeschlagen:', err);
  }
}
