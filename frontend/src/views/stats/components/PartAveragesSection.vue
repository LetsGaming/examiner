<template>
  <section class="section">
    <h2 class="section-title">Durchschnitt pro Teil</h2>
    <div class="part-bars">
      <div v-for="part in PARTS" :key="part.key" class="part-bar-row">
        <div class="part-bar-label">{{ part.label }}</div>
        <div class="part-bar-track">
          <div
            class="part-bar-fill"
            :style="{
              width: `${averageByPart[part.key]}%`,
              background: barColor(averageByPart[part.key]),
            }"
          />
        </div>
        <div
          class="part-bar-pct"
          :style="{ color: barColor(averageByPart[part.key]) }"
        >
          {{ examsByPart[part.key] > 0 ? averageByPart[part.key] + '%' : '—' }}
        </div>
        <div
          v-if="isReady(averageByPart[part.key], examsByPart[part.key])"
          class="ready-badge"
        >
          ✓ Prüfungsreif
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * PartAveragesSection — Pro Prüfungsteil einen Fortschrittsbalken mit
 * Prozent-Ampel und "Prüfungsreif"-Badge (MD §6.1: Grade ≥ befriedigend).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ExamPart } from '../../../types/index.js';
import { PARTS, barColor, isReady } from '../config.js';

defineProps<{
  averageByPart: Record<ExamPart, number>;
  examsByPart: Record<ExamPart, number>;
}>();
</script>
