<template>
  <div class="exam-page">
    <ExamTopbar
      :exam-part="examPart"
      :scenario-name="scenarioName"
      :formatted-time="formattedTime"
      :timer-class="timerClass"
      @leave="showLeaveConfirm = true"
      @show-scenario="showScenario = true"
      @show-belegsatz="showBelegsatz = true"
    />

    <!-- Progress bar -->
    <div class="progress-bar-wrap">
      <div class="progress-bar-fill" :style="{ width: (answeredCount / Math.max(totalSubtasks, 1)) * 100 + '%' }" />
    </div>

    <div class="exam-body">
      <ExamSidebar
        :tasks="tasks"
        :open="navOpen"
        :active-task="activeTask"
        :active-subtask="activeSubtask"
        :is-answered="isAnswered"
        @close="navOpen = false"
        @navigate="goToTask"
      />

      <main class="exam-main">
        <div class="exam-main-inner">
          <!-- Mobile nav toggle -->
          <div class="mobile-nav">
            <button class="mobile-nav-btn" @click="navOpen = true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
              Aufgaben
            </button>
            <span class="mobile-pos">{{ flatIndex + 1 }} / {{ flatSubtasks.length }}</span>
          </div>

          <!-- Task heading -->
          <div class="task-heading" v-if="currentTask">
            <div class="task-heading-left">
              <span class="th-num">Aufgabe {{ activeTask + 1 }}</span>
              <span class="th-sep">/</span>
              <span class="th-topic">{{ currentTask.topicArea }}</span>
            </div>
            <span class="th-pts">{{ currentTask.maxPoints }} Punkte</span>
          </div>

          <!-- Subtask card -->
          <SubtaskCard
            v-if="currentSubtask && currentAnswerState"
            :subtask="currentSubtask"
            :state="currentAnswerState"
            :table-rows="currentTableRows"
            :table-config="currentSubtask.tableConfig ?? null"
            @text-input="onTextInput"
            @mc-select="onMcSelect"
            @file-selected="onFileSelected"
            @table-cell-input="onTableCellInput"
            @add-table-row="addTableRow"
          />

          <!-- Navigation row -->
          <div class="nav-row">
            <button class="nav-btn nav-back" @click="prevSubtask" :disabled="isFirst">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
              Zurück
            </button>
            <span class="nav-counter">{{ flatIndex + 1 }} / {{ flatSubtasks.length }}</span>
            <button v-if="!isLast" class="nav-btn nav-next" @click="nextSubtask">
              Weiter
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button v-else class="nav-btn nav-submit" @click="showSubmitConfirm = true" :disabled="isSubmitting">
              <span v-if="isSubmitting" class="btn-spinner" />
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
              {{ isSubmitting ? 'Wird bewertet…' : 'Abgeben' }}
            </button>
          </div>
        </div>
      </main>
    </div>

    <!-- Overlays -->
    <Teleport to="body">
      <!-- Scenario overlay -->
      <div v-if="showScenario" class="overlay" @click.self="showScenario = false">
        <div class="overlay-panel">
          <div class="overlay-header">
            <span>Ausgangssituation</span>
            <button @click="showScenario = false">✕</button>
          </div>
          <div class="overlay-body">
            <h3 class="overlay-company">{{ scenarioName }}</h3>
            <p class="overlay-text">{{ scenarioDescription ?? `Alle Aufgaben beziehen sich auf: ${scenarioName}` }}</p>
          </div>
        </div>
      </div>

      <BelegsatzPanel v-model="showBelegsatz" :exam-part="examPart" />

      <!-- Error -->
      <div v-if="submitError" class="overlay" @click.self="submitError = null">
        <div class="confirm-dialog">
          <h3>Fehler bei der Abgabe</h3>
          <p>{{ submitError }}</p>
          <div class="confirm-btns">
            <button class="confirm-ok" @click="submitError = null">Schließen</button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        v-model="showSubmitConfirm"
        title="Prüfung abgeben?"
        confirm-label="Jetzt abgeben"
        cancel-label="Weiterarbeiten"
        @confirm="handleSubmit"
      >
        {{ answeredCount }} von {{ totalSubtasks }} Unteraufgaben beantwortet.<br />
        Beantwortete Aufgaben werden von der KI bewertet.
      </ConfirmDialog>

      <ConfirmDialog
        v-model="showLeaveConfirm"
        title="Prüfung abbrechen?"
        confirm-label="Abbrechen &amp; verlassen"
        cancel-label="Weitermachen"
        :danger="true"
        @confirm="handleCancel"
      >
        Deine bisherigen Antworten gehen verloren und die Prüfung wird <strong>nicht</strong> bewertet.
      </ConfirmDialog>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { requestEvaluation, submitSession } from '../../composables/useApi.js';
