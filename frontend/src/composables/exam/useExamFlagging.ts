/**
 * composables/exam/useExamFlagging.ts — Kapselt das "zur Durchsicht markieren"-
 * Feature für die ExamView.
 *
 * Der Flag-State ist ein Set<subtaskId>. Änderungen werden asynchron an das
 * Backend gepushed (`setAnswerFlag`); Fehler beim Persist sind non-kritisch
 * und werden swallowed — der lokale Flag-State bleibt dem User-Feedback treu.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { ref } from 'vue';
import type { ComputedRef } from 'vue';
import type { SubTask, Task } from '../../types/index.js';
import { setAnswerFlag } from '../api/index.js';

export interface UseExamFlaggingOptions {
  sessionId: string;
  tasks: Task[];
  currentSubtask: ComputedRef<SubTask | undefined>;
}

export function useExamFlagging(opts: UseExamFlaggingOptions) {
  const flagged = ref<Set<string>>(new Set());

  function isFlagged(taskIndex: number, subtaskIndex: number): boolean {
    const st = opts.tasks[taskIndex]?.subtasks[subtaskIndex];
    return st ? flagged.value.has(st.id) : false;
  }

  async function toggle(): Promise<void> {
    const st = opts.currentSubtask.value;
    if (!st) return;
    const newState = !flagged.value.has(st.id);
    if (newState) flagged.value.add(st.id);
    else flagged.value.delete(st.id);
    // Reassign trigger Reaktivität — Set-Mutationen in-place tun das nicht.
    flagged.value = new Set(flagged.value);
    try {
      await setAnswerFlag(opts.sessionId, st.id, newState);
    } catch {
      // Non-kritisch: lokales Flag bleibt, Server-Sync kann beim nächsten
      // Toggle nachgeholt werden.
    }
  }

  return { flagged, isFlagged, toggle };
}
