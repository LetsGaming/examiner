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
              <select v-model="form.part" class="field-select">
                <option value="teil_1">Teil 1 — Planen</option>
                <option value="teil_2">Teil 2 — Entwicklung</option>
                <option value="teil_3">Teil 3 — WiSo</option>
              </select>
            </div>

            <div class="form-field">
              <label class="field-label">Themengebiet</label>
              <select v-model="form.topic" class="field-select" :disabled="topicsLoading">
                <option value="">Beliebig</option>
                <option v-for="t in topicInfos" :key="t.topic" :value="t.topic">
                  {{ t.topic }}
                  <template v-if="t.poolCount > 0"> ({{ t.poolCount }} im Pool)</template>
                </option>
              </select>
            </div>

            <!-- Kind is inferred from topic — shown as read-only info, not a selector -->
            <div v-if="form.topic && inferredKind" class="form-field">
              <label class="field-label">Aufgaben-Typ (aus Thema abgeleitet)</label>
              <div class="kind-badge">
                {{ KIND_LABELS[inferredKind] }}
              </div>
            </div>
            <div v-else-if="!form.topic" class="form-field">
              <label class="field-label">Aufgaben-Typ</label>
              <div class="kind-badge kind-badge--any">Alle Typen (kein Thema gewählt)</div>
            </div>

            <div class="form-field">
              <label class="field-label"
                >Anzahl Aufgaben: <strong>{{ form.count }}</strong></label
              >
              <input
                type="range"
                v-model.number="form.count"
                min="1"
                max="10"
                step="1"
                class="field-range"
              />
              <div class="range-labels"><span>1</span><span>10</span></div>
            </div>
          </div>

          <div v-if="error" class="setup-error">{{ error }}</div>

          <button class="start-btn" :disabled="loading" @click="startSession">
            <span v-if="loading" class="btn-spinner" />
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
            {{ loading ? 'Wird gestartet…' : 'Übungssession starten' }}
          </button>
        </div>
      </main>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { IonPage } from '@ionic/vue';
import { useRouter, useRoute } from 'vue-router';
import { startPractice, fetchPracticeTopics } from '../composables/useApi.js';
import { useSpecialty } from '../composables/useSpecialty.js';
import type { ExamPart, TaskKind } from '../types/index.js';

const router = useRouter();
const route = useRoute();
const { specialty } = useSpecialty();

const form = ref({
  part: (route.query.part as ExamPart) || ('teil_1' as ExamPart),
  topic: (route.query.topic as string) || '',
  count: 3,
});

interface TopicInfo {
  topic: string;
  inferredKind: TaskKind;
  poolCount: number;
}

const topicInfos = ref<TopicInfo[]>([]);
const topicsLoading = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);

// ─── Derived from selected topic ──────────────────────────────────────────────

/** Kind inferred from the currently selected topic. Null = no topic selected. */
const inferredKind = computed<TaskKind | null>(() => {
  if (!form.value.topic) return null;
  return topicInfos.value.find((t) => t.topic === form.value.topic)?.inferredKind ?? null;
});

/** Human-readable kind label */
const KIND_LABELS: Record<TaskKind, string> = {
  diagram: 'Diagramm / Skizze',
  calc: 'Berechnung',
  sql: 'SQL',
  code: 'Pseudocode / Algorithmus',
  table: 'Tabelle',
  text: 'Freitext',
};

// ─── Load topics from backend ─────────────────────────────────────────────────

async function loadTopics() {
  topicsLoading.value = true;
  form.value.topic = '';
  try {
    topicInfos.value = (await fetchPracticeTopics(form.value.part, specialty.value)) as TopicInfo[];
  } catch {
    topicInfos.value = [];
  } finally {
    topicsLoading.value = false;
  }
}

watch(() => [form.value.part, specialty.value], loadTopics);
onMounted(loadTopics);

async function startSession() {
  error.value = null;
  loading.value = true;
  try {
    const { sessionId } = await startPractice({
      part: form.value.part,
      topic: form.value.topic || undefined,
      // Pass the inferred kind so the backend pool query is precise.
      taskKind: inferredKind.value ?? undefined,
      count: form.value.count,
      specialty: specialty.value,
    });
    router.push(`/session/${sessionId}`);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Fehler beim Starten';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.practice-page {
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
}
.practice-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-light);
}
.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: var(--control-bg);
  border: 1px solid var(--control-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-muted);
}
.back-btn:hover {
  background: var(--control-bg-hover);
}
.practice-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}
.practice-main {
  padding: 40px 24px;
  display: flex;
  justify-content: center;
}
.setup-card {
  background: var(--control-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 36px;
  max-width: 520px;
  width: 100%;
}
.setup-icon {
  font-size: 40px;
  margin-bottom: 12px;
}
.setup-heading {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 8px;
  color: var(--text-primary);
}
.setup-desc {
  font-size: 14px;
  color: var(--text-subtle);
  line-height: 1.6;
  margin: 0 0 28px;
}
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 28px;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
}
.field-label strong {
  color: var(--text-primary);
}
.field-select {
  padding: 9px 12px;
  background: var(--bg-raised);
  border: 1px solid var(--control-border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
}
.field-select:focus {
  outline: none;
  border-color: var(--brand);
}
.field-range {
  width: 100%;
  accent-color: var(--brand);
  cursor: pointer;
}
.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-faint);
  margin-top: 2px;
}
.kind-badge {
  padding: 9px 12px;
  background: var(--brand-bg);
  border: 1px solid var(--brand-border);
  border-radius: var(--radius-sm);
  color: var(--brand-text);
  font-size: 14px;
  font-weight: 600;
}
.kind-badge--any {
  background: var(--control-bg);
  border-color: var(--border);
  color: var(--text-subtle);
  font-weight: 400;
  font-style: italic;
}
.setup-error {
  padding: 10px 14px;
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--danger-text);
  margin-bottom: 16px;
}
.start-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px;
  background: var(--brand-gradient);
  border: none;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  transition: opacity var(--transition);
}
.start-btn:hover:not(:disabled) {
  opacity: 0.9;
}
.start-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