import { useExamTimer } from '../../composables/useExamTimer.js';
import { useAnswerState } from '../../composables/useAnswerState.js';
import ExamTopbar    from './ExamTopbar.vue';
import ExamSidebar   from './ExamSidebar.vue';
import SubtaskCard   from './SubtaskCard.vue';
import ConfirmDialog from '../ui/ConfirmDialog.vue';
import BelegsatzPanel from '../BelegsatzPanel.vue';
import type { Task, ExamPart } from '../../types/index.js';

const props = defineProps<{
  sessionId: string;
  examPart: ExamPart;
  tasks: Task[];
  scenarioName?: string;
  scenarioDescription?: string;
  examTitle?: string;
}>();

const emit = defineEmits<{
  submitted: [result: { totalScore: number; maxPoints: number; percentageScore: number; ihkGrade: string }];
}>();

const router = useRouter();

// ─── Composables ──────────────────────────────────────────────────────────────

const {
  flatSubtasks, answerStates, answeredCount, isAnswered,
  getState, debouncedSave, cancelPendingSave, persistAll,
} = useAnswerState(props.sessionId, props.tasks);

const { formattedTime, timerClass, startTimer, stopTimer } = useExamTimer(props.examPart, () => handleSubmit());

// ─── Navigation ───────────────────────────────────────────────────────────────

const activeTask    = ref(0);
const activeSubtask = ref(0);
const navOpen       = ref(false);

const flatIndex     = computed(() => flatSubtasks.value.findIndex((f) => f.ti === activeTask.value && f.si === activeSubtask.value));
const isFirst       = computed(() => flatIndex.value === 0);
const isLast        = computed(() => flatIndex.value === flatSubtasks.value.length - 1);
const currentTask   = computed(() => props.tasks[activeTask.value]);
const currentSubtask = computed(() => currentTask.value?.subtasks[activeSubtask.value]);
const currentAnswerState = computed(() => currentSubtask.value ? (getState(currentSubtask.value.id) ?? null) : null);
const totalSubtasks = computed(() => flatSubtasks.value.length);

function goToTask(ti: number, si: number) {
  activeTask.value = ti;
  activeSubtask.value = si;
  navOpen.value = false;
}
function nextSubtask() { const n = flatSubtasks.value[flatIndex.value + 1]; if (n) goToTask(n.ti, n.si); }
function prevSubtask() { const p = flatSubtasks.value[flatIndex.value - 1]; if (p) goToTask(p.ti, p.si); }

// ─── Overlay flags ────────────────────────────────────────────────────────────

const isSubmitting     = ref(false);
const submitError      = ref<string | null>(null);
const showScenario     = ref(false);
const showBelegsatz    = ref(false);
const showSubmitConfirm = ref(false);
const showLeaveConfirm  = ref(false);

// ─── Input handlers ───────────────────────────────────────────────────────────

function onTextInput(value: string) {
  const a = currentAnswerState.value;
  if (a) a.textValue = value;
  debouncedSave(activeTask.value, activeSubtask.value);
}

function onMcSelect(id: string) {
  const a = currentAnswerState.value;
  if (a) a.selectedMcOption = id;
  debouncedSave(activeTask.value, activeSubtask.value);
}

function onFileSelected(file: File) {
  const a = currentAnswerState.value;
  if (a) a.uploadedFile = file;
  debouncedSave(activeTask.value, activeSubtask.value);
}

// ─── Table logic ──────────────────────────────────────────────────────────────

const currentTableRows = computed<string[][]>({
  get() {
    const st = currentSubtask.value;
    const a  = currentAnswerState.value;
    if (!st || st.taskType !== 'table' || !a) return [];
    if (!a.tableRows?.length) {
      const cfg = st.tableConfig;
      if (cfg?.rows?.length) {
        a.tableRows = cfg.rows.map((row) => [...row]);
      } else if (cfg) {
        a.tableRows = Array.from({ length: cfg.rowCount ?? 3 }, () => Array(cfg.columns.length).fill(''));
      }
    }
    return a.tableRows ?? [];
  },
  set(val) {
    const a = currentAnswerState.value;
    if (a) a.tableRows = val;
  },
});

function onTableCellInput(ri: number, ci: number, value: string) {
  const a = currentAnswerState.value;
  if (!a?.tableRows) return;
  a.tableRows = a.tableRows.map((row, r) => r === ri ? row.map((cell, c) => c === ci ? value : cell) : [...row]);
  debouncedSave(activeTask.value, activeSubtask.value);
}

