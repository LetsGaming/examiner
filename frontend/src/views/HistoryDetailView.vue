<template>
  <ion-page>
    <div class="detail-page">
      <header class="detail-header">
        <button class="back-btn" @click="router.push('/history')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Zurück
        </button>
        <div class="header-info" v-if="session">
          <span class="header-title">{{ session.examTemplate?.title }}</span>
          <span class="header-date">{{ formatDate(session.submittedAt ?? session.startedAt) }}</span>
        </div>
        <div class="header-grade" v-if="session?.ihkGrade">
          <span class="grade-chip" :class="`grade--${session.ihkGrade}`">Note {{ GRADE_SHORT[session.ihkGrade as IhkGrade] }}</span>
          <span class="grade-pct">{{ gradePct }}%</span>
        </div>
      </header>

      <div v-if="loading" class="detail-loading">
        <div class="spinner" />
        Wird geladen…
      </div>
      <div v-else-if="error" class="detail-error">{{ error }}</div>

      <div v-else-if="session" class="detail-body">
        <!-- Sidebar: Task/Subtask navigation -->
        <aside class="detail-sidebar">
          <div v-for="task in session.examTemplate?.tasks ?? []" :key="task.id" class="sidebar-task">
            <div class="sidebar-task-header">{{ task.topicArea }}</div>
            <div
              v-for="st in task.subtasks"
              :key="st.id"
              class="sidebar-subtask"
              :class="{ 'sidebar-subtask--active': activeSubtaskId === st.id, 'sidebar-subtask--evaluated': hasEval(st.id) }"
              @click="activeSubtaskId = st.id"
            >
              <span class="sidebar-dot" />
              {{ st.label }}
            </div>
          </div>
        </aside>

        <!-- Main: Active subtask -->
        <main class="detail-main">
          <template v-if="activeSubtask">
            <div class="subtask-header">
              <span class="subtask-label-badge">{{ activeSubtask.label }}</span>
              <span class="subtask-pts">{{ activeSubtask.points }}P</span>
              <span class="subtask-type">{{ TASK_TYPE_LABELS[activeSubtask.taskType as TaskType] }}</span>
            </div>

            <!-- Question -->
            <div class="question-block">
              <div class="block-title">Aufgabenstellung</div>
              <div class="question-text">{{ activeSubtask.questionText }}</div>
            </div>

            <!-- User answer (readonly) -->
            <div class="answer-block">
              <div class="block-title">Deine Antwort</div>
              <ReadonlyAnswer
                :subtask="activeSubtask"
                :answer="activeAnswer"
                :expected-answer="(activeSubtask as any).expectedAnswer"
              />
            </div>

            <!-- Evaluation -->
            <div v-if="activeAnswer?.evaluation" class="eval-block">
              <EvaluationPanel
                :evaluation="activeAnswer.evaluation"
                :max-points="activeSubtask.points"
                :expected-answer="(activeSubtask as any).expectedAnswer"
                :task-type="activeSubtask.taskType"
                :session-id="session?.id"
                :answer-id="activeAnswer?.id"
                :allow-second-opinion="true"
              />
            </div>
            <div v-else class="no-eval">
              Diese Teilaufgabe wurde nicht bewertet.
            </div>

            <!-- Navigation -->
            <div class="nav-btns">
              <button class="nav-btn" :disabled="!prevSubtask" @click="navigate(-1)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                Vorherige
              </button>
              <button class="nav-btn nav-btn--next" :disabled="!nextSubtask" @click="navigate(1)">
                Nächste
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </template>
        </main>
      </div>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { IonPage } from '@ionic/vue';
import { useRouter, useRoute } from 'vue-router';
import { fetchSessionDetail } from '../composables/useApi.js';
import EvaluationPanel from '../components/EvaluationPanel.vue';
import ReadonlyAnswer from '../components/ReadonlyAnswer.vue';
import type { ExamSession, SubTask, Answer, IhkGrade, TaskType } from '../types/index.js';

const router = useRouter();
const route = useRoute();

const session = ref<ExamSession | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const activeSubtaskId = ref('');

const GRADE_SHORT: Record<IhkGrade, string> = {
  sehr_gut: '1', gut: '2', befriedigend: '3', ausreichend: '4', mangelhaft: '5', ungenuegend: '6',
};

const TASK_TYPE_LABELS: Record<string, string> = {
  freitext: 'Freitext', pseudocode: 'Pseudocode', sql: 'SQL', mc: 'MC', mc_multi: 'MC+',
  plantuml: 'PlantUML', diagram_upload: 'Diagramm', table: 'Tabelle',
};

onMounted(async () => {
  loading.value = true;
  try {
    const sessionId = route.params.sessionId as string;
    session.value = await fetchSessionDetail(sessionId);
    // Set first subtask active
    const first = session.value.examTemplate?.tasks[0]?.subtasks[0];
    if (first) activeSubtaskId.value = first.id;
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Fehler';
  } finally {
    loading.value = false;
  }
});

