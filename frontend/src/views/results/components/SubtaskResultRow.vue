<template>
  <div class="subtask-result">
    <div class="str-header">
      <span class="str-label">{{ subtask.label }})</span>
      <span class="str-type">{{ subtask.taskType }}</span>
      <span
        class="str-pts"
        :class="
          subtask.evaluation
            ? pointsClass(subtask.evaluation.awardedPoints, subtask.points)
            : ''
        "
      >
        {{ subtask.evaluation?.awardedPoints ?? '–' }} / {{ subtask.points }} P
      </span>
      <span
        v-if="subtask.evaluation"
        class="str-grade"
        :class="`grade-chip-${subtask.evaluation.ihkGrade}`"
      >
        {{ gradeShort(subtask.evaluation.ihkGrade) }}
      </span>
    </div>

    <p class="str-question">{{ truncate(subtask.questionText, 140) }}</p>

    <div v-if="subtask.answer" class="str-answer">
      <div class="str-answer-label">Deine Antwort</div>
      <div
        v-if="subtask.taskType === 'table' && isJsonArray(subtask.answer)"
        class="result-table-wrap"
      >
        <table class="result-table">
          <tbody>
            <tr v-for="(row, ri) in parseTableAnswer(subtask.answer)" :key="ri">
              <td v-for="(cell, ci) in row" :key="ci" class="result-td">
                {{ cell || '–' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else>{{ truncate(subtask.answer, 200) }}</p>
    </div>

    <div v-if="subtask.evaluation" class="str-eval">
      <div class="str-eval-bar">
        <div
          class="str-eval-fill"
          :style="{ width: subtask.evaluation.percentageScore + '%' }"
          :class="`fill-${subtask.evaluation.ihkGrade}`"
        />
      </div>
      <p class="str-feedback">{{ subtask.evaluation.feedbackText }}</p>
      <div
        v-if="subtask.evaluation.keyMistakes?.length"
        class="str-list str-list-danger"
      >
        <div class="str-list-label">Fehler</div>
        <ul>
          <li v-for="m in subtask.evaluation.keyMistakes" :key="m">{{ m }}</li>
        </ul>
      </div>
      <div
        v-if="subtask.evaluation.improvementHints?.length"
        class="str-list str-list-hint"
      >
        <div class="str-list-label">Tipps</div>
        <ul>
          <li v-for="h in subtask.evaluation.improvementHints" :key="h">{{ h }}</li>
        </ul>
      </div>
    </div>
    <div v-else class="str-no-eval">Keine Bewertung verfügbar</div>
  </div>
</template>

<script setup lang="ts">
/**
 * SubtaskResultRow — Eine einzelne Sub-Aufgabe im Ergebnis-Panel mit Header,
 * (optional) Tabellen-Antwort, Evaluation-Balken, Fehler- und Tipp-Listen.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { SubtaskResult } from '../composables/useSessionResults.js';
import { gradeShort } from '../config.js';
import { isJsonArray, parseTableAnswer, pointsClass, truncate } from '../helpers.js';

defineProps<{
  subtask: SubtaskResult;
}>();
</script>
