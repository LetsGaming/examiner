<template>
  <div class="exam-page">
    <ExamTopbar
      :exam-part="examPart"
      :scenario-name="scenarioName"
      :formatted-time="formattedTime"
      :timer-class="timerClass"
      @leave="submit.showLeaveConfirm.value = true"
      @show-scenario="showScenario = true"
      @show-belegsatz="showBelegsatz = true"
    />

    <!-- Progress bar -->
    <div class="progress-bar-wrap">
      <div
        class="progress-bar-fill"
        :style="{ width: (answeredCount / Math.max(totalSubtasks, 1)) * 100 + '%' }"
      />
    </div>

    <div class="exam-body">
      <ExamSidebar
        :tasks="tasks"
        :open="nav.navOpen.value"
        :active-task="nav.activeTask.value"
        :active-subtask="nav.activeSubtask.value"
        :is-answered="isAnswered"
        :is-flagged="flagging.isFlagged"
        @close="nav.navOpen.value = false"
        @navigate="nav.goto"
      />

      <main class="exam-main">
        <div class="exam-main-inner">
          <!-- Mobile nav toggle -->
          <div class="mobile-nav">
            <button class="mobile-nav-btn" @click="nav.navOpen.value = true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
              Aufgaben
            </button>
            <span class="mobile-pos">{{ nav.flatIndex.value + 1 }} / {{ flatSubtasks.length }}</span>
          </div>

          <!-- Task heading -->
          <div class="task-heading" v-if="nav.currentTask.value">
            <div class="task-heading-left">
              <span class="th-num">Aufgabe {{ nav.activeTask.value + 1 }}</span>
              <span class="th-sep">/</span>
              <span class="th-topic">{{ nav.currentTask.value.topicArea }}</span>
            </div>
            <div class="th-actions">
              <button
                class="flag-btn"
                :class="{
                  'flag-btn--active': flagging.isFlagged(nav.activeTask.value, nav.activeSubtask.value),
                }"
                @click="flagging.toggle"
                title="Zur Durchsicht markieren (Ctrl+M)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                {{
                  flagging.isFlagged(nav.activeTask.value, nav.activeSubtask.value)
                    ? 'Markiert'
                    : 'Markieren'
                }}
              </button>
              <span class="th-pts">{{ nav.currentTask.value.maxPoints }} Punkte</span>
            </div>
          </div>

          <!-- Subtask card -->
          <SubtaskCard
            v-if="nav.currentSubtask.value && currentAnswerState"
            :subtask="nav.currentSubtask.value"
            :state="currentAnswerState"
            :table-rows="table.rows.value"
            :table-config="nav.currentSubtask.value.tableConfig ?? null"
            @text-input="onTextInput"
            @mc-select="onMcSelect"
            @file-selected="onFileSelected"
            @table-cell-input="table.onCellInput"
            @add-table-row="table.addRow"
          />

          <!-- Navigation row -->
          <div class="nav-row">
            <button class="nav-btn nav-back" @click="nav.prev" :disabled="nav.isFirst.value">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
              Zurück
            </button>
            <span class="nav-counter">{{ nav.flatIndex.value + 1 }} / {{ flatSubtasks.length }}</span>
            <button v-if="!nav.isLast.value" class="nav-btn nav-next" @click="nav.next">
              Weiter
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button
              v-else
              class="nav-btn nav-submit"
              @click="submit.showSubmitConfirm.value = true"
              :disabled="submit.isSubmitting.value"
            >
              <span v-if="submit.isSubmitting.value" class="btn-spinner" />
              <svg
                v-else
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              ><path d="M20 6 9 17l-5-5"/></svg>
              {{ submit.isSubmitting.value ? 'Wird bewertet…' : 'Abgeben' }}
            </button>
          </div>
        </div>
      </main>
    </div>

    <!-- Overlays -->
    <Teleport to="body">
      <ScenarioOverlay
        v-model="showScenario"
        :name="scenarioName"
        :description="scenarioDescription"
      />

      <BelegsatzPanel v-model="showBelegsatz" :exam-part="examPart" />

      <SubmitErrorDialog
        :message="submit.submitError.value"
        @dismiss="submit.submitError.value = null"
      />

      <ConfirmDialog
        v-model="submit.showSubmitConfirm.value"
        title="Prüfung abgeben?"
        confirm-label="Jetzt abgeben"
        cancel-label="Weiterarbeiten"
        @confirm="submit.submit"
      >
        {{ answeredCount }} von {{ totalSubtasks }} Unteraufgaben beantwortet.<br />
        <span v-if="flagging.flagged.value.size > 0" style="color:var(--warning-text)">
          ⚑ {{ flagging.flagged.value.size }} Aufgabe(n) noch als „zur Durchsicht" markiert.<br />
        </span>
        Beantwortete Aufgaben werden von der KI bewertet.
      </ConfirmDialog>

      <ConfirmDialog
        v-model="submit.showLeaveConfirm.value"
        title="Prüfung abbrechen?"
        confirm-label="Abbrechen &amp; verlassen"
        cancel-label="Weitermachen"
        :danger="true"
        @confirm="submit.cancel"
      >
        Deine bisherigen Antworten gehen verloren und die Prüfung wird
        <strong>nicht</strong> bewertet.
      </ConfirmDialog>

      <ShortcutsOverlay v-model="shortcutOverlay" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
