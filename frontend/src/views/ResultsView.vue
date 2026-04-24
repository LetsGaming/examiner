<template>
  <ion-page>
    <div class="results-page">
      <header class="results-header">
        <button class="back-btn" @click="router.push('/')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Übersicht
        </button>
        <div class="header-title">Prüfungsergebnis</div>
        <div />
      </header>

      <div v-if="session.loading.value" class="results-loading">
        <div class="loading-spinner" />
        <p>Bewertungen werden geladen…</p>
      </div>

      <main v-else class="results-main">
        <ScoreHero
          :ihk-grade="ihkGrade"
          :total-score="totalScore"
          :max-points="maxPoints"
          :percentage-score="percentageScore"
        />

        <section v-if="session.taskResults.value.length" class="detail-section">
          <h2 class="section-heading">Aufgaben im Detail</h2>
          <TaskResultBlock
            v-for="(task, ti) in session.taskResults.value"
            :key="task.id"
            :task="task"
            :index="ti"
          />
        </section>

        <GradeTable :current-grade="ihkGrade" />

        <button class="new-exam-btn" @click="router.push('/')">
          Neue Prüfung starten
        </button>
      </main>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
/**
 * ResultsView — Shell für die Ergebnis-Anzeige nach einer Prüfungs-Session.
 *
 * Gesamtscore, Grade und Prozent kommen als Query-Params aus der Vorgänger-
 * Route (SessionView) — das ist bewusst so, weil die Session-Fetch-Antwort
 * die aggregierten Summen erst nach dem Subtask-Mapping rekonstruieren müsste
 * und das Redundanz erzeugen würde.
 *
 * Task-Detail-Daten laden wir separat via `useSessionResults`.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonPage } from '@ionic/vue';

import ScoreHero from './results/components/ScoreHero.vue';
import TaskResultBlock from './results/components/TaskResultBlock.vue';
import GradeTable from './results/components/GradeTable.vue';
import { useSessionResults } from './results/composables/useSessionResults.js';

const route = useRoute();
const router = useRouter();

const totalScore = Number(route.query.totalScore);
const maxPoints = Number(route.query.maxPoints);
const percentageScore = Number(route.query.percentageScore);
const ihkGrade = route.query.ihkGrade as string;
const sessionId = route.params.sessionId as string;

const session = useSessionResults();

onMounted(() => session.load(sessionId));
</script>

<style scoped>
@import './results/results.css';
</style>
