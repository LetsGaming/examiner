<template>
  <div class="exam-page">
    <!-- ═══ TOP BAR ════════════════════════════════════════════ -->
    <div class="topbar">
      <div class="topbar-left">
        <button
          class="topbar-btn"
          @click="confirmLeave"
          title="Prüfung beenden"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <span class="topbar-part">{{ PART_LABELS[examPart] }}</span>
      </div>
      <div class="topbar-center">
        <span
          v-if="props.scenarioName"
          class="topbar-scenario"
          @click="showScenario = true"
          title="Ausgangssituation lesen"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          {{ props.scenarioName }}
        </span>
      </div>
      <div class="topbar-right">
        <button
          v-if="props.examPart !== 'teil_3'"
          class="topbar-btn topbar-btn-ref"
          @click="showBelegsatz = true"
          title="Belegsatz öffnen"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            />
            <polyline points="14,2 14,8 20,8" />
          </svg>
          Belegsatz
        </button>
        <div class="timer" :class="timerClass">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {{ formattedTime }}
        </div>
      </div>
    </div>

    <!-- ═══ PROGRESS ═══════════════════════════════════════════ -->
    <div class="progress-bar-wrap">
      <div
        class="progress-bar-fill"
        :style="{
          width: (answeredCount / Math.max(totalSubtasks, 1)) * 100 + '%',
        }"
      />
    </div>

    <!-- ═══ BODY ═══════════════════════════════════════════════ -->
    <div class="exam-body">
      <!-- ─── Sidebar ─────────────────────────────────────── -->
      <aside class="sidebar" :class="{ open: navOpen }">
        <div class="sidebar-top">
          <span class="sidebar-heading">Aufgaben</span>
          <button class="sidebar-close" @click="navOpen = false">✕</button>
        </div>

        <div
          v-for="(task, ti) in tasks"
          :key="task.id"
          class="sidebar-task-group"
        >
          <div class="sidebar-task-title">
            <span class="stt-num">{{ ti + 1 }}</span>
            <span class="stt-name">{{ task.topicArea }}</span>
            <span class="stt-pts">{{ task.maxPoints }}P</span>
          </div>
          <button
            v-for="(st, si) in task.subtasks"
            :key="st.id"
            class="sidebar-sub"
            :class="{
              'sub-active': activeTask === ti && activeSubtask === si,
              'sub-answered': isAnswered(ti, si),
            }"
            @click="goToTask(ti, si)"
          >
            <span class="sub-label">{{ st.label }})</span>
            <span class="sub-type">{{ typeShort(st.taskType) }}</span>
            <span class="sub-pts">{{ st.points }}P</span>
          </button>
        </div>
      </aside>
      <div v-if="navOpen" class="sidebar-backdrop" @click="navOpen = false" />

      <!-- ─── Main ─────────────────────────────────────────── -->
      <main class="exam-main">
        <div class="exam-main-inner">
          <!-- Mobile nav -->
          <div class="mobile-nav">
            <button class="mobile-nav-btn" @click="navOpen = true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
              Aufgaben
            </button>
            <span class="mobile-pos"
              >{{ flatIndex + 1 }} / {{ flatSubtasks.length }}</span
            >
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
          <div class="subtask-card" v-if="currentSubtask">
            <div class="sc-header">
              <div class="sc-badge">{{ currentSubtask.label }})</div>
              <span
                class="sc-type-chip"
                :class="`chip-${currentSubtask.taskType}`"
                >{{ typeLabel(currentSubtask.taskType) }}</span
              >
              <span class="sc-pts">{{ currentSubtask.points }} Punkte</span>
            </div>

            <div class="sc-question">{{ currentSubtask.questionText }}</div>

            <div class="sc-body">
              <!-- MC -->
              <div v-if="currentSubtask.taskType === 'mc'" class="mc-options">
                <!-- Optionen vorhanden → normale Auswahl -->
                <template
                  v-if="
                    currentSubtask.mcOptions &&
                    currentSubtask.mcOptions.length > 0
                  "
                >
                  <label
                    v-for="opt in currentSubtask.mcOptions"
                    :key="opt.id"
                    class="mc-opt"
                    :class="{
                      selected: currentAnswerState?.selectedMcOption === opt.id,
                    }"
                  >
                    <input
                      type="radio"
                      :name="`mc-${currentSubtask.id}`"
                      :value="opt.id"
                      :checked="currentAnswerState?.selectedMcOption === opt.id"
                      @change="selectMcOption(opt.id)"
                    />
                    <span class="mc-opt-key">{{ opt.id }})</span>
                    <span class="mc-opt-text">{{ opt.text }}</span>
                  </label>
                </template>
                <!-- Keine Optionen vorhanden → Hinweis (Fehler in der Aufgabengenerierung) -->
                <div v-else class="mc-no-options">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4m0 4h.01" />
                  </svg>
                  Keine Antwortmöglichkeiten verfügbar — überspringe diese
                  Aufgabe.
                </div>
              </div>

              <!-- PlantUML — unterstützt Code-Eingabe UND Bild-Upload -->
              <div
                v-else-if="currentSubtask.taskType === 'plantuml'"
                class="plantuml-wrap"
              >
                <!-- Tab-Auswahl -->
                <div class="uml-tabs">
                  <button
                    class="uml-tab"
                    :class="{ active: umlInputMode === 'code' }"
                    @click="umlInputMode = 'code'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    PlantUML Code
                  </button>
                  <button
                    class="uml-tab"
                    :class="{ active: umlInputMode === 'upload' }"
                    @click="umlInputMode = 'upload'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Bild hochladen
                  </button>
                </div>

                <!-- Code-Modus -->
                <div v-if="umlInputMode === 'code'" class="uml-code-panes">
                  <div class="pane">
                    <div class="pane-label">PlantUML Code</div>
                    <textarea
                      v-model="currentAnswerState!.textValue"
                      class="code-input"
                      :placeholder="plantumlPlaceholder"
                      @input="onPlantUMLInput"
                      spellcheck="false"
                    />
                  </div>
                  <div class="pane">
                    <div class="pane-label">Vorschau</div>
                    <div class="plantuml-preview">
                      <img
                        v-if="plantUmlPreviewUrl"
                        :src="plantUmlPreviewUrl"
                        @error="onPreviewError"
                        alt="PlantUML Vorschau"
                      />
                      <div v-else class="preview-empty">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.5"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span>Vorschau erscheint beim Tippen</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Upload-Modus -->
                <div v-else class="upload-area">
                  <div class="upload-info">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                    Zeichne dein UML-Diagramm auf Papier, fotografiere es und
                    lade es hier hoch.
                  </div>
                  <div
                    class="upload-zone"
                    :class="{ 'has-file': !!currentAnswerState?.uploadedFile }"
                    @dragover.prevent
                    @drop.prevent="onFileDrop"
                  >
                    <template v-if="uploadPreviewUrl">
                      <img :src="uploadPreviewUrl" class="upload-preview-img" />
                      <button
                        class="upload-replace"
                        @click="fileInputRef?.click()"
                      >
                        Bild ersetzen
                      </button>
                    </template>
                    <template v-else>
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        class="upload-icon"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <p class="upload-title">UML-Diagramm hochladen</p>
                      <p class="upload-hint-text">
                        PNG oder JPG · Drag &amp; Drop oder
                      </p>
                      <button class="upload-btn" @click="fileInputRef?.click()">
                        Datei auswählen
                      </button>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Upload -->
              <div
                v-else-if="currentSubtask.taskType === 'diagram_upload'"
                class="upload-area"
              >
                <div class="upload-info">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  Zeichne dein Diagramm auf Papier, fotografiere es und lade es
                  hier hoch.
                </div>
                <div
                  class="upload-zone"
                  :class="{ 'has-file': !!currentAnswerState?.uploadedFile }"
                  @dragover.prevent
                  @drop.prevent="onFileDrop"
                >
                  <template v-if="uploadPreviewUrl">
                    <img :src="uploadPreviewUrl" class="upload-preview-img" />
                    <button
                      class="upload-replace"
                      @click="fileInputRef?.click()"
                    >
                      Bild ersetzen
                    </button>
                  </template>
                  <template v-else>
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      class="upload-icon"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p class="upload-title">Diagramm-Bild hochladen</p>
                    <p class="upload-hint-text">
                      PNG oder JPG · Drag &amp; Drop oder
                    </p>
                    <button class="upload-btn" @click="fileInputRef?.click()">
                      Datei auswählen
                    </button>
                  </template>
                </div>
              </div>

              <!-- Tabelle -->
              <div
                v-else-if="currentSubtask.taskType === 'table'"
                class="table-editor-wrap"
              >
                <div v-if="!currentTableRows.length" class="table-empty-hint">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M3 15h18M9 3v18" />
                  </svg>
                  Tabellenkonfiguration wird geladen…
                </div>
                <div v-else class="table-editor">
                  <table class="answer-table">
                    <thead>
                      <tr>
                        <th
                          v-for="col in currentSubtask.tableConfig?.columns"
                          :key="col"
                          class="table-th"
                        >
                          {{ col }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(row, ri) in currentTableRows"
                        :key="ri"
                        class="table-row"
                      >
                        <td
                          v-for="(cell, ci) in row"
                          :key="ci"
                          class="table-td"
                          :class="{
                            'td-fixed':
                              currentSubtask.tableConfig?.fixedFirstColumn &&
                              ci === 0,
                          }"
                        >
                          <span
                            v-if="
                              currentSubtask.tableConfig?.fixedFirstColumn &&
                              ci === 0
                            "
                            class="td-fixed-text"
                            >{{ cell }}</span
                          >
                          <textarea
                            v-else
                            :value="cell"
                            class="td-input"
                            rows="2"
                            :placeholder="
                              currentSubtask.tableConfig?.columns?.[ci] ?? ''
                            "
                            @input="
                              onTableCellInput(
                                ri,
                                ci,
                                ($event.target as HTMLTextAreaElement).value,
                              )
                            "
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <button
                    class="table-add-row"
                    @click="addTableRow"
                    v-if="currentTableRows.length < 10"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Zeile hinzufügen
                  </button>
                </div>
              </div>

              <!-- Pseudocode -->
              <textarea
                v-else-if="currentSubtask.taskType === 'pseudocode'"
                v-model="currentAnswerState!.textValue"
                class="code-input code-input-full"
                :placeholder="pseudocodePlaceholder"
                @input="onTextInput"
                spellcheck="false"
              />

              <!-- Freitext -->
              <textarea
                v-else
                v-model="currentAnswerState!.textValue"
                class="text-input"
                placeholder="Antwort eingeben…"
                @input="onTextInput"
              />
            </div>

            <div class="sc-footer">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              KI-Bewertung nach der Abgabe
            </div>
          </div>

          <!-- Navigation -->
          <div class="nav-row">
            <button
              class="nav-btn nav-back"
              @click="prevSubtask"
              :disabled="isFirst"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Zurück
            </button>
            <span class="nav-counter"
              >{{ flatIndex + 1 }} / {{ flatSubtasks.length }}</span
            >
            <button
              v-if="!isLast"
              class="nav-btn nav-next"
              @click="nextSubtask"
            >
              Weiter
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
            <button
              v-else
              class="nav-btn nav-submit"
              @click="confirmSubmit"
              :disabled="isSubmitting"
            >
              <span v-if="isSubmitting" class="btn-spinner" />
              <svg
                v-else
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {{ isSubmitting ? "Wird bewertet…" : "Abgeben" }}
            </button>
          </div>
        </div>
      </main>
    </div>

    <!-- ═══ OVERLAYS ═══════════════════════════════════════════ -->

    <!-- Ausgangssituation -->
    <Teleport to="body">
      <div
        v-if="showScenario"
        class="overlay"
        @click.self="showScenario = false"
      >
        <div class="overlay-panel">
          <div class="overlay-header">
            <span>Ausgangssituation</span>
            <button @click="showScenario = false">✕</button>
          </div>
          <div class="overlay-body">
            <h3 class="overlay-company">{{ props.scenarioName }}</h3>
            <p class="overlay-text" v-if="props.scenarioDescription">
              {{ props.scenarioDescription }}
            </p>
            <p class="overlay-text" v-else>
              Alle Aufgaben beziehen sich auf:
              <strong>{{ props.scenarioName }}</strong>
            </p>
          </div>
        </div>
      </div>

      <!-- Belegsatz — extrahiert in BelegsatzPanel.vue -->
      <BelegsatzPanel v-model="showBelegsatz" :exam-part="props.examPart" />

      <!-- Dummy div to anchor the next template block (kept for diff clarity) -->

      <!-- Alerts -->
      <!-- F-011: Submit-Fehler sichtbar für den User -->
      <div v-if="submitError" class="overlay" @click.self="submitError = null">
        <div class="confirm-dialog">
          <h3>Fehler bei der Abgabe</h3>
          <p>{{ submitError }}</p>
          <div class="confirm-btns">
            <button class="confirm-ok" @click="submitError = null">
              Schließen
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showSubmitConfirm"
        class="overlay"
        @click.self="showSubmitConfirm = false"
      >
        <div class="confirm-dialog">
          <h3>Prüfung abgeben?</h3>
          <p>
            {{ answeredCount }} von {{ totalSubtasks }} Unteraufgaben
            beantwortet.<br />Beantwortete Aufgaben werden von der KI bewertet.
          </p>
          <div class="confirm-btns">
            <button class="confirm-cancel" @click="showSubmitConfirm = false">
              Weiterarbeiten
            </button>
            <button class="confirm-ok" @click="handleSubmit">
              Jetzt abgeben
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showLeaveConfirm"
        class="overlay"
        @click.self="showLeaveConfirm = false"
      >
        <div class="confirm-dialog">
          <h3>Prüfung abbrechen?</h3>
          <p>
            Deine bisherigen Antworten gehen verloren und die Prüfung wird
            <strong>nicht</strong> bewertet.
          </p>
          <div class="confirm-btns">
            <button class="confirm-cancel" @click="showLeaveConfirm = false">
              Weitermachen
            </button>
            <button class="confirm-ok confirm-ok-danger" @click="handleCancel">
              Abbrechen &amp; verlassen
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- File Input außerhalb Shadow DOM -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      style="display: none"
      @change="onFileSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { requestEvaluation, submitSession } from "../composables/useApi.js";
