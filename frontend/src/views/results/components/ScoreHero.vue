<template>
  <div class="score-hero" :class="`grade-${ihkGrade}`">
    <div class="score-label">Gesamtergebnis</div>
    <div class="score-grade">
      {{ IHK_GRADE_LABELS[ihkGrade as IhkGrade] ?? ihkGrade }}
    </div>
    <div class="score-pts">{{ totalScore }} / {{ maxPoints }} Punkte</div>
    <div class="score-bar-wrap">
      <div class="score-bar" :style="{ width: percentageScore + '%' }" />
    </div>
    <div class="score-pct">{{ percentageScore }}%</div>
  </div>
</template>

<script setup lang="ts">
/**
 * ScoreHero — Große Übersichtskachel oben in ResultsView.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { IHK_GRADE_LABELS } from '../../../types/index.js';
import type { IhkGrade } from '../../../types/index.js';

defineProps<{
  ihkGrade: string;
  totalScore: number;
  maxPoints: number;
  percentageScore: number;
}>();
</script>
