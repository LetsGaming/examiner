<template>
  <ion-page>
    <div class="stats-page">
      <header class="stats-header">
        <button class="back-btn" @click="router.push('/home')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Zurück
        </button>
        <h1 class="stats-title">Mein Fortschritt</h1>
        <button class="history-btn" @click="router.push('/history')">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Historie
        </button>
      </header>

      <main class="stats-main">
        <div v-if="stats.loading.value" class="stats-loading">
          <div class="spinner" />
          <span>Statistiken werden geladen…</span>
        </div>

        <div v-else-if="stats.error.value" class="stats-error">
          {{ stats.error.value }}
        </div>

        <template v-else-if="stats.stats.value">
          <SummaryCards
            :total-exams="stats.stats.value.totalExams"
            :overall-avg="derivations.overallAvg.value"
            :current-streak="stats.stats.value.currentStreak"
          />

          <PartAveragesSection
            :average-by-part="stats.stats.value.averageScoreByPart"
            :exams-by-part="stats.stats.value.examsByPart"
          />

          <TimelineChartSection
            :timeline="stats.stats.value.averageScoreTimeline"
            :points-raw="chart.pointsRaw"
            :points-string="chart.pointsString"
            @point-click="(sessionId) => router.push(`/history/${sessionId}`)"
          />

          <WeakTopicsSection :weak-topics="derivations.weakTopics.value" />

          <KindPerformanceSection :kind-perf="derivations.sortedKindPerf.value" />

          <div v-if="stats.stats.value.totalExams === 0" class="empty-state">
            <div class="empty-icon">📊</div>
            <p>
              Noch keine abgeschlossenen Prüfungen. Starte deine erste Prüfung, um hier
              Fortschritt zu sehen.
            </p>
          </div>

          <ExportSection :api-base="apiBase" :today="today" />
        </template>
      </main>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
/**
 * StatsView — Shell für die persönliche Fortschritts-Übersicht.
 *
 * Lädt rohe Stats via `useStats`, leitet Derived-Werte in `useStatsDerivations`
 * ab, und baut Chart-Punkte mit `useTimelineChart`. Alle Sections sind reine
 * Präsentations-Komponenten.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { onMounted } from 'vue';
import { IonPage } from '@ionic/vue';
import { useRouter } from 'vue-router';

import { useStats } from '../composables/useStats.js';
import { API_BASE_URL } from '../constants.js';

import SummaryCards from './stats/components/SummaryCards.vue';
import PartAveragesSection from './stats/components/PartAveragesSection.vue';
import TimelineChartSection from './stats/components/TimelineChartSection.vue';
import WeakTopicsSection from './stats/components/WeakTopicsSection.vue';
import KindPerformanceSection from './stats/components/KindPerformanceSection.vue';
import ExportSection from './stats/components/ExportSection.vue';
import { useStatsDerivations } from './stats/composables/useStatsDerivations.js';
import { useTimelineChart } from './stats/composables/useTimelineChart.js';

const router = useRouter();
const stats = useStats();
const derivations = useStatsDerivations(stats.stats);
const chart = useTimelineChart(stats.stats);
const apiBase = API_BASE_URL;
const today = new Date().toISOString().split('T')[0];

onMounted(() => stats.load());
</script>

<style scoped>
@import './stats/stats.css';
</style>
