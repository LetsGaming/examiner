<template>
  <ion-page>
    <div class="stats-page">
      <header class="stats-header">
        <button class="back-btn" @click="router.push('/home')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Zurück
        </button>
        <h1 class="stats-title">Mein Fortschritt</h1>
        <button class="history-btn" @click="router.push('/history')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Historie
        </button>
      </header>

      <main class="stats-main">
        <!-- Loading -->
        <div v-if="stats.loading.value" class="stats-loading">
          <div class="spinner" />
          <span>Statistiken werden geladen…</span>
        </div>

        <!-- Error -->
        <div v-else-if="stats.error.value" class="stats-error">
          {{ stats.error.value }}
        </div>

        <template v-else-if="stats.stats.value">
          <!-- Summary Cards -->
          <section class="summary-cards">
            <div class="summary-card">
              <div class="card-value">{{ stats.stats.value.totalExams }}</div>
              <div class="card-label">Prüfungen</div>
            </div>
            <div class="summary-card summary-card--accent">
              <div class="card-value">{{ overallAvg }}%</div>
              <div class="card-label">Ø Gesamt</div>
            </div>
            <div class="summary-card" :class="{ 'summary-card--streak': stats.stats.value.currentStreak > 0 }">
              <div class="card-value">{{ stats.stats.value.currentStreak }}</div>
              <div class="card-label">Tage Streak 🔥</div>
            </div>
          </section>

          <!-- Per-Part averages -->
          <section class="section">
            <h2 class="section-title">Durchschnitt pro Teil</h2>
            <div class="part-bars">
              <div v-for="part in PARTS" :key="part.key" class="part-bar-row">
                <div class="part-bar-label">{{ part.label }}</div>
                <div class="part-bar-track">
                  <div
                    class="part-bar-fill"
                    :style="{ width: `${stats.stats.value!.averageScoreByPart[part.key]}%`, background: barColor(stats.stats.value!.averageScoreByPart[part.key]) }"
                  />
                </div>
                <div class="part-bar-pct" :style="{ color: barColor(stats.stats.value!.averageScoreByPart[part.key]) }">
                  {{ stats.stats.value!.examsByPart[part.key] > 0 ? stats.stats.value!.averageScoreByPart[part.key] + '%' : '—' }}
                </div>
                <div v-if="isReady(stats.stats.value!.averageScoreByPart[part.key], stats.stats.value!.examsByPart[part.key])" class="ready-badge">✓ Prüfungsreif</div>
              </div>
            </div>
          </section>

          <!-- Trend Timeline -->
          <section v-if="stats.stats.value.averageScoreTimeline.length > 0" class="section">
            <h2 class="section-title">Trend</h2>
            <div class="timeline-chart">
              <svg :viewBox="`0 0 ${SVG_W} ${SVG_H}`" class="trend-svg" preserveAspectRatio="none">
                <!-- Grid lines -->
                <line v-for="y in [0, 25, 50, 75, 100]" :key="y"
                  :x1="PAD_L" :y1="toY(y)" :x2="SVG_W - PAD_R" :y2="toY(y)"
                  stroke="rgba(255,255,255,0.05)" stroke-width="1" />
                <!-- Y-axis labels -->
                <text v-for="y in [0, 50, 100]" :key="'l'+y"
                  :x="PAD_L - 6" :y="toY(y) + 4" text-anchor="end"
                  fill="#4b5563" font-size="10">{{ y }}%</text>
                <!-- Per-part lines -->
                <g v-for="part in PARTS" :key="part.key">
                  <polyline
                    :points="timelinePoints(part.key)"
                    fill="none"
                    :stroke="part.color"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    opacity="0.85"
                  />
                  <circle
                    v-for="(pt, i) in timelinePointsRaw(part.key)"
                    :key="i"
                    :cx="pt.x" :cy="pt.y"
                    r="4"
                    :fill="part.color"
                    @click="router.push(`/history/${pt.sessionId}`)"
                    style="cursor: pointer"
                  >
                    <title>{{ pt.date }} — {{ pt.pct }}%</title>
                  </circle>
                </g>
              </svg>
              <!-- Legend -->
              <div class="timeline-legend">
                <span v-for="part in PARTS" :key="part.key" class="legend-item">
                  <span class="legend-dot" :style="{ background: part.color }" />
                  {{ part.label }}
                </span>
              </div>
            </div>
          </section>

          <!-- Weak Topics -->
          <section v-if="weakTopics.length > 0" class="section">
            <h2 class="section-title">⚠ Schwächste Themen</h2>
            <div class="weak-list">
              <div v-for="tp in weakTopics" :key="`${tp.part}-${tp.topicArea}`" class="weak-row">
                <div class="weak-info">
                  <span class="weak-topic">{{ tp.topicArea }}</span>
                  <span class="weak-part">{{ partLabel(tp.part) }}</span>
                </div>
                <div class="weak-stats">
                  <span class="weak-pct" :style="{ color: barColor(tp.avgPercentage) }">{{ tp.avgPercentage }}%</span>
                  <span class="weak-attempts">{{ tp.attempts }}× versucht</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Kind Performance -->
          <section v-if="stats.stats.value.kindPerformance.length > 0" class="section">
            <h2 class="section-title">Aufgaben-Typen</h2>
            <div class="kind-bars">
              <div v-for="kp in sortedKindPerf" :key="kp.taskKind" class="kind-bar-row">
                <div class="kind-bar-label">{{ TASK_KIND_LABELS[kp.taskKind] ?? kp.taskKind }}</div>
                <div class="part-bar-track">
                  <div class="part-bar-fill" :style="{ width: `${kp.avgPercentage}%`, background: barColor(kp.avgPercentage) }" />
                </div>
                <div class="part-bar-pct" :style="{ color: barColor(kp.avgPercentage) }">{{ kp.avgPercentage }}%</div>
              </div>
            </div>
          </section>

          <!-- Empty state -->
          <div v-if="stats.stats.value.totalExams === 0" class="empty-state">
            <div class="empty-icon">📊</div>
            <p>Noch keine abgeschlossenen Prüfungen. Starte deine erste Prüfung, um hier Fortschritt zu sehen.</p>
          </div>

          <!-- Feature 10: Export -->
          <section class="section export-section">
            <h2 class="section-title">Daten exportieren</h2>
            <div class="export-btns">
              <a :href="apiBase + '/export/me.json'" :download="`examiner-export-${today}.json`" class="export-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                JSON herunterladen
              </a>
              <a :href="apiBase + '/export/me.csv'" :download="`examiner-export-${today}.csv`" class="export-btn export-btn--csv">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                CSV herunterladen
              </a>
            </div>
          </section>
        </template>
      </main>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { IonPage } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { useStats } from '../composables/useStats.js';
