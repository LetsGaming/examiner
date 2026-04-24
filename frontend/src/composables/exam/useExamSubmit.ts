/**
 * composables/exam/useExamSubmit.ts — Abgabe-Flow inkl. Error-State und
 * Abbruch-Pfad.
 *
 * Vor der Abgabe werden alle noch ungesicherten Antworten persistiert,
 * danach werden parallele Evaluation-Requests gefeuert und erst zuletzt die
 * Session als abgeschlossen markiert. Wenn eine einzelne Evaluation scheitert,
 * blockiert das die Session-Submission nicht (`Promise.allSettled`).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { ref } from 'vue';
import type { ComputedRef } from 'vue';
import { requestEvaluation, submitSession } from '../api/index.js';
import type { AnswerState } from '../useAnswerState.js';

export interface ExamSubmitResult {
  totalScore: number;
  maxPoints: number;
  percentageScore: number;
  ihkGrade: string;
}

export interface UseExamSubmitOptions {
  sessionId: string;
  answerStates: ComputedRef<Map<string, AnswerState>> | { value: Map<string, AnswerState> };
  persistAll: () => Promise<void>;
  cancelPendingSave: () => void;
  stopTimer: () => void;
  onSubmitted: (result: ExamSubmitResult) => void;
  onCancel: () => void;
}

export function useExamSubmit(opts: UseExamSubmitOptions) {
  const isSubmitting = ref(false);
  const submitError = ref<string | null>(null);
  const showSubmitConfirm = ref(false);
  const showLeaveConfirm = ref(false);

  async function submit(): Promise<void> {
    showSubmitConfirm.value = false;
    submitError.value = null;
    opts.stopTimer();
    isSubmitting.value = true;

    await opts.persistAll();

    try {
      const states = [...opts.answerStates.value.values()].filter((a) => a.answerId);
      await Promise.allSettled(
        states.map((a) => requestEvaluation(opts.sessionId, a.answerId!)),
      );
      const result = await submitSession(opts.sessionId);
      isSubmitting.value = false;
      opts.onSubmitted(result);
    } catch (err) {
      isSubmitting.value = false;
      submitError.value =
        err instanceof Error
          ? err.message
          : 'Abgabe fehlgeschlagen. Bitte versuche es erneut.';
    }
  }

  function cancel(): void {
    showLeaveConfirm.value = false;
    opts.stopTimer();
    opts.cancelPendingSave();
    opts.onCancel();
  }

  return {
    isSubmitting,
    submitError,
    showSubmitConfirm,
    showLeaveConfirm,
    submit,
    cancel,
  };
}