import { useExamTimer } from "../composables/useExamTimer.js";
import { useAnswerState } from "../composables/useAnswerState.js";
import BelegsatzPanel from "./BelegsatzPanel.vue";
import type { Task, ExamPart } from "../types/index.js";

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

// ─── Composables ──────────────────────────────────────────────────────────────

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

const { formattedTime, timerClass, startTimer, stopTimer } = useExamTimer(
  props.examPart,
  () => handleSubmit(),
);

// ─── Navigation state ─────────────────────────────────────────────────────────

const activeTask = ref(0);
const activeSubtask = ref(0);
const navOpen = ref(false);

const flatIndex = computed(() =>
  flatSubtasks.value.findIndex(
    (f) => f.ti === activeTask.value && f.si === activeSubtask.value,
  ),
);
const isFirst = computed(() => flatIndex.value === 0);
const isLast = computed(
  () => flatIndex.value === flatSubtasks.value.length - 1,
);
const currentTask = computed(() => props.tasks[activeTask.value]);
const currentSubtask = computed(
  () => currentTask.value?.subtasks[activeSubtask.value],
);
const currentAnswerState = computed(() =>
  currentSubtask.value ? (getState(currentSubtask.value.id) ?? null) : null,
);
const totalSubtasks = computed(() => flatSubtasks.value.length);