import { API_BASE_URL } from '../constants.js';
import type { ExamPart, TaskKind } from '../types/index.js';

const router = useRouter();
const stats = useStats();
const apiBase = API_BASE_URL;
const today = new Date().toISOString().split('T')[0];

onMounted(() => stats.load());

const PARTS: { key: ExamPart; label: string; color: string }[] = [
  { key: 'teil_1', label: 'Teil 1', color: '#818cf8' },
  { key: 'teil_2', label: 'Teil 2', color: '#34d399' },
  { key: 'teil_3', label: 'Teil 3', color: '#f472b6' },
];

const TASK_KIND_LABELS: Record<TaskKind, string> = {
  diagram: 'Diagramme',
  calc:    'Berechnungen',
  sql:     'SQL',
  code:    'Pseudocode',
  table:   'Tabellen',
  text:    'Freitext',
};

const PART_LABELS: Record<ExamPart, string> = {
  teil_1: 'Teil 1 — Planen',
  teil_2: 'Teil 2 — Entwicklung',
  teil_3: 'Teil 3 — WiSo',
};

function partLabel(p: ExamPart) { return PART_LABELS[p]; }

const overallAvg = computed(() => {
  const s = stats.stats.value;
  if (!s || s.totalExams === 0) return '—';
  const vals = Object.values(s.averageScoreByPart).filter((v) => v > 0);
  if (!vals.length) return '—';
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
});

function barColor(pct: number): string {
  if (pct >= 80) return '#22c55e';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

function isReady(avg: number, count: number): boolean {
  return count >= 3 && avg >= 67;
}

const weakTopics = computed(() => {
  const s = stats.stats.value;
  if (!s) return [];
  return s.topicPerformance.filter((tp) => tp.avgPercentage < 50 && tp.attempts >= 2).slice(0, 5);
});

const sortedKindPerf = computed(() => {
  const s = stats.stats.value;
  if (!s) return [];
  return [...s.kindPerformance].sort((a, b) => a.avgPercentage - b.avgPercentage);
});

// ─── SVG Timeline Chart ───────────────────────────────────────────────────────
const SVG_W = 600;
const SVG_H = 200;
const PAD_L = 36;
const PAD_R = 16;
const PAD_T = 14;
const PAD_B = 20;

function toY(pct: number): number {
  return PAD_T + (1 - pct / 100) * (SVG_H - PAD_T - PAD_B);
}

interface PlotPoint { x: number; y: number; date: string; pct: number; sessionId: string }

function timelinePointsRaw(part: ExamPart): PlotPoint[] {
  const s = stats.stats.value;
  if (!s) return [];
  const entries = s.averageScoreTimeline.filter((e) => e.part === part);
  if (!entries.length) return [];
  const n = entries.length;
  const xStep = (SVG_W - PAD_L - PAD_R) / Math.max(n - 1, 1);
  return entries.map((e, i) => ({
    x: PAD_L + i * xStep,
    y: toY(e.percentage),
    date: e.date,
    pct: e.percentage,
    sessionId: e.sessionId,
  }));
}

function timelinePoints(part: ExamPart): string {
  return timelinePointsRaw(part)
    .map((p) => `${p.x},${p.y}`)
    .join(' ');
}
</script>

<style scoped>
.stats-page { min-height: 100vh; background: var(--bg-base); color: var(--text-secondary); display: flex; flex-direction: column; }
.stats-header { display: flex; align-items: center; gap: 16px; padding: 16px 24px; border-bottom: 1px solid var(--border-light); }
.back-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: var(--control-bg); border: 1px solid var(--control-border); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; color: var(--text-muted); }
.back-btn:hover { background: var(--control-bg-hover); }
.stats-title { flex: 1; font-size: 18px; font-weight: 700; margin: 0; color: var(--text-primary); }
.history-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: var(--brand-bg); border: 1px solid var(--brand-border); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; color: var(--brand-text); }
.history-btn:hover { filter: brightness(1.15); }

