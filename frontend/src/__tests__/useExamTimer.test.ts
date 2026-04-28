/**
 * Tests für useExamSubmit — Fokus auf den Practice-Modus, der das Backend-
 * Submit überspringt und das Ergebnis lokal aus den Evaluation-Responses
 * aggregiert.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import type { AnswerState } from '../composables/useAnswerState';
import type { AiEvaluation } from '../types/index';

// ─── API-Mocks ──────────────────────────────────────────────────────────────
const requestEvaluation = vi.fn();
const submitSession = vi.fn();

vi.mock('../composables/api/index.js', () => ({
  requestEvaluation: (...args: unknown[]) => requestEvaluation(...args),
  submitSession: (...args: unknown[]) => submitSession(...args),
}));

// Erst nach dem Mock importieren — sonst greift der Mock nicht.
const { useExamSubmit } = await import('../composables/exam/useExamSubmit');

// ─── Test-Helpers ───────────────────────────────────────────────────────────
function makeState(answerId: string | null): AnswerState {
  return {
    subtaskId: `st-${answerId ?? 'unanswered'}`,
    answerId,
    textValue: '',
    selectedMcOption: null,
    uploadedFile: null,
    tableRows: [],
    evaluation: null,
  };
}

function makeEvaluation(awardedPoints: number, maxPoints = 5): AiEvaluation {
  return {
    answerId: 'a1',
    awardedPoints,
    maxPoints,
    percentageScore: Math.round((awardedPoints / maxPoints) * 100),
    ihkGrade: 'gut',
    feedbackText: 'ok',
    criterionScores: [],
    keyMistakes: [],
    improvementHints: [],
    modelUsed: 'test',
  };
}

interface SetupArgs {
  isPractice?: boolean;
  maxPoints?: number;
  states?: AnswerState[];
}

function setup(args: SetupArgs = {}) {
  const states = args.states ?? [makeState('a1'), makeState('a2')];
  const answerStates = ref(new Map(states.map((s) => [s.subtaskId, s])));
  const onSubmitted = vi.fn();
  const persistAll = vi.fn().mockResolvedValue(undefined);
  const stopTimer = vi.fn();

  const submit = useExamSubmit({
    sessionId: 'sess-1',
    answerStates,
    persistAll,
    cancelPendingSave: vi.fn(),
    stopTimer,
    onSubmitted,
    onCancel: vi.fn(),
    isPractice: args.isPractice,
    maxPoints: args.maxPoints,
  });

  return { submit, onSubmitted, persistAll, stopTimer };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  requestEvaluation.mockReset();
  submitSession.mockReset();
});

describe('useExamSubmit — Practice-Modus', () => {
  it('skippt submitSession und aggregiert lokal aus Evaluations', async () => {
    requestEvaluation
      .mockResolvedValueOnce(makeEvaluation(4, 5))
      .mockResolvedValueOnce(makeEvaluation(3, 5));

    const { submit, onSubmitted } = setup({ isPractice: true, maxPoints: 10 });
    await submit.submit();

    expect(submitSession).not.toHaveBeenCalled();
    expect(onSubmitted).toHaveBeenCalledOnce();
    expect(onSubmitted).toHaveBeenCalledWith({
      totalScore: 7,
      maxPoints: 10,
      percentageScore: 70,
      ihkGrade: 'befriedigend',
    });
  });

  it('zählt fehlgeschlagene Evaluations als 0 und liefert trotzdem ein Ergebnis', async () => {
    requestEvaluation
      .mockResolvedValueOnce(makeEvaluation(5, 5))
      .mockRejectedValueOnce(new Error('AI-Timeout'));

    const { submit, onSubmitted } = setup({ isPractice: true, maxPoints: 10 });
    await submit.submit();

    expect(submitSession).not.toHaveBeenCalled();
    expect(onSubmitted).toHaveBeenCalledWith({
      totalScore: 5,
      maxPoints: 10,
      percentageScore: 50,
      ihkGrade: 'ausreichend',
    });
    expect(submit.submitError.value).toBeNull();
  });

  it('IHK-Notenschwellen entsprechen der Backend-Logik', async () => {
    const cases: Array<[number, number, string]> = [
      [10, 10, 'sehr_gut'], // 100 %
      [9, 10, 'sehr_gut'], // 90 → wait: 90 < 92 = gut. Test thresholds carefully.
      [8.2, 10, 'gut'], // 82 %
      [7, 10, 'befriedigend'], // 70 %
      [5, 10, 'ausreichend'], // 50 %
      [3, 10, 'mangelhaft'], // 30 %
      [2, 10, 'ungenuegend'], // 20 %
    ];

    // Korrektur: 90 % liegt zwischen 81 (gut) und 92 (sehr_gut) → gut.
    cases[1] = [9, 10, 'gut'];

    for (const [awarded, max, expected] of cases) {
      requestEvaluation.mockResolvedValueOnce(makeEvaluation(awarded, max));
      const { submit, onSubmitted } = setup({
        isPractice: true,
        maxPoints: max,
        states: [makeState('a1')],
      });
      await submit.submit();
      expect(onSubmitted.mock.calls[0][0].ihkGrade, `${awarded}/${max}`).toBe(expected);
    }
  });

  it('liefert ungenuegend wenn maxPoints 0 ist', async () => {
    const { submit, onSubmitted } = setup({
      isPractice: true,
      maxPoints: 0,
      states: [],
    });
    await submit.submit();
    expect(onSubmitted).toHaveBeenCalledWith({
      totalScore: 0,
      maxPoints: 0,
      percentageScore: 0,
      ihkGrade: 'ungenuegend',
    });
  });
});

describe('useExamSubmit — reguläre Prüfung', () => {
  it('ruft submitSession und reicht dessen Ergebnis durch', async () => {
    requestEvaluation
      .mockResolvedValueOnce(makeEvaluation(5, 5))
      .mockResolvedValueOnce(makeEvaluation(5, 5));
    submitSession.mockResolvedValueOnce({
      totalScore: 10,
      maxPoints: 10,
      percentageScore: 100,
      ihkGrade: 'sehr_gut',
    });

    const { submit, onSubmitted } = setup({ isPractice: false });
    await submit.submit();

    expect(submitSession).toHaveBeenCalledWith('sess-1');
    expect(onSubmitted).toHaveBeenCalledWith({
      totalScore: 10,
      maxPoints: 10,
      percentageScore: 100,
      ihkGrade: 'sehr_gut',
    });
  });

  it('setzt submitError wenn submitSession scheitert', async () => {
    requestEvaluation.mockResolvedValueOnce(makeEvaluation(5, 5));
    submitSession.mockRejectedValueOnce(new Error('Aktive Session nicht gefunden.'));

    const { submit, onSubmitted } = setup({
      isPractice: false,
      states: [makeState('a1')],
    });
    await submit.submit();

    expect(onSubmitted).not.toHaveBeenCalled();
    expect(submit.submitError.value).toBe('Aktive Session nicht gefunden.');
    expect(submit.isSubmitting.value).toBe(false);
  });
});