// ─── UI overlays ─────────────────────────────────────────────────────────────

const isSubmitting = ref(false);
const submitError = ref<string | null>(null);
const showScenario = ref(false);
const showBelegsatz = ref(false);
const showSubmitConfirm = ref(false);
const showLeaveConfirm = ref(false);

// ─── File & PlantUML preview ─────────────────────────────────────────────────

const plantUmlPreviewUrl = ref<string | null>(null);
const uploadPreviewUrl = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const umlInputMode = ref<"code" | "upload">("code");

// ─── PlantUML Encoding ────────────────────────────────────────────────────────
// PlantUML nutzt ein eigenes Encoding: deflate (raw) → custom Base64
// Wir nutzen die ~1 (hex-Deflate) Methode als einfachen Fallback,
// oder die korrekte deflate-Methode via DecompressionStream polyfill.

function encode64(data: Uint8Array): string {
  const chars =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
  let result = "";
  for (let i = 0; i < data.length; i += 3) {
    const b0 = data[i],
      b1 = data[i + 1] ?? 0,
      b2 = data[i + 2] ?? 0;
    result += chars[(b0 >> 2) & 0x3f];
    result += chars[((b0 & 0x03) << 4) | ((b1 >> 4) & 0x0f)];
    result += chars[((b1 & 0x0f) << 2) | ((b2 >> 6) & 0x03)];
    result += chars[b2 & 0x3f];
  }
  return result;
}

