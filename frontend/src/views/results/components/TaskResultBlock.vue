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
    </div>

    <SubtaskResultRow v-for="st in task.subtasks" :key="st.id" :subtask="st" />
  </div>
</template>

<script setup lang="ts">
/**
 * TaskResultBlock — Ein Aufgaben-Kopf mit summierten Punkten und einer Liste
 * von Sub-Aufgaben. Der Index kommt von außen (1-based Anzeige).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { TaskResult } from '../composables/useSessionResults.js';
import { pointsClass } from '../helpers.js';
import SubtaskResultRow from './SubtaskResultRow.vue';

defineProps<{
  task: TaskResult;
  index: number;
}>();
</script>