/**
 * ExamView — Orchestrator für die laufende Prüfung.
 *
 * Diese Komponente ist reiner "Glue-Layer": sie instanziiert die Prüfungs-
 * Composables (useAnswerState, useExamTimer, useExamNavigation,
 * useExamFlagging, useTableAnswer, useExamSubmit, useKeyboardShortcuts) und
 * verbindet sie mit den Sub-Komponenten (ExamTopbar, ExamSidebar, SubtaskCard,
 * Overlays).
 *
 * Keine Business-Logik lebt hier — alles wohnt in den Composables und
 * präsentativen Komponenten.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAnswerState } from '../../composables/useAnswerState.js';
import { useExamTimer } from '../../composables/useExamTimer.js';
import { useKeyboardShortcuts } from '../../composables/useKeyboardShortcuts.js';
import { useExamNavigation } from '../../composables/exam/useExamNavigation.js';
import { useExamFlagging } from '../../composables/exam/useExamFlagging.js';
import { useTableAnswer } from '../../composables/exam/useTableAnswer.js';
import { useExamSubmit } from '../../composables/exam/useExamSubmit.js';

import ExamTopbar from './ExamTopbar.vue';
import ExamSidebar from './ExamSidebar.vue';
import SubtaskCard from './SubtaskCard.vue';
import ConfirmDialog from '../ui/ConfirmDialog.vue';
import BelegsatzPanel from '../BelegsatzPanel.vue';
import ScenarioOverlay from './ScenarioOverlay.vue';
import ShortcutsOverlay from './ShortcutsOverlay.vue';
import SubmitErrorDialog from './SubmitErrorDialog.vue';
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
  submitted: [
    result: {
      totalScore: number;
      maxPoints: number;
      percentageScore: number;
      ihkGrade: string;
    },
  ];
}>();

const router = useRouter();

// ── Composables ─────────────────────────────────────────────────────────────
const {
  flatSubtasks,
  answerStates,
  answeredCount,
  isAnswered,
  getState,
  debouncedSave,
  cancelPendingSave,
  persistAll,
} = useAnswerState(props.sessionId, props.tasks);

const nav = useExamNavigation({ tasks: props.tasks, flatSubtasks });

const currentAnswerState = computed(() =>
  nav.currentSubtask.value ? (getState(nav.currentSubtask.value.id) ?? null) : null,
);
const totalSubtasks = computed(() => flatSubtasks.value.length);

const flagging = useExamFlagging({
  sessionId: props.sessionId,
  tasks: props.tasks,
  currentSubtask: nav.currentSubtask,
});

const table = useTableAnswer({
  currentSubtask: nav.currentSubtask,
  currentAnswerState,
  activeTask: nav.activeTask,
  activeSubtask: nav.activeSubtask,
  debouncedSave,
});

const { formattedTime, timerClass, startTimer, stopTimer } = useExamTimer(
  props.examPart,
  () => submit.submit(),
);

const submit = useExamSubmit({
  sessionId: props.sessionId,
  answerStates,
  persistAll,
  cancelPendingSave,
  stopTimer,
  onSubmitted: (result) => emit('submitted', result),
  onCancel: () => router.push('/'),
});

// ── Shortcuts ───────────────────────────────────────────────────────────────
const { overlayVisible: shortcutOverlay } = useKeyboardShortcuts([
  { key: 'ArrowRight', description: 'Nächste Teilaufgabe', action: nav.next },
  { key: 'ArrowLeft', description: 'Vorherige Teilaufgabe', action: nav.prev },
  {
    key: 'Escape',
    description: 'Sidebar schließen',
    action: () => {
      nav.navOpen.value = false;
    },
  },
  { key: 'm', ctrl: true, description: 'Markieren / Entmarkieren', action: flagging.toggle },
  {
    key: 's',
    ctrl: true,
    description: 'Antwort speichern',
    action: () => {
      /* Autosave ist bereits aktiv — nur als dokumentierter Shortcut */
    },
  },
]);