async function encodePlantUml(code: string): Promise<string | null> {
  try {
    const utf8 = new TextEncoder().encode(code);
    // Compress with DeflateRaw
    const ds = new (
      window as unknown as {
        CompressionStream: new (f: string) => TransformStream;
      }
    ).CompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    writer.write(utf8);
    writer.close();
    const chunks: Uint8Array[] = [];
    const reader = ds.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const compressed = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      compressed.set(c, offset);
      offset += c.length;
    }
    return encode64(compressed);
  } catch {
    return null;
  }
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const PART_LABELS: Record<ExamPart, string> = {
  teil_1: "Teil 1 — Planen",
  teil_2: "Teil 2 — Entwicklung",
  teil_3: "Teil 3 — WiSo",
};
function typeLabel(t: string) {
  return (
    {
      freitext: "Freitext",
      pseudocode: "Pseudocode",
      mc: "Multiple Choice",
      plantuml: "PlantUML",
      diagram_upload: "Diagramm-Upload",
      table: "Tabelle",
    }[t] ?? t
  );
}
function typeShort(t: string) {
  return (
    {
      freitext: "Text",
      pseudocode: "Code",
      mc: "MC",
      plantuml: "UML",
      diagram_upload: "Upload",
      table: "Tabelle",
    }[t] ?? t
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function goToTask(ti: number, si: number) {
  activeTask.value = ti;
  activeSubtask.value = si;
  navOpen.value = false;
  plantUmlPreviewUrl.value = null;
  uploadPreviewUrl.value = null;
  umlInputMode.value = "code";
  restorePreview();
}
function nextSubtask() {
  const n = flatSubtasks.value[flatIndex.value + 1];
  if (n) goToTask(n.ti, n.si);
}
function prevSubtask() {
  const p = flatSubtasks.value[flatIndex.value - 1];
  if (p) goToTask(p.ti, p.si);
}

// ─── Input ────────────────────────────────────────────────────────────────────

function selectMcOption(id: string) {
  const a = currentAnswerState.value;
  if (!a) return;
  a.selectedMcOption = id;
  debouncedSave(activeTask.value, activeSubtask.value);
}

// F-014: PlantUML korrekt encodieren (deflate-raw + custom base64)
function onPlantUMLInput() {
  debouncedSave(activeTask.value, activeSubtask.value);
  const code = currentAnswerState.value?.textValue ?? "";
  if (code.trim()) {
    encodePlantUml(code).then((encoded) => {
      if (encoded) {
        plantUmlPreviewUrl.value = `https://www.plantuml.com/plantuml/svg/~1${encoded}`;
      } else {
        plantUmlPreviewUrl.value = null;
      }
    });
  } else {
    plantUmlPreviewUrl.value = null;
  }
}

function onPreviewError() {
  plantUmlPreviewUrl.value = null;
}

function onTextInput() {
  debouncedSave(activeTask.value, activeSubtask.value);
}

function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) setFile(file);
  if (fileInputRef.value) fileInputRef.value.value = "";
}
function onFileDrop(e: DragEvent) {
  const f = e.dataTransfer?.files[0];
  if (f) setFile(f);
}
function setFile(file: File) {
  const a = currentAnswerState.value;
  if (!a) return;
  a.uploadedFile = file;
  uploadPreviewUrl.value = URL.createObjectURL(file);
  debouncedSave(activeTask.value, activeSubtask.value);
}
function restorePreview() {
  const st = currentSubtask.value,
    a = currentAnswerState.value;
  if (!st || !a) return;
  if (st.taskType === "plantuml" && a.textValue) onPlantUMLInput();
  if (st.taskType === "diagram_upload" && a.uploadedFile)
    uploadPreviewUrl.value = URL.createObjectURL(a.uploadedFile);
}

