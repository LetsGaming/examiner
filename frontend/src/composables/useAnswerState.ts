import { ref, computed } from "vue";
import { saveAnswer, uploadDiagramImage } from "./useApi.js";
import type { Task, SubTask, AiEvaluation } from "../types/index.js";

export interface AnswerState {
  subtaskId: string;
  answerId: string | null;
  textValue: string;
  selectedMcOption: string | null;
  uploadedFile: File | null;
  tableRows: string[][]; // für taskType === 'table'
  evaluation: AiEvaluation | null;
}

export function useAnswerState(sessionId: string, tasks: Task[]) {
  // ─── Flat subtask list ───────────────────────────────────────────────────
  const flatSubtasks = computed(() => {
    const r: { ti: number; si: number; subtask: SubTask }[] = [];
    for (let ti = 0; ti < tasks.length; ti++)
      for (let si = 0; si < tasks[ti].subtasks.length; si++)
        r.push({ ti, si, subtask: tasks[ti].subtasks[si] });
    return r;
  });

  // ─── State map ───────────────────────────────────────────────────────────
  const answerStates = ref(
    new Map<string, AnswerState>(
      flatSubtasks.value.map((f) => [
        f.subtask.id,
        {
          subtaskId: f.subtask.id,
          answerId: null,
          textValue: "",
          selectedMcOption: null,
          uploadedFile: null,
          tableRows: [],
          evaluation: null,
        },
      ]),
    ),
  );

  const answeredCount = computed(
    () =>
      [...answerStates.value.values()].filter(
        (a) =>
          a.textValue.trim() ||
          a.selectedMcOption ||
          a.uploadedFile ||
          (a.tableRows?.length &&
            a.tableRows.some((r) => r.some((c) => c.trim()))),
      ).length,
  );

  function isAnswered(ti: number, si: number): boolean {
    const st = tasks[ti]?.subtasks[si];
    if (!st) return false;
    const a = answerStates.value.get(st.id);
    return !!(
      a?.textValue.trim() ||
      a?.selectedMcOption ||
      a?.uploadedFile ||
      (a?.tableRows?.length && a.tableRows.some((r) => r.some((c) => c.trim())))
    );
  }

  function getState(subtaskId: string): AnswerState | undefined {
    return answerStates.value.get(subtaskId);
  }

  // ─── Debounced save ──────────────────────────────────────────────────────
  const saveTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

  function debouncedSave(ti: number, si: number) {
    if (saveTimeout.value) clearTimeout(saveTimeout.value);
    saveTimeout.value = setTimeout(() => persistSubtask(ti, si), 800);
  }

  function cancelPendingSave() {
    if (saveTimeout.value) clearTimeout(saveTimeout.value);
  }

  async function persistSubtask(ti: number, si: number) {
    const st = tasks[ti]?.subtasks[si];
    if (!st) return;
    const a = answerStates.value.get(st.id);
    if (!a) return;
    try {
      if (st.taskType === "diagram_upload" && a.uploadedFile) {
        const r = await uploadDiagramImage(sessionId, st.id, a.uploadedFile);
        a.answerId = r.answerId;
        return;
      }
      const textVal =
        st.taskType === "table"
          ? JSON.stringify(a.tableRows ?? [])
          : a.textValue;
      a.answerId = await saveAnswer(sessionId, st.id, {
        textValue: textVal,
        selectedMcOption: a.selectedMcOption,
      });
    } catch (err) {
      console.warn("[save]", err);
    }
  }

  async function persistAll() {
    const saves = tasks.flatMap((task, ti) =>
      task.subtasks.map((_, si) => persistSubtask(ti, si)),
    );
    await Promise.allSettled(saves);
  }

  return {
    flatSubtasks,
    answerStates,
    answeredCount,
    isAnswered,
    getState,
    debouncedSave,
    cancelPendingSave,
    persistSubtask,
    persistAll,
  };
}