// ── UI-Overlays ─────────────────────────────────────────────────────────────
const showScenario = ref(false);
const showBelegsatz = ref(false);

// ── Input-Handler ───────────────────────────────────────────────────────────
function onTextInput(value: string): void {
  const a = currentAnswerState.value;
  if (a) a.textValue = value;
  debouncedSave(nav.activeTask.value, nav.activeSubtask.value);
}

function onMcSelect(id: string | null): void {
  const a = currentAnswerState.value;
  if (a) a.selectedMcOption = id;
  debouncedSave(nav.activeTask.value, nav.activeSubtask.value);
}

function onFileSelected(file: File): void {
  const a = currentAnswerState.value;
  if (a) a.uploadedFile = file;
  debouncedSave(nav.activeTask.value, nav.activeSubtask.value);
}

// ── Init ────────────────────────────────────────────────────────────────────
onMounted(() => {
  startTimer();
  // Szenario einmalig pro Session zeigen — gespeichert im sessionStorage,
  // damit Reload das Overlay nicht erneut triggert.
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
.exam-page { height: 100dvh; display: flex; flex-direction: column; background: var(--bg-base); color: var(--text-secondary); font-family: var(--font-sans); overflow: hidden; }
.progress-bar-wrap { height: 2px; background: var(--border-light); flex-shrink: 0; }
.progress-bar-fill { height: 100%; background: var(--brand); transition: width 0.4s ease; }
.exam-body { flex: 1; display: flex; overflow: hidden; }
.exam-main { flex: 1; overflow-y: auto; }
.exam-main-inner { max-width: 760px; margin: 0 auto; padding: 20px 16px 48px; }
.mobile-nav { display: none; align-items: center; gap: 10px; margin-bottom: 16px; }
.mobile-nav-btn {
  display: flex; align-items: center; gap: 6px; background: var(--control-bg);
  border: 1px solid var(--control-border); border-radius: var(--radius-sm); padding: 7px 12px;
  font-size: 12px; font-weight: 500; color: var(--text-muted); cursor: pointer;
}
.mobile-pos { font-size: 12px; color: var(--text-faint); }
.task-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.task-heading-left { display: flex; align-items: center; gap: 8px; }
.th-num { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--brand); }
.th-sep { color: var(--text-ghost); }
.th-topic { font-size: 13px; font-weight: 600; color: var(--text-muted); }
.th-pts { font-size: 12px; color: var(--text-faint); }
.nav-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.nav-counter { font-size: 12px; color: var(--text-ghost); }
.nav-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: var(--radius-md); padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1.5px solid transparent; transition: all var(--transition); }
.nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.nav-back { background: var(--control-bg); border-color: var(--control-border); color: var(--text-muted); }
.nav-back:hover:not(:disabled) { background: var(--control-bg-hover); color: var(--text-primary); }
.nav-next { background: var(--brand); color: white; }
.nav-next:hover { background: var(--brand-dark); }
.nav-submit { background: #059669; color: white; }
.nav-submit:hover:not(:disabled) { background: #047857; }
.btn-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.th-actions { display: flex; align-items: center; gap: 10px; }
.flag-btn { display: flex; align-items: center; gap: 5px; padding: 5px 10px; background: var(--control-bg); border: 1px solid var(--control-border); border-radius: 7px; cursor: pointer; font-size: 12px; color: var(--text-subtle); transition: all var(--transition); }
.flag-btn:hover { border-color: var(--warning-border); color: var(--warning); }
.flag-btn--active { background: var(--warning-bg); border-color: var(--warning-border); color: var(--warning-text); }
@media (max-width: 768px) { .mobile-nav { display: flex; } }
</style>