// ─── Submit / Cancel ─────────────────────────────────────────────────────────

function confirmSubmit() {
  showSubmitConfirm.value = true;
}
function confirmLeave() {
  showLeaveConfirm.value = true;
}

function handleCancel() {
  showLeaveConfirm.value = false;
  stopTimer();
  cancelPendingSave();
  router.push("/");
}

async function handleSubmit() {
  showSubmitConfirm.value = false;
  showLeaveConfirm.value = false;
  submitError.value = null;
  stopTimer();
  isSubmitting.value = true;

  // Alle Antworten zuerst persistieren
  await persistAll();

  try {
    // FIX: Erst alle Evaluierungen abwarten, DANN submitten
    // Sonst hat der Server noch keine Punkte und gibt 0 zurück
    const states = [...answerStates.value.values()].filter((a) => a.answerId);
    await Promise.allSettled(
      states.map((a) => requestEvaluation(props.sessionId, a.answerId!)),
    );

    // Jetzt erst submiten — alle awarded_points sind in der DB
    const result = await submitSession(props.sessionId);
    isSubmitting.value = false;
    emit("submitted", result);
  } catch (err) {
    console.error("[submit]", err);
    isSubmitting.value = false;
    submitError.value =
      err instanceof Error
        ? err.message
        : "Abgabe fehlgeschlagen. Bitte versuche es erneut.";
  }
}

// ─── Tabellen-Logik ──────────────────────────────────────────────────────────

// currentTableRows: live-synced mit answerState.tableRows
const currentTableRows = computed({
  get() {
    const st = currentSubtask.value;
    const a = currentAnswerState.value;
    if (!st || st.taskType !== "table" || !a) return [];

    // Wenn noch keine Zeilen im State, aus tableConfig initialisieren
    if (!a.tableRows || a.tableRows.length === 0) {
      const cfg = st.tableConfig;
      if (cfg && cfg.rows && cfg.rows.length > 0) {
        // Deep-copy der Vorlage
        a.tableRows = cfg.rows.map((row) => [...row]);
      } else if (cfg) {
        // Leere Zeilen erzeugen
        a.tableRows = Array.from({ length: cfg.rowCount ?? 3 }, () =>
          Array(cfg.columns.length).fill(""),
        );
      }
    }
    return a.tableRows ?? [];
  },
  set(val: string[][]) {
    const a = currentAnswerState.value;
    if (a) a.tableRows = val;
  },
});

function onTableCellInput(rowIndex: number, colIndex: number, value: string) {
  const a = currentAnswerState.value;
  if (!a || !a.tableRows) return;
  // Immutable update für Vue Reaktivität
  const newRows = a.tableRows.map((row, ri) =>
    ri === rowIndex
      ? row.map((cell, ci) => (ci === colIndex ? value : cell))
      : [...row],
  );
  a.tableRows = newRows;
  debouncedSave(activeTask.value, activeSubtask.value);
}

