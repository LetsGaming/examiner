<template>
  <ion-page>
    <div class="history-page">
      <header class="history-header">
        <button class="back-btn" @click="router.push('/home')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Zurück
        </button>
        <h1 class="history-title">Prüfungshistorie</h1>
        <button class="stats-btn" @click="router.push('/stats')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Statistiken
        </button>
      </header>

      <!-- Filters -->
      <div class="filter-bar">
        <select v-model="filterPart" class="filter-select">
          <option value="">Alle Teile</option>
          <option value="teil_1">Teil 1</option>
          <option value="teil_2">Teil 2</option>
          <option value="teil_3">Teil 3</option>
        </select>
        <select v-model="filterPassed" class="filter-select">
          <option value="">Alle Ergebnisse</option>
          <option value="passed">Bestanden</option>
          <option value="failed">Nicht bestanden</option>
        </select>
        <label class="filter-toggle">
          <input type="checkbox" v-model="showPractice" />
          Übungen anzeigen
        </label>
      </div>

      <main class="history-main">
        <div v-if="loading" class="history-loading">
          <div class="spinner" />
          <span>Wird geladen…</span>
        </div>

        <div v-else-if="error" class="history-error">{{ error }}</div>

        <div v-else-if="filteredSessions.length === 0" class="empty-state">
          <div class="empty-icon">📋</div>
          <p>{{ sessions.length === 0 ? 'Noch keine abgeschlossenen Prüfungen vorhanden.' : 'Keine Einträge für den gewählten Filter.' }}</p>
        </div>

        <div v-else class="session-list">
          <div
            v-for="s in filteredSessions"
            :key="s.id"
            class="session-card"
            @click="router.push(`/history/${s.id}`)"
          >
            <div class="card-left">
              <div class="card-part">{{ PART_LABELS[s.part as ExamPart] }}</div>
              <div class="card-title">{{ s.title }}</div>
              <div class="card-meta">
                <span>{{ formatDate(s.submittedAt ?? s.startedAt) }}</span>
                <span v-if="s.isPractice" class="chip chip--practice">Übung</span>
                <span v-else class="chip chip--exam">Prüfung</span>
              </div>
            </div>
            <div class="card-right">
              <div v-if="s.ihkGrade" class="grade-badge" :class="`grade--${s.ihkGrade}`">
                {{ GRADE_LABELS[s.ihkGrade as IhkGrade] ?? s.ihkGrade }}
              </div>
              <div v-if="s.totalScore != null" class="score-text">
                {{ s.totalScore }}/{{ s.maxPoints }}P
                <span class="score-pct">({{ Math.round(s.totalScore / s.maxPoints * 100) }}%)</span>
              </div>
              <div v-else class="score-text score-text--pending">Nicht bewertet</div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        </div>
      </main>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { IonPage } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { fetchSessionList } from '../composables/useApi.js';
import type { SessionListItem, ExamPart, IhkGrade } from '../types/index.js';

const router = useRouter();

const sessions = ref<SessionListItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const filterPart = ref('');
const filterPassed = ref('');
const showPractice = ref(false);

const PART_LABELS: Record<ExamPart, string> = {
  teil_1: 'Teil 1 — Planen',
  teil_2: 'Teil 2 — Entwicklung',
  teil_3: 'Teil 3 — WiSo',
};

const GRADE_LABELS: Record<IhkGrade, string> = {
  sehr_gut:     '1',
  gut:          '2',
  befriedigend: '3',
  ausreichend:  '4',
  mangelhaft:   '5',
  ungenuegend:  '6',
};

onMounted(async () => {
  loading.value = true;
  try {
    sessions.value = await fetchSessionList();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Fehler';
  } finally {
    loading.value = false;
  }
});

const filteredSessions = computed(() => {
  return sessions.value.filter((s) => {
    if (s.isPractice && !showPractice.value) return false;
    if (filterPart.value && s.part !== filterPart.value) return false;
    if (filterPassed.value === 'passed') {
      const pct = s.totalScore != null ? s.totalScore / s.maxPoints * 100 : 0;
      if (pct < 50) return false;
    }
    if (filterPassed.value === 'failed') {
      const pct = s.totalScore != null ? s.totalScore / s.maxPoints * 100 : 100;
      if (pct >= 50) return false;
    }
    return true;
  });
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
</script>

<style scoped>
.history-page { min-height: 100vh; background: var(--bg-base); color: var(--text-secondary); display: flex; flex-direction: column; }
.history-header { display: flex; align-items: center; gap: 16px; padding: 16px 24px; border-bottom: 1px solid var(--border-light); }
.back-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: var(--control-bg); border: 1px solid var(--control-border); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; color: var(--text-muted); }
.back-btn:hover { background: var(--control-bg-hover); }
.history-title { flex: 1; font-size: 18px; font-weight: 700; margin: 0; color: var(--text-primary); }
.stats-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: var(--brand-bg); border: 1px solid var(--brand-border); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; color: var(--brand-text); }
.stats-btn:hover { filter: brightness(1.15); }

.filter-bar { display: flex; align-items: center; gap: 12px; padding: 12px 24px; border-bottom: 1px solid var(--border-light); flex-wrap: wrap; }
.filter-select { padding: 6px 10px; background: var(--control-bg); border: 1px solid var(--control-border); border-radius: 7px; color: var(--text-secondary); font-size: 13px; cursor: pointer; }
.filter-toggle { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-muted); cursor: pointer; }
.filter-toggle input { cursor: pointer; }

.history-main { padding: 20px 24px; max-width: 700px; margin: 0 auto; width: 100%; }
.history-loading, .history-error { display: flex; align-items: center; gap: 12px; justify-content: center; padding: 60px; color: var(--text-subtle); }
.spinner { width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--brand-text); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 60px 20px; color: var(--text-faint); }
.empty-icon { font-size: 36px; margin-bottom: 12px; }
.empty-state p { font-size: 14px; }

.session-list { display: flex; flex-direction: column; gap: 10px; }
.session-card { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; background: var(--control-bg); border: 1px solid var(--border); border-radius: var(--radius-md); cursor: pointer; transition: background var(--transition), border-color var(--transition); gap: 12px; }
.session-card:hover { background: var(--control-bg-hover); border-color: var(--border-brand); }
.card-left { flex: 1; min-width: 0; }
.card-part { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-subtle); margin-bottom: 3px; }
.card-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-subtle); }
.chip { padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.chip--exam     { background: var(--brand-bg);    color: var(--brand-text); }
.chip--practice { background: var(--warning-bg);  color: var(--warning-text); }
.card-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.grade-badge { width: 36px; height: 36px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; }
.grade--sehr_gut, .grade--gut     { background: var(--success-bg); color: var(--success-text); }
.grade--befriedigend, .grade--ausreichend { background: var(--warning-bg); color: var(--warning-text); }
.grade--mangelhaft, .grade--ungenuegend   { background: var(--danger-bg);  color: var(--danger-text); }
.score-text { font-size: 13px; font-weight: 600; color: var(--text-muted); }
.score-pct { color: var(--text-subtle); font-weight: 400; }
.score-text--pending { color: var(--text-faint); font-style: italic; }
</style>
