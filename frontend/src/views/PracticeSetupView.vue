<template>
  <ion-page>
    <div class="practice-page">
      <header class="practice-header">
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
        <h1 class="practice-title">Gezielter Übungsmodus</h1>
      </header>

      <main class="practice-main">
        <div class="setup-card">
          <div class="setup-icon">🎯</div>
          <h2 class="setup-heading">Übungssession konfigurieren</h2>
          <p class="setup-desc">
            Trainiere gezielt schwache Themen oder bestimmte Aufgaben-Typen — ohne Zeitdruck.
          </p>

          <div class="form-grid">
            <div class="form-field">
              <label class="field-label">Prüfungsteil *</label>
              <select v-model="practice.form.value.part" class="field-select">
                <option value="teil_1">Teil 1 — Planen</option>
                <option value="teil_2">Teil 2 — Entwicklung</option>
                <option value="teil_3">Teil 3 — WiSo</option>
              </select>
            </div>

            <div class="form-field">
              <label class="field-label">Themengebiet</label>
              <select
                v-model="practice.form.value.topic"
                class="field-select"
                :disabled="practice.topicsLoading.value"
              >
                <option value="">Beliebig</option>
                <option v-for="t in practice.topicInfos.value" :key="t.topic" :value="t.topic">
                  {{ t.topic }}
                  <template v-if="t.poolCount > 0"> ({{ t.poolCount }} im Pool)</template>
                </option>
              </select>
            </div>

            <div
              v-if="practice.form.value.topic && practice.inferredKind.value"
              class="form-field"
            >
              <label class="field-label">Aufgaben-Typ (aus Thema abgeleitet)</label>
              <div class="kind-badge">
                {{ KIND_LABELS[practice.inferredKind.value] }}
              </div>
            </div>
            <div v-else-if="!practice.form.value.topic" class="form-field">
              <label class="field-label">Aufgaben-Typ</label>
              <div class="kind-badge kind-badge--any">Alle Typen (kein Thema gewählt)</div>
            </div>

            <div class="form-field">
              <label class="field-label"
                >Anzahl Aufgaben: <strong>{{ practice.form.value.count }}</strong></label
              >
              <input
                type="range"
                v-model.number="practice.form.value.count"
                min="1"
                max="10"
                step="1"
                class="field-range"
              />
              <div class="range-labels"><span>1</span><span>10</span></div>
            </div>
          </div>

          <div v-if="practice.error.value" class="setup-error">
            {{ practice.error.value }}
          </div>

          <button
            class="start-btn"
            :disabled="practice.loading.value"
            @click="practice.start"
          >
            <span v-if="practice.loading.value" class="btn-spinner" />
            <svg
              v-else
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {{ practice.loading.value ? 'Wird gestartet…' : 'Übungssession starten' }}
          </button>
        </div>
      </main>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
/**
 * PracticeSetupView — Shell für die Konfiguration einer Übungs-Session.
 *
 * State, API-Calls und inferred-kind-Logik leben in `usePracticeSetup`.
 * Die Shell orchestriert nur Routing und Route-Query-Parsing.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { onMounted } from 'vue';
import { IonPage } from '@ionic/vue';
import { useRouter, useRoute } from 'vue-router';

import { useSpecialty } from '../composables/useSpecialty.js';
import { usePracticeSetup } from './practice/composables/usePracticeSetup.js';
import { KIND_LABELS } from './practice/config.js';
import type { ExamPart } from '../types/index.js';

const router = useRouter();
const route = useRoute();
const { specialty } = useSpecialty();

const practice = usePracticeSetup({
  specialty,
  initial: {
    part: (route.query.part as ExamPart) || undefined,
    topic: (route.query.topic as string) || undefined,
  },
  onStarted: (sessionId) => router.push(`/session/${sessionId}`),
});

onMounted(practice.loadTopics);
</script>

<style>
@import './practice/practice.css';
</style>