function addTableRow() {
  const st = currentSubtask.value;
  const a = currentAnswerState.value;
  if (!st || !a || !st.tableConfig) return;
  const emptyRow = Array(st.tableConfig.columns.length).fill("");
  a.tableRows = [...(a.tableRows ?? []), emptyRow];
  debouncedSave(activeTask.value, activeSubtask.value);
}

// ─── Placeholders ─────────────────────────────────────────────────────────────

const plantumlPlaceholder = `@startuml\n\n' Diagramm hier eingeben\n\n@enduml`;
const pseudocodePlaceholder = `BEGIN\n\n  ' Pseudocode hier eingeben\n\nEND`;

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => {
  startTimer();
  if (props.scenarioName) showScenario.value = true;
});
</script>

<style scoped>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
.exam-page {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #0f1117;
  color: #e8eaf0;
  font-family: "Inter", system-ui, sans-serif;
  overflow: hidden;
}

/* ─── Topbar ─── */
.topbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 12px;
  height: 48px;
  flex-shrink: 0;
  background: #131620;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  gap: 8px;
}
.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.topbar-right {
  justify-content: flex-end;
}
.topbar-center {
  display: flex;
  justify-content: center;
}

.topbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.topbar-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e8eaf0;
}

.topbar-btn-ref {
  display: flex;
  align-items: center;
  gap: 6px;
  width: auto;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
}

.topbar-part {
  font-size: 13px;
  font-weight: 600;
  color: #9ca3af;
}

.topbar-scenario {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #818cf8;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(79, 70, 229, 0.12);
  border: 1px solid rgba(79, 70, 229, 0.25);
  transition: all 0.15s;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.topbar-scenario:hover {
  background: rgba(79, 70, 229, 0.2);
}

.timer {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 700;
  font-family: "SF Mono", monospace;
  color: #d1d5db;
  padding: 5px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
}
.timer-warning {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}
.timer-critical {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
  animation: blink 1s ease-in-out infinite;
}
@keyframes blink {
  50% {
    opacity: 0.5;
  }
}

/* ─── Progress ─── */
.progress-bar-wrap {
  height: 2px;
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}
.progress-bar-fill {
  height: 100%;
  background: #4f46e5;
  transition: width 0.4s ease;
}

/* ─── Body ─── */
.exam-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ─── Sidebar ─── */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  overflow-y: auto;
  background: #131620;
  border-right: 1px solid rgba(255, 255, 255, 0.07);
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sidebar-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px 10px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: #4b5563;
}
.sidebar-close {
  background: none;
  border: none;
  color: #4b5563;
  cursor: pointer;
  font-size: 14px;
  display: none;
}

.sidebar-task-group {
  margin-bottom: 4px;
}
.sidebar-task-title {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px;
  border-radius: 7px;
}
.stt-num {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stt-name {
  flex: 1;
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stt-pts {
  font-size: 10px;
  color: #4b5563;
}

.sidebar-sub {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 5px 8px 5px 14px;
  border-radius: 6px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}
.sidebar-sub:hover {
  background: rgba(255, 255, 255, 0.04);
}
.sidebar-sub.sub-active {
  background: rgba(79, 70, 229, 0.18);
}
.sidebar-sub.sub-answered .sub-label {
  color: #22c55e;
}
.sub-label {
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  min-width: 16px;
}
.sidebar-sub.sub-active .sub-label {
  color: #818cf8;
}
.sub-type {
  flex: 1;
  font-size: 11px;
  color: #4b5563;
}
.sub-pts {
  font-size: 10px;
  color: #374151;
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 49;
  display: none;
}

/* ─── Main ─── */
.exam-main {
  flex: 1;
  overflow-y: auto;
}
.exam-main-inner {
  max-width: 760px;
  margin: 0 auto;
  padding: 20px 16px 48px;
}

.mobile-nav {
  display: none;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.mobile-nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
  cursor: pointer;
}
.mobile-pos {
  font-size: 12px;
  color: #4b5563;
}

/* ─── Task heading ─── */
.task-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.task-heading-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.th-num {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #4f46e5;
}
.th-sep {
  color: #374151;
}
.th-topic {
  font-size: 13px;
  font-weight: 600;
  color: #9ca3af;
}
.th-pts {
  font-size: 12px;
  color: #4b5563;
}

/* ─── Subtask card ─── */
.subtask-card {
  background: #131620;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 16px;
}

.sc-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
}
.sc-badge {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(79, 70, 229, 0.3);
  color: #a5b4fc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  flex-shrink: 0;
}
.sc-type-chip {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.chip-freitext {
  background: rgba(79, 70, 229, 0.2);
  color: #a5b4fc;
}
.chip-pseudocode {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
}
.chip-mc {
  background: rgba(245, 158, 11, 0.15);
  color: #fcd34d;
}
.chip-plantuml {
  background: rgba(168, 85, 247, 0.2);
  color: #d8b4fe;
}
.chip-diagram_upload {
  background: rgba(249, 115, 22, 0.15);
  color: #fdba74;
}
.sc-pts {
  margin-left: auto;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
}

.sc-question {
  padding: 16px;
  font-size: 14px;
  line-height: 1.75;
  color: #d1d5db;
  white-space: pre-wrap;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  border-left: 3px solid #4f46e5;
}

.sc-body {
  padding: 16px;
}

.sc-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  font-size: 11px;
  color: #374151;
  font-style: italic;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.01);
}

