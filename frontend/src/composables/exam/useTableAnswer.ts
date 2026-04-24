/**
 * composables/exam/useTableAnswer.ts — Tabellen-Antwort-Logik (Lazy-Init + Mutation).
 *
 * Beim ersten Lesen der Rows wird das 2D-Array aus der tableConfig initialisiert
 * (entweder vorbefüllte Zellen oder eine leere Matrix mit rowCount × columnCount).
 * Schreibzugriffe laufen immutable (ganzes Array wird ersetzt), damit Vue die
 * Reaktivität pro Cell mitbekommt.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { computed } from 'vue';
import type { ComputedRef, Ref, WritableComputedRef } from 'vue';
import type { SubTask } from '../../types/index.js';
import type { AnswerState } from '../useAnswerState.js';

export interface UseTableAnswerOptions {
  /** Aktuelle Subtask (kann null sein beim Tab-Wechsel). */
  currentSubtask: ComputedRef<SubTask | undefined>;
  /** Zugehöriger Answer-State aus useAnswerState. */
  currentAnswerState: ComputedRef<AnswerState | null>;
  /** Aktive Task-Index (wird nur für den Save-Aufruf durchgereicht). */
  activeTask: Ref<number>;
  activeSubtask: Ref<number>;
  /** Debounced-Save-Funktion aus useAnswerState. */
  debouncedSave: (taskIndex: number, subtaskIndex: number) => void;
}

export function useTableAnswer(opts: UseTableAnswerOptions) {
  const rows: WritableComputedRef<string[][]> = computed({
    get() {
      const st = opts.currentSubtask.value;
      const a = opts.currentAnswerState.value;
      if (!st || st.taskType !== 'table' || !a) return [];

      // Lazy-Init: rows werden erst bei erstem Lesen gefüllt.
      if (!a.tableRows?.length) {
        const cfg = st.tableConfig;
        if (cfg?.rows?.length) {
          a.tableRows = cfg.rows.map((row: string[]) => [...row]);
        } else if (cfg) {
          a.tableRows = Array.from(
            { length: cfg.rowCount ?? 3 },
            () => Array(cfg.columns.length).fill(''),
          );
        }
      }
      return a.tableRows ?? [];
    },
    set(val) {
      const a = opts.currentAnswerState.value;
      if (a) a.tableRows = val;
    },
  });

  function onCellInput(rowIndex: number, cellIndex: number, value: string): void {
    const a = opts.currentAnswerState.value;
    if (!a?.tableRows) return;
    // Immutable-Update: ganze Matrix replacen, damit Vue die Änderung an der
    // Wurzel sieht. Cellwise-Mutation triggert sonst keine Reaktivität in
    // Consumer-Components, die auf `tableRows` referenzieren.
    a.tableRows = a.tableRows.map((row, r) =>
      r === rowIndex ? row.map((cell, c) => (c === cellIndex ? value : cell)) : [...row],
    );
    opts.debouncedSave(opts.activeTask.value, opts.activeSubtask.value);
  }

  function addRow(): void {
    const st = opts.currentSubtask.value;
    const a = opts.currentAnswerState.value;
    if (!st?.tableConfig || !a) return;
    a.tableRows = [...(a.tableRows ?? []), Array(st.tableConfig.columns.length).fill('')];
    opts.debouncedSave(opts.activeTask.value, opts.activeSubtask.value);
  }

  return { rows, onCellInput, addRow };
}
