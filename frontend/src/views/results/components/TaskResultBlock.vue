<template>
  <div class="task-block">
    <div class="task-block-header">
      <span class="task-block-num">{{ index + 1 }}</span>
      <span class="task-block-topic">{{ task.topicArea }}</span>
      <span
        class="task-block-pts"
        :class="pointsClass(task.earnedPoints, task.maxPoints)"
      >
        {{ task.earnedPoints ?? '–' }} / {{ task.maxPoints }} P
      </span>
      <TaskReportButton
        v-if="reportContext"
        class="task-block-report"
        :context="reportContext"
        compact
      />
    </div>

    <SubtaskResultRow v-for="st in task.subtasks" :key="st.id" :subtask="st" />
  </div>
</template>

<script setup lang="ts">
/**
 * TaskResultBlock — Ein Aufgaben-Kopf mit summierten Punkten und einer Liste
 * von Sub-Aufgaben. Der Index kommt von außen (1-based Anzeige).
 *
 * Wenn examPart + sessionId vom Container durchgereicht werden, zeigt der Block
 * zusätzlich einen "Aufgabe melden"-Knopf am Header. Ohne diese Props ist der
 * Knopf unsichtbar — das Composable bleibt rückwärtskompatibel.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { computed } from 'vue';
import type { ExamPart } from '../../../types/index.js';
import type { TaskResult } from '../composables/useSessionResults.js';
import { pointsClass } from '../helpers.js';
import SubtaskResultRow from './SubtaskResultRow.vue';
import TaskReportButton from '../../../components/exam/TaskReportButton.vue';

const props = defineProps<{
  task: TaskResult;
  index: number;
  examPart?: ExamPart | null;
  sessionId?: string | null;
}>();

const reportContext = computed(() => {
  if (!props.examPart) return null;
  return {
    taskId: props.task.id,
    topicArea: props.task.topicArea ?? '(unbekannt)',
    examPart: props.examPart,
    sessionId: props.sessionId ?? undefined,
  };
});
</script>

<style scoped>
.task-block-report {
  margin-left: auto;
}
</style>