/* ─── MC ─── */
.mc-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mc-no-options {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 13px;
  color: #f87171;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.2);
}
.mc-opt {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 10px;
  cursor: pointer;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.12s;
}
.mc-opt.selected {
  border-color: #4f46e5;
  background: rgba(79, 70, 229, 0.12);
}
.mc-opt input[type="radio"] {
  display: none;
}
.mc-opt-key {
  font-weight: 700;
  color: #6b7280;
  min-width: 20px;
  flex-shrink: 0;
}
.mc-opt.selected .mc-opt-key {
  color: #818cf8;
}
.mc-opt-text {
  font-size: 14px;
  line-height: 1.5;
  color: #d1d5db;
}

/* ─── PlantUML ─── */
.uml-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  padding: 4px;
}
.uml-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 7px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  background: transparent;
  transition: all 0.15s;
}
.uml-tab.active {
  background: #1e2235;
  color: #a5b4fc;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
.uml-tab:hover:not(.active) {
  color: #9ca3af;
}
.uml-code-panes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 600px) {
  .uml-code-panes {
    grid-template-columns: 1fr;
  }
}
.plantuml-wrap {
  display: flex;
  flex-direction: column;
}
.pane {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pane-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #4b5563;
}
.code-input {
  flex: 1;
  min-height: 240px;
  padding: 12px;
  border-radius: 10px;
  resize: vertical;
  outline: none;
  background: #0a0c12;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  color: #d1d5db;
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 13px;
  line-height: 1.65;
  transition: border-color 0.15s;
}
.code-input:focus {
  border-color: #4f46e5;
}
.code-input-full {
  min-height: 200px;
  width: 100%;
  display: block;
}
.plantuml-preview {
  min-height: 240px;
  border-radius: 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.plantuml-preview img {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
}
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #9ca3af;
  font-size: 12px;
}

/* ─── Text ─── */
.text-input {
  width: 100%;
  min-height: 160px;
  padding: 12px;
  border-radius: 10px;
  resize: vertical;
  outline: none;
  background: rgba(255, 255, 255, 0.04);
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  color: #e8eaf0;
  font-size: 14px;
  line-height: 1.7;
  font-family: inherit;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.text-input:focus {
  border-color: #4f46e5;
}

/* ─── Upload ─── */
.upload-area {
}
.upload-info {
  display: flex;
  align-items: center;
  gap: 7px;
  background: rgba(79, 70, 229, 0.1);
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 12px;
  color: #818cf8;
  margin-bottom: 10px;
}
.upload-zone {
  border: 2px dashed rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
  transition: border-color 0.2s;
}
.upload-zone:hover,
.upload-zone.has-file {
  border-color: #4f46e5;
}
.upload-icon {
  color: #4b5563;
}
.upload-title {
  font-size: 14px;
  font-weight: 600;
  color: #d1d5db;
}
.upload-hint-text {
  font-size: 12px;
  color: #4b5563;
}
.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 4px;
  transition: background 0.15s;
}
.upload-btn:hover {
  background: #4338ca;
}
.upload-preview-img {
  max-width: 100%;
  max-height: 260px;
  border-radius: 8px;
  object-fit: contain;
}
.upload-replace {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 7px;
  padding: 6px 14px;
  font-size: 12px;
  color: #9ca3af;
  cursor: pointer;
  margin-top: 6px;
}

/* ─── Nav row ─── */
.nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.nav-counter {
  font-size: 12px;
  color: #374151;
}
.nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 10px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1.5px solid transparent;
  transition: all 0.15s;
}
.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.nav-back {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  color: #9ca3af;
}
.nav-back:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: #e8eaf0;
}
.nav-next {
  background: #4f46e5;
  color: white;
}
.nav-next:hover {
  background: #4338ca;
}
.nav-submit {
  background: #059669;
  color: white;
}
.nav-submit:hover:not(:disabled) {
  background: #047857;
}
.btn-spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ─── Overlays ─── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 200;
  padding: 20px;
}
@media (min-width: 600px) {
  .overlay {
    align-items: center;
  }
}

