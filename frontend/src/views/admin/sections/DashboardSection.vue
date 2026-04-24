<template>
  <section class="tab-content">
    <div v-if="loading" class="loading-row">
      <div class="spinner" />
      Lädt…
    </div>
    <template v-else-if="stats">
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-label">Aufgaben gesamt</div>
          <div class="stat-value">{{ stats.totals.tasks }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Prüfungs-Sessions</div>
          <div class="stat-value">{{ stats.totals.sessions }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Registrierte Nutzer</div>
          <div class="stat-value">{{ stats.totals.users }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pool Health</div>
          <div class="stat-value" :class="healthPillClass">{{ healthScore ?? '—' }}</div>
        </div>
      </div>

      <div class="part-cards">
        <div v-for="p in stats.parts" :key="p.part" class="part-card">
          <div class="part-card-header">
            <span class="part-label">{{ PART_LABELS[p.part] }}</span>
            <span class="part-total">{{ p.total }} Aufgaben</span>
          </div>
          <div class="kind-chips">
            <span v-for="k in p.kindDistribution" :key="k.task_kind" class="kind-chip"
              >{{ k.task_kind }}: {{ k.n }}</span
            >
          </div>
          <div class="part-card-meta">
            <span class="meta-tag meta-tag--warn">{{ p.neverUsedCount }} ungenutzt</span>
            <button class="link-btn" @click="$emit('navigate', 'pool-' + p.part)">
              Pool anzeigen →
            </button>
          </div>
          <div v-if="p.newestTasks.length" class="newest-list">
            <div class="newest-label">Zuletzt hinzugefügt</div>
            <div
              v-for="t in p.newestTasks"
              :key="t.id"
              class="newest-row"
              @click="$emit('openDetail', t.id)"
            >
              <span class="newest-topic">{{ t.topic_area }}</span>
              <span class="kind-chip">{{ t.task_kind }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
/**
 * DashboardSection — Übersichts-Kacheln + Pro-Teil-Karten mit Kind-Verteilung
 * und "zuletzt hinzugefügt"-Liste. Emittiert `navigate` (Tab-Wechsel) und
 * `openDetail` (Task-ID) — keine eigene State-Mutation.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { AdminPoolStats } from '../../../types/index.js';
import { PART_LABELS } from '../constants.js';

defineProps<{
  stats: AdminPoolStats | null;
  loading: boolean;
  healthScore: number | null;
  healthPillClass: string;
}>();

defineEmits<{
  navigate: [tabId: string];
  openDetail: [taskId: string];
}>();
</script>
