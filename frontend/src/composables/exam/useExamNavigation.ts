/**
 * composables/exam/useExamNavigation.ts — Subtask-Navigation innerhalb der Prüfung.
 *
 * Hält den aktiven (task, subtask)-Index und bietet Bewegungs-Funktionen
 * (goto, next, prev) sowie derived state (isFirst, isLast, flatIndex).
 *
 * Die flache Subtask-Liste kommt von useAnswerState — wir parametrisieren
 * diese Abhängigkeit, damit die Navigation die Liste nicht selbst berechnet.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { computed, ref } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type { Task } from '../../types/index.js';

export interface FlatSubtaskRef {
  ti: number;
  si: number;
}

export interface UseExamNavigationOptions {
  tasks: Task[];
  flatSubtasks: ComputedRef<FlatSubtaskRef[]>;
}

export function useExamNavigation(opts: UseExamNavigationOptions) {
  const activeTask = ref(0);
  const activeSubtask = ref(0);
  const navOpen = ref(false);

  const flatIndex = computed(() =>
    opts.flatSubtasks.value.findIndex(
      (f) => f.ti === activeTask.value && f.si === activeSubtask.value,
    ),
  );
  const isFirst = computed(() => flatIndex.value === 0);
  const isLast = computed(() => flatIndex.value === opts.flatSubtasks.value.length - 1);

  const currentTask = computed(() => opts.tasks[activeTask.value]);
  const currentSubtask = computed(() => currentTask.value?.subtasks[activeSubtask.value]);

  function goto(taskIndex: number, subtaskIndex: number): void {
    activeTask.value = taskIndex;
    activeSubtask.value = subtaskIndex;
    navOpen.value = false;
  }

  function next(): void {
    const n = opts.flatSubtasks.value[flatIndex.value + 1];
    if (n) goto(n.ti, n.si);
  }

  function prev(): void {
    const p = opts.flatSubtasks.value[flatIndex.value - 1];
    if (p) goto(p.ti, p.si);
  }

  return {
    activeTask: activeTask as Ref<number>,
    activeSubtask: activeSubtask as Ref<number>,
    navOpen,
    flatIndex,
    isFirst,
    isLast,
    currentTask,
    currentSubtask,
    goto,
    next,
    prev,
  };
}

export type UseExamNavigation = ReturnType<typeof useExamNavigation>;
