/**
 * views/results/composables/useSessionResults.ts — Lädt eine Session und baut
 * daraus die Task-/Subtask-Struktur für die Ergebnis-Anzeige.
 *
 * Das Mapping aus der API-Session ist nicht trivial: Antworten liegen flach
 * in `session.answers`, müssen aber pro Subtask aufgelöst werden. Die
 * `earnedPoints` pro Task summieren wir hier aus den Subtask-Evaluations,
 * damit das Template dumm bleibt.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { ref } from 'vue';
import { fetchSession } from '../../../composables/api/index.js';
import type { ExamPart } from '../../../types/index.js';

export interface SubtaskEvaluation {
  awardedPoints: number;
  percentageScore: number;
  ihkGrade: string;
  feedbackText: string;
  keyMistakes: string[];
  improvementHints: string[];
}

export interface SubtaskResult {
  id: string;
  label: string;
  taskType: string;
  questionText: string;
  points: number;
  answer?: string;
  evaluation?: SubtaskEvaluation;
}

export interface TaskResult {
  id: string;
  topicArea?: string;
  maxPoints: number;
  earnedPoints?: number;
  subtasks: SubtaskResult[];
}

export function useSessionResults() {
  const taskResults = ref<TaskResult[]>([]);
  const loading = ref(true);
  const examPart = ref<ExamPart | null>(null);
  const sessionId = ref<string | null>(null);

  async function load(id: string): Promise<void> {
    loading.value = true;
    sessionId.value = id;
    try {
      const session = await fetchSession(id);
      examPart.value = session.examTemplate?.part ?? null;
      if (!session.examTemplate) {
        taskResults.value = [];
        return;
      }
      taskResults.value = session.examTemplate.tasks.map((task) => {
        const subtasks: SubtaskResult[] = task.subtasks.map((st) => {
          const ans = session.answers?.find((a) => a.subtaskId === st.id);
          return {
            id: st.id,
            label: st.label,
            taskType: st.taskType,
            questionText: st.questionText,
            points: st.points,
            answer: ans?.textValue || ans?.selectedMcOption || undefined,
            evaluation: ans?.evaluation ?? undefined,
          };
        });
        const earned = subtasks.reduce(
          (s, st) => s + (st.evaluation?.awardedPoints ?? 0),
          0,
        );
        return {
          id: task.id,
          topicArea: task.topicArea,
          maxPoints: task.maxPoints,
          earnedPoints: earned,
          subtasks,
        };
      });
    } finally {
      loading.value = false;
    }
  }

  return { taskResults, loading, examPart, sessionId, load };
}

export type UseSessionResults = ReturnType<typeof useSessionResults>;
