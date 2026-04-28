/**
 * composables/exam/useExamSubmit.ts — Abgabe-Flow inkl. Error-State und
 * Abbruch-Pfad.
 *
 * Vor der Abgabe werden alle noch ungesicherten Antworten persistiert,
 * danach werden parallele Evaluation-Requests gefeuert und erst zuletzt die
 * Session als abgeschlossen markiert. Wenn eine einzelne Evaluation scheitert,
 * blockiert das die Session-Submission nicht (`Promise.allSettled`).
 *
 * ## Practice-Modus
 *
 * Übungssessions haben Backend-Status `'practice'` und werden **nicht** über
 * `POST /sessions/:id/submit` abgeschlossen — der Endpoint akzeptiert nur
 * `status='in_progress'` (regulärer Prüfungsablauf). Stattdessen aggregieren
 * wir das Ergebnis lokal aus den Evaluation-Responses, die ohnehin
 * persistiert wurden, und springen direkt zur Ergebnisseite. Die Results-View
 * lädt die Session anschließend regulär via `fetchSession` und findet dort
 * alle gespeicherten Bewertungen.
 *
 */

import { ref } from 'vue';
import type { ComputedRef } from 'vue';
import { requestEvaluation, submitSession } from '../api/index.js';
import type { AnswerState } from '../useAnswerState.js';
import type { AiEvaluation } from '../../types/index.js';

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
  /**
   * Practice-Mode: keine Backend-Submission, Ergebnis wird lokal aus den
   * Evaluation-Responses aggregiert. Default: false (reguläre Prüfung).
   */
  isPractice?: boolean;
  /**
   * Gesamt-Punktzahl der Session — wird im Practice-Modus als Nenner für
   * Prozent/Note benötigt, weil das Backend hier keinen Wert mehr liefert.
   * Bei regulärer Prüfung ignoriert.
   */
  maxPoints?: number;
}

/** IHK-Notenschwellen — identisch zu `calcGrade()` in `sessionRoutes.ts`. */
function calcIhkGrade(awarded: number, maxPoints: number): string {
  if (maxPoints <= 0) return 'ungenuegend';
  const pct = Math.round((awarded / maxPoints) * 100);
  if (pct >= 92) return 'sehr_gut';
  if (pct >= 81) return 'gut';
  if (pct >= 67) return 'befriedigend';
  if (pct >= 50) return 'ausreichend';
  if (pct >= 30) return 'mangelhaft';
  return 'ungenuegend';
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
      const settled = await Promise.allSettled(
        states.map((a) => requestEvaluation(opts.sessionId, a.answerId!)),
      );

      if (opts.isPractice) {
        // Practice-Sessions kennen kein Backend-Submit. Aggregat lokal aus den
        // Evaluation-Responses bauen — fehlgeschlagene Evals zählen als 0.
        const evaluations: AiEvaluation[] = settled
          .filter((s): s is PromiseFulfilledResult<AiEvaluation> => s.status === 'fulfilled')
          .map((s) => s.value);

        const totalScore = evaluations.reduce((sum, e) => sum + (e.awardedPoints ?? 0), 0);
        const maxPoints = opts.maxPoints ?? 0;
        const percentageScore = maxPoints > 0 ? Math.round((totalScore / maxPoints) * 100) : 0;
        const ihkGrade = calcIhkGrade(totalScore, maxPoints);

        isSubmitting.value = false;
        opts.onSubmitted({ totalScore, maxPoints, percentageScore, ihkGrade });
        return;
      }

      const result = await submitSession(opts.sessionId);
      isSubmitting.value = false;
      opts.onSubmitted(result);
    } catch (err) {
      isSubmitting.value = false;
      submitError.value =
        err instanceof Error ? err.message : 'Abgabe fehlgeschlagen. Bitte versuche es erneut.';
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