function addTableRow() {
  const st = currentSubtask.value;
  const a  = currentAnswerState.value;
  if (!st?.tableConfig || !a) return;
  a.tableRows = [...(a.tableRows ?? []), Array(st.tableConfig.columns.length).fill('')];
  debouncedSave(activeTask.value, activeSubtask.value);
}

// ─── Submit / Cancel ─────────────────────────────────────────────────────────

function handleCancel() {
  showLeaveConfirm.value = false;
  stopTimer();
  cancelPendingSave();
  router.push('/');
}

async function handleSubmit() {
  showSubmitConfirm.value = false;
  submitError.value = null;
  stopTimer();
  isSubmitting.value = true;

  await persistAll();

  try {
    const states = [...answerStates.value.values()].filter((a) => a.answerId);
    await Promise.allSettled(states.map((a) => requestEvaluation(props.sessionId, a.answerId!)));
    const result = await submitSession(props.sessionId);
    isSubmitting.value = false;
    emit('submitted', result);
  } catch (err) {
    isSubmitting.value = false;
    submitError.value = err instanceof Error ? err.message : 'Abgabe fehlgeschlagen. Bitte versuche es erneut.';
  }
}

onMounted(() => {
  startTimer();
  if (props.scenarioName) {
    const key = `scenario_seen_${props.sessionId}`;
    if (!sessionStorage.getItem(key)) {
      showScenario.value = true;
      sessionStorage.setItem(key, '1');
    }
  }
});
</script>

<style scoped>
.exam-page { height: 100dvh; display: flex; flex-direction: column; background: #0f1117; color: #e8eaf0; font-family: 'Inter', system-ui, sans-serif; overflow: hidden; }
.progress-bar-wrap { height: 2px; background: rgba(255,255,255,0.06); flex-shrink: 0; }
.progress-bar-fill { height: 100%; background: #4f46e5; transition: width 0.4s ease; }
.exam-body { flex: 1; display: flex; overflow: hidden; }
.exam-main { flex: 1; overflow-y: auto; }
.exam-main-inner { max-width: 760px; margin: 0 auto; padding: 20px 16px 48px; }
.mobile-nav { display: none; align-items: center; gap: 10px; margin-bottom: 16px; }
.mobile-nav-btn {
  display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 7px 12px;
  font-size: 12px; font-weight: 500; color: #9ca3af; cursor: pointer;
}
.mobile-pos { font-size: 12px; color: #4b5563; }
.task-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.task-heading-left { display: flex; align-items: center; gap: 8px; }
.th-num { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #4f46e5; }
.th-sep { color: #374151; }
.th-topic { font-size: 13px; font-weight: 600; color: #9ca3af; }
.th-pts { font-size: 12px; color: #4b5563; }
.nav-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.nav-counter { font-size: 12px; color: #374151; }
.nav-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 10px; padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1.5px solid transparent; transition: all 0.15s; }
.nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.nav-back  { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); color: #9ca3af; }
.nav-back:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: #e8eaf0; }
.nav-next   { background: #4f46e5; color: white; }
.nav-next:hover { background: #4338ca; }
.nav-submit { background: #059669; color: white; }
.nav-submit:hover:not(:disabled) { background: #047857; }
.btn-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: flex-end; justify-content: center; z-index: 200; padding: 20px; }
@media (min-width: 600px) { .overlay { align-items: center; } }
.overlay-panel { background: #1a1d2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; width: 100%; max-width: 520px; max-height: 80dvh; display: flex; flex-direction: column; overflow: hidden; }
.overlay-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 14px; font-weight: 700; color: #f0f1f8; flex-shrink: 0; }
.overlay-header button { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 18px; line-height: 1; }
.overlay-header button:hover { color: #f0f1f8; }
.overlay-body { padding: 18px; overflow-y: auto; }
.overlay-company { font-size: 14px; font-weight: 700; color: #818cf8; margin-bottom: 10px; }
.overlay-text { font-size: 14px; line-height: 1.8; color: #d1d5db; }
.confirm-dialog { background: #1a1d2e; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 24px; width: 100%; max-width: 400px; }
.confirm-dialog h3 { font-size: 16px; font-weight: 700; color: #f0f1f8; margin-bottom: 10px; }
.confirm-dialog p { font-size: 13px; line-height: 1.6; color: #9ca3af; margin-bottom: 20px; }
.confirm-btns { display: flex; gap: 10px; }
.confirm-ok { flex: 1; padding: 10px; border-radius: 9px; border: none; background: #4f46e5; color: white; font-size: 13px; font-weight: 600; cursor: pointer; }
.confirm-ok:hover { background: #4338ca; }
@media (max-width: 768px) { .mobile-nav { display: flex; } }
</style>
