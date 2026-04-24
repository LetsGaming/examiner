<template>
  <section class="tab-content">
    <div v-if="loading" class="loading-row">
      <div class="spinner" />
      Lädt…
    </div>
    <template v-else-if="health">
      <div class="health-score-row">
        <div class="health-score-big" :class="pillClass">{{ health.score }}</div>
        <div class="health-score-desc">
          <div>{{ errorCount }} Fehler</div>
          <div>{{ warningCount }} Warnungen</div>
          <div>{{ infoCount }} Hinweise</div>
        </div>
        <button class="btn-ghost btn-sm" @click="$emit('reload')">↻ Aktualisieren</button>
      </div>
      <div v-if="!health.issues.length" class="empty-state">
        <span class="empty-icon">✓</span>
        Keine Probleme gefunden
      </div>
      <div v-else class="issues-list">
        <div
          v-for="(issue, i) in health.issues"
          :key="i"
          class="issue-row"
          :class="`issue-row--${issue.severity}`"
        >
          <div class="issue-dot" :class="`issue-dot--${issue.severity}`" />
          <div class="issue-text">
            <div>{{ issue.message }}</div>
            <div class="issue-sev">{{ issue.severity }}</div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
/**
 * HealthSection — Pool-Health-Score + sortierte Issue-Liste.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { AdminHealth } from '../../../types/index.js';

defineProps<{
  health: AdminHealth | null;
  loading: boolean;
  pillClass: string;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}>();

defineEmits<{
  reload: [];
}>();
</script>