.overlay-panel {
  background: #1a1d2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  max-height: 80dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.overlay-panel-wide {
  max-width: 660px;
}
.overlay-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 14px;
  font-weight: 700;
  color: #f0f1f8;
  flex-shrink: 0;
}
.overlay-header button {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}
.overlay-header button:hover {
  color: #f0f1f8;
}
.overlay-body {
  padding: 18px;
  overflow-y: auto;
}
.overlay-scroll {
  max-height: calc(80dvh - 52px);
  overflow-y: auto;
}
.overlay-company {
  font-size: 14px;
  font-weight: 700;
  color: #818cf8;
  margin-bottom: 10px;
}
.overlay-text {
  font-size: 14px;
  line-height: 1.8;
  color: #d1d5db;
}

/* ─── Belegsatz ─── */
.bs-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.bs-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
.bs-h1 {
  font-size: 14px;
  font-weight: 700;
  color: #f0f1f8;
  margin-bottom: 10px;
}
.bs-h2 {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #4b5563;
  margin: 10px 0 6px;
}
.bs-table {
  width: 100%;
  border-collapse: collapse;
}
.bs-table td {
  padding: 5px 6px;
  font-size: 12px;
  line-height: 1.5;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  vertical-align: top;
  color: #d1d5db;
}
.bs-table tr:last-child td {
  border-bottom: none;
}
.bs-table td:first-child {
  font-weight: 600;
  white-space: nowrap;
  padding-right: 14px;
  color: #9ca3af;
  width: 1%;
}
.mono {
  font-family: "SF Mono", "Fira Code", monospace !important;
  font-size: 11.5px !important;
}
.sym {
  text-align: center;
  font-size: 14px;
  color: #818cf8;
}
.bs-code {
  background: #0a0c12;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 11px 13px;
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 12px;
  line-height: 1.65;
  white-space: pre;
  overflow-x: auto;
  color: #d1d5db;
}
.bs-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 4px;
}
.bs-chips span {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 5px;
  padding: 2px 9px;
  font-family: monospace;
  font-size: 12px;
  color: #9ca3af;
}
.bs-link {
  display: inline-block;
  margin-top: 8px;
  font-size: 12px;
  color: #818cf8;
  text-decoration: none;
}
.bs-link:hover {
  text-decoration: underline;
}

/* ─── Confirm ─── */
.confirm-dialog {
  background: #1a1d2e;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
}
.confirm-dialog h3 {
  font-size: 16px;
  font-weight: 700;
  color: #f0f1f8;
  margin-bottom: 10px;
}
.confirm-dialog p {
  font-size: 13px;
  line-height: 1.6;
  color: #9ca3af;
  margin-bottom: 20px;
}
.confirm-btns {
  display: flex;
  gap: 10px;
}
.confirm-cancel {
  flex: 1;
  padding: 10px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #9ca3af;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.confirm-ok {
  flex: 1;
  padding: 10px;
  border-radius: 9px;
  border: none;
  background: #4f46e5;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.confirm-ok:hover {
  background: #4338ca;
}
.confirm-ok-danger {
  background: #dc2626;
}
.confirm-ok-danger:hover {
  background: #b91c1c;
}

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 50;
    transform: translateX(-100%);
    width: 260px;
    transition: transform 0.25s ease;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .sidebar-close {
    display: flex !important;
  }
  .sidebar-backdrop {
    display: block;
  }
  .mobile-nav {
    display: flex;
  }
  .topbar-part {
    display: none;
  }
}

/* ─── Tabellen-Chip ─── */
.chip-table {
  background: rgba(20, 184, 166, 0.15);
  color: #5eead4;
}

/* ─── Tabellen-Editor ─── */
.table-editor-wrap {
  overflow-x: auto;
}
.table-empty-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
  font-size: 13px;
  color: #6b7280;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
}
.table-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.answer-table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 10px;
  overflow: hidden;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
}
.table-th {
  background: rgba(79, 70, 229, 0.18);
  padding: 9px 12px;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  color: #a5b4fc;
  border-bottom: 1.5px solid rgba(255, 255, 255, 0.1);
  white-space: nowrap;
}
.table-th:not(:last-child) {
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.table-row:nth-child(even) {
  background: rgba(255, 255, 255, 0.02);
}
.table-td {
  padding: 6px;
  vertical-align: top;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.table-td:not(:last-child) {
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.td-fixed {
  background: rgba(255, 255, 255, 0.04);
}
.td-fixed-text {
  display: block;
  padding: 6px 8px;
  font-size: 13px;
  font-weight: 600;
  color: #9ca3af;
}

.td-input {
  width: 100%;
  min-height: 52px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: #e8eaf0;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.15s;
  outline: none;
}
.td-input:focus {
  border-color: #4f46e5;
  background: rgba(79, 70, 229, 0.08);
}
.td-input::placeholder {
  color: #374151;
}

.table-add-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
  align-self: flex-start;
}
.table-add-row:hover {
  background: rgba(255, 255, 255, 0.09);
  color: #9ca3af;
  border-color: rgba(255, 255, 255, 0.25);
}
</style>
