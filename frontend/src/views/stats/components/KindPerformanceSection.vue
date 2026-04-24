<template>
  <section v-if="kindPerf.length > 0" class="section">
    <h2 class="section-title">Aufgaben-Typen</h2>
    <div class="kind-bars">
      <div v-for="kp in kindPerf" :key="kp.taskKind" class="kind-bar-row">
        <div class="kind-bar-label">
          {{ TASK_KIND_LABELS[kp.taskKind] ?? kp.taskKind }}
        </div>
        <div class="part-bar-track">
          <div
            class="part-bar-fill"
            :style="{
              width: `${kp.avgPercentage}%`,
              background: barColor(kp.avgPercentage),
            }"
          />
        </div>
        <div
          class="part-bar-pct"
          :style="{ color: barColor(kp.avgPercentage) }"
        >
          {{ kp.avgPercentage }}%
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * KindPerformanceSection — Fortschrittsbalken pro Aufgaben-Typ (diagram, sql,
 * calc, …). Sortierung macht die Shell (aufsteigend → User sieht Schwächen zuerst).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { KindPerformance } from '../../../types/index.js';
import { TASK_KIND_LABELS, barColor } from '../config.js';

defineProps<{
  kindPerf: KindPerformance[];
}>();
</script>