const allSubtasks = computed<SubTask[]>(() => {
  return session.value?.examTemplate?.tasks.flatMap((t) => t.subtasks) ?? [];
});

const activeSubtask = computed(() => allSubtasks.value.find((s) => s.id === activeSubtaskId.value));

const activeAnswer = computed<Answer | undefined>(() =>
  session.value?.answers.find((a) => a.subtaskId === activeSubtaskId.value)
);

function hasEval(subtaskId: string): boolean {
  return !!session.value?.answers.find((a) => a.subtaskId === subtaskId)?.evaluation;
}

const gradePct = computed(() => {
  const s = session.value;
  if (!s || s.totalScore == null || !s.examTemplate) return 0;
  return Math.round((s.totalScore / s.examTemplate.maxPoints) * 100);
});

const currentIndex = computed(() => allSubtasks.value.findIndex((s) => s.id === activeSubtaskId.value));
const prevSubtask = computed(() => currentIndex.value > 0 ? allSubtasks.value[currentIndex.value - 1] : null);
const nextSubtask = computed(() => currentIndex.value < allSubtasks.value.length - 1 ? allSubtasks.value[currentIndex.value + 1] : null);

function navigate(dir: 1 | -1) {
  const target = dir === 1 ? nextSubtask.value : prevSubtask.value;
  if (target) activeSubtaskId.value = target.id;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.detail-page { min-height: 100vh; background: var(--bg-base); color: var(--text-secondary); display: flex; flex-direction: column; }
.detail-header { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--border-light); flex-wrap: wrap; }
.back-btn { display: flex; align-items: center; gap: 6px; padding: 7px 12px; background: var(--control-bg); border: 1px solid var(--control-border); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; color: var(--text-muted); flex-shrink: 0; }
.back-btn:hover { background: var(--control-bg-hover); }
.header-info { flex: 1; min-width: 0; }
.header-title { display: block; font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary); }
.header-date { font-size: 12px; color: var(--text-subtle); }
.header-grade { display: flex; align-items: center; gap: 8px; }
.grade-chip { padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 700; }
.grade--sehr_gut, .grade--gut         { background: var(--success-bg); color: var(--success-text); }
.grade--befriedigend, .grade--ausreichend { background: var(--warning-bg); color: var(--warning-text); }
.grade--mangelhaft, .grade--ungenuegend   { background: var(--danger-bg);  color: var(--danger-text); }
.grade-pct { font-size: 14px; font-weight: 700; color: var(--text-muted); }

.detail-loading, .detail-error { display: flex; align-items: center; gap: 12px; justify-content: center; padding: 60px; color: var(--text-subtle); }
.spinner { width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--brand-text); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.detail-body { display: grid; grid-template-columns: 220px 1fr; flex: 1; min-height: 0; overflow: auto; }
.detail-sidebar { border-right: 1px solid var(--border-light); padding: 16px 0; overflow-y: auto; }
.sidebar-task { margin-bottom: 8px; }
.sidebar-task-header { padding: 6px 16px 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-faint); }
.sidebar-subtask { padding: 7px 16px 7px 12px; font-size: 13px; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background var(--transition); border-left: 2px solid transparent; }
.sidebar-subtask:hover { background: var(--control-bg); }
.sidebar-subtask--active { color: var(--text-primary); border-left-color: var(--brand-text); background: var(--brand-bg); }
.sidebar-subtask--evaluated .sidebar-dot { background: var(--success); }
.sidebar-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border-hover); flex-shrink: 0; }

.detail-main { padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; max-width: 760px; }
.subtask-header { display: flex; align-items: center; gap: 10px; }
.subtask-label-badge { font-size: 13px; font-weight: 700; color: var(--text-secondary); background: var(--control-bg); padding: 3px 12px; border-radius: 20px; }
.subtask-pts { font-size: 13px; color: var(--text-subtle); }
.subtask-type { font-size: 12px; color: var(--text-faint); background: var(--control-bg); padding: 2px 8px; border-radius: 4px; }

.block-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-subtle); margin-bottom: 8px; }
.question-block, .answer-block { background: var(--control-bg); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 16px; }
.question-text { font-size: 14px; line-height: 1.65; color: var(--text-secondary); white-space: pre-wrap; }
.no-eval { font-size: 13px; color: var(--text-faint); font-style: italic; padding: 12px; background: var(--control-bg); border-radius: var(--radius-sm); }

.nav-btns { display: flex; gap: 10px; justify-content: space-between; margin-top: 4px; }
.nav-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--control-bg); border: 1px solid var(--control-border); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; color: var(--text-muted); }
.nav-btn:hover:not(:disabled) { background: var(--control-bg-hover); }
.nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.nav-btn--next { margin-left: auto; }

@media (max-width: 640px) {
  .detail-body { grid-template-columns: 1fr; }
  .detail-sidebar { border-right: none; border-bottom: 1px solid var(--border-light); max-height: 160px; }
}
</style>