.stats-main { padding: 24px; max-width: 780px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 28px; }
.stats-loading, .stats-error { display: flex; align-items: center; gap: 12px; justify-content: center; padding: 60px; color: var(--text-subtle); }
.spinner { width: 22px; height: 22px; border: 2px solid var(--border); border-top-color: var(--brand-text); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.summary-card { background: var(--control-bg); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px; text-align: center; }
.summary-card--accent { background: var(--brand-bg); border-color: var(--brand-border); }
.summary-card--streak { background: var(--warning-bg); border-color: var(--warning-border); }
.card-value { font-size: 32px; font-weight: 800; color: var(--text-primary); }
.card-label { font-size: 12px; color: var(--text-subtle); margin-top: 4px; }

.section { background: var(--control-bg); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 20px; }
.section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-subtle); margin: 0 0 16px; }

.part-bars { display: flex; flex-direction: column; gap: 12px; }
.part-bar-row { display: flex; align-items: center; gap: 12px; }
.part-bar-label { font-size: 13px; color: var(--text-muted); width: 60px; flex-shrink: 0; }
.part-bar-track { flex: 1; height: 10px; background: var(--border); border-radius: 5px; overflow: hidden; }
.part-bar-fill { height: 100%; border-radius: 5px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }
.part-bar-pct { font-size: 13px; font-weight: 700; width: 40px; text-align: right; }
.ready-badge { font-size: 11px; font-weight: 600; color: var(--success-text); background: var(--success-bg); border: 1px solid var(--success-border); border-radius: 20px; padding: 2px 10px; }

.timeline-chart { overflow-x: auto; }
.trend-svg { width: 100%; height: 180px; display: block; }
.timeline-legend { display: flex; gap: 16px; margin-top: 10px; flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

.weak-list { display: flex; flex-direction: column; gap: 10px; }
.weak-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--danger-bg); border: 1px solid var(--danger-border); border-radius: var(--radius-sm); }
.weak-info { display: flex; flex-direction: column; gap: 2px; }
.weak-topic { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.weak-part { font-size: 11px; color: var(--text-subtle); }
.weak-stats { display: flex; align-items: center; gap: 10px; }
.weak-pct { font-size: 16px; font-weight: 800; }
.weak-attempts { font-size: 11px; color: var(--text-subtle); }

.kind-bars { display: flex; flex-direction: column; gap: 10px; }
.kind-bar-row { display: flex; align-items: center; gap: 12px; }
.kind-bar-label { font-size: 13px; color: var(--text-muted); width: 110px; flex-shrink: 0; }

.empty-state { text-align: center; padding: 40px 20px; color: var(--text-faint); }
.empty-icon { font-size: 40px; margin-bottom: 12px; }
.empty-state p { font-size: 14px; line-height: 1.6; max-width: 380px; margin: 0 auto; }

@media (max-width: 520px) {
  .summary-cards { grid-template-columns: 1fr 1fr; }
  .summary-cards .summary-card:last-child { grid-column: 1 / -1; }
  .part-bar-row { flex-wrap: wrap; }
}
.export-section { padding: 16px 20px; }
.export-btns { display: flex; gap: 10px; flex-wrap: wrap; }
.export-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; background: var(--brand-bg); border: 1px solid var(--brand-border); border-radius: var(--radius-sm); text-decoration: none; font-size: 13px; font-weight: 600; color: var(--brand-text); transition: filter var(--transition); }
.export-btn:hover { filter: brightness(1.15); }
.export-btn--csv { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.25); color: #6ee7b7; } /* emerald: CSV export accent */
.export-btn--csv:hover { filter: brightness(1.15); }
</style>
