<template>
  <div class="subtask-editor">
    <!-- Gemeinsame Basis-Felder -->
    <div class="field-row-sm">
      <div class="field-group">
        <label class="field-label">PUNKTE</label>
        <input
          :value="subtask.points"
          type="number"
          min="1"
          max="50"
          class="field-input"
          style="width: 80px"
          @input="onPointsInput(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <TypeSelector
      :task-type="currentTaskType"
      :diagram-type="currentDiagramType"
      @update:task-type="onTypeChange"
      @update:diagram-type="onDiagramTypeChange"
    />

    <div class="field-group">
      <label class="field-label">FRAGETEXT</label>
      <textarea
        :value="currentQuestionText"
        class="field-textarea"
        rows="4"
        @input="onQuestionTextInput(($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <!-- Typ-spezifische Editoren -->
    <div class="typed-editor-slot">
      <McOptionsEditor
        v-if="currentTaskType === 'mc' || currentTaskType === 'mc_multi'"
        :options="currentMcOptions"
        :is-wiso="isWiso"
        :is-multi="currentTaskType === 'mc_multi'"
        @update:options="onMcOptionsChange"
      />

      <TableConfigEditor
        v-else-if="currentTaskType === 'table'"
        :config="currentTableConfig"
        @update:config="onTableConfigChange"
      />

      <DiagramExpectedEditor
        v-else-if="currentTaskType === 'plantuml' || currentTaskType === 'diagram_upload'"
        :elements="currentExpectedElements"
        @update:elements="onExpectedElementsChange"
      />

      <SqlExpectedEditor
        v-else-if="currentTaskType === 'sql'"
        :solution-sql="currentSolutionSql"
        :key-points="currentKeyPoints"
        @update:solution-sql="onSolutionSqlChange"
        @update:key-points="onKeyPointsChange"
      />

      <!-- freitext + pseudocode → nur KeyPoints -->
      <KeyPointsEditor
        v-else
        :points="currentKeyPoints"
        @update:points="onKeyPointsChange"
      />
    </div>

    <!-- Power-User Fallback -->
    <AdvancedJsonFallback :raw="rawJson" @update:raw="onRawJsonChange" />

    <!-- Save-Button -->
    <div class="editor-actions">
      <button class="btn-ghost btn-sm" :disabled="saving" @click="$emit('save')">
        <span v-if="saving" class="btn-spinner" />
        <template v-else>Subtask speichern</template>
      </button>
      <span v-if="saveSuccess" class="save-ok">✓ Gespeichert</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * SubtaskEditor — Orchestrator für den typ-abhängigen Editor einer Sub-Aufgabe.
 *
 * Resolver-Logik: `currentXxx`-Computeds lesen zuerst aus `edits` (in-progress
 * Änderungen im Composable), dann aus `subtask` (Server-Zustand) — so sieht
 * der User immer seine noch ungespeicherten Werte.
 *
 * Änderungen schreiben wir in den `edits`-Buffer über den `setEdit`-Emit. Beim
 * Speichern (Parent triggert saveSubtask über 'save'-Event) baut der
 * Composable-Save daraus das PATCH-Payload.
 *
 * Typ-Wechsel: Wir setzen die alten typ-abhängigen Felder aktiv auf Default-
 * Werte zurück, damit keine Leichen in der DB bleiben. Z.B. bei Wechsel von
 * 'mc' → 'freitext' werden mc_options = null gesetzt.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { computed } from 'vue';
import type {
  AdminSubtask,
  DiagramType,
  ExamPart,
  McOption,
  TableConfig,
  TaskType,
} from '../../../types/index.js';
import type { SubtaskEdit } from '../composables/useTaskDetail.js';
import TypeSelector from './TypeSelector.vue';
import McOptionsEditor from './McOptionsEditor.vue';
import TableConfigEditor from './TableConfigEditor.vue';
import DiagramExpectedEditor from './DiagramExpectedEditor.vue';
import SqlExpectedEditor from './SqlExpectedEditor.vue';
import KeyPointsEditor from './KeyPointsEditor.vue';
import AdvancedJsonFallback from './AdvancedJsonFallback.vue';

const props = defineProps<{
  subtask: AdminSubtask;
  edits: SubtaskEdit;
  part: ExamPart;
  saving: boolean;
  saveSuccess: boolean;
}>();

const emit = defineEmits<{
  setEdit: [field: keyof SubtaskEdit, value: unknown];
  save: [];
}>();

// ── Shared: WiSo-Erkennung für MC-ID-Format ────────────────────────────────
const isWiso = computed(() => props.part === 'teil_3');

// ── Resolver: edits wins über subtask (Server-Zustand) ─────────────────────
const currentTaskType = computed<TaskType>(() => props.edits.task_type ?? props.subtask.task_type);

const currentQuestionText = computed(
  () => props.edits.question_text ?? props.subtask.question_text,
);

const currentDiagramType = computed<DiagramType | null>(() => {
  if (props.edits.diagram_type !== undefined) return props.edits.diagram_type;
  return (props.subtask.diagram_type as DiagramType | undefined) ?? null;
});

const currentMcOptions = computed<McOption[]>(() => {
  if (props.edits.mc_options !== undefined) return props.edits.mc_options ?? [];
  return props.subtask.mc_options ?? [];
});

const currentTableConfig = computed<TableConfig | null>(() => {
  if (props.edits.table_config !== undefined) return props.edits.table_config;
  return props.subtask.table_config ?? null;
});

const currentExpectedElements = computed<string[]>(() => {
  if (props.edits.expected_elements !== undefined) return props.edits.expected_elements ?? [];
  return props.subtask.expected_elements ?? [];
});

/** expected_answer als Objekt — unterstützt sowohl parsed object als auch string. */
const expectedAnswerObject = computed<Record<string, unknown>>(() => {
  // Priorität: edits.expected_answer (parsed) > subtask.expected_answer (kann string oder object sein)
  const source =
    props.edits.expected_answer !== undefined
      ? props.edits.expected_answer
      : props.subtask.expected_answer;
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    return source as Record<string, unknown>;
  }
  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  return {};
});

const currentKeyPoints = computed<string[]>(() => {
  const kp = expectedAnswerObject.value.keyPoints;
  return Array.isArray(kp) ? kp.map(String) : [];
});

const currentSolutionSql = computed<string>(() => {
  const sql = expectedAnswerObject.value.solutionSql;
  return typeof sql === 'string' ? sql : '';
});

/** Raw-JSON-String für den Advanced-Fallback — zeigt den aktuellen Stand
 *  (edits oder subtask) zum Freitext-Tweaken. */
const rawJson = computed<string>(() => {
  if (typeof props.edits.expected_answer_raw === 'string') return props.edits.expected_answer_raw;
  return JSON.stringify(expectedAnswerObject.value, null, 2);
});

// ── Handler: Basis-Felder ──────────────────────────────────────────────────
function onPointsInput(raw: string): void {
  const n = Number(raw);
  if (!Number.isFinite(n)) return;
  emit('setEdit', 'points', n);
}

function onQuestionTextInput(value: string): void {
  emit('setEdit', 'question_text', value);
}

// ── Handler: Type-Switch ───────────────────────────────────────────────────
/**
 * Reset-Strategie bei Typ-Wechsel: wir setzen typ-abhängige Felder auf ihre
 * Defaults, damit die DB-Row nach dem Save konsistent mit dem neuen Typ ist.
 * Keine Leichen, keine "mc_options noch da obwohl jetzt freitext".
 */
function onTypeChange(next: TaskType): void {
  emit('setEdit', 'task_type', next);

  // Abhängige Felder je nach neuem Typ neu setzen
  if (next === 'mc' || next === 'mc_multi') {
    // Wenn schon Optionen existieren, behalten. Sonst mit Default starten.
    if (currentMcOptions.value.length === 0) {
      const ids = isWiso.value ? ['1', '2', '3', '4', '5'] : ['A', 'B', 'C', 'D'];
      const defaults: McOption[] = ids.map((id, i) => ({
        id,
        text: `Option ${id}`,
        correct: i === 0,
      }));
      emit('setEdit', 'mc_options', defaults);
    }
    // Nicht-MC-Felder leeren
    emit('setEdit', 'table_config', null);
    emit('setEdit', 'diagram_type', null);
    emit('setEdit', 'expected_elements', null);
  } else if (next === 'table') {
    emit('setEdit', 'mc_options', null);
    emit('setEdit', 'diagram_type', null);
    emit('setEdit', 'expected_elements', null);
    if (!currentTableConfig.value) {
      emit('setEdit', 'table_config', {
        columns: ['Spalte 1', 'Spalte 2'],
        rows: [],
        rowCount: 3,
        fixedFirstColumn: false,
      });
    }
  } else if (next === 'plantuml' || next === 'diagram_upload') {
    emit('setEdit', 'mc_options', null);
    emit('setEdit', 'table_config', null);
    // diagramType + expected_elements behalten falls schon gesetzt, sonst Default
    if (!currentDiagramType.value) emit('setEdit', 'diagram_type', 'uml_class');
  } else {
    // freitext, pseudocode, sql — keine Typ-Extras nötig
    emit('setEdit', 'mc_options', null);
    emit('setEdit', 'table_config', null);
    emit('setEdit', 'diagram_type', null);
    emit('setEdit', 'expected_elements', null);
  }
}

function onDiagramTypeChange(value: DiagramType | null): void {
  emit('setEdit', 'diagram_type', value);
}

// ── Handler: Typ-spezifische Updates ───────────────────────────────────────
function onMcOptionsChange(value: McOption[]): void {
  emit('setEdit', 'mc_options', value);
}

function onTableConfigChange(value: TableConfig): void {
  emit('setEdit', 'table_config', value);
}

function onExpectedElementsChange(value: string[]): void {
  emit('setEdit', 'expected_elements', value);
}

// ── Handler: expected_answer-Aggregation ───────────────────────────────────
/**
 * Beim Ändern von keyPoints/solutionSql bauen wir das expected_answer-Objekt
 * neu und schreiben es in edits.expected_answer. Das hat Vorrang vor dem
 * Raw-JSON im Save-Flow (useTaskDetail.saveSubtask).
 */
function writeExpectedAnswer(next: Record<string, unknown>): void {
  emit('setEdit', 'expected_answer', next);
  // Raw-JSON-Buffer invalidieren, damit der nächste Raw-Render den neuen
  // Stand zeigt (sonst würde der Advanced-Fallback veralteten Text anzeigen).
  emit('setEdit', 'expected_answer_raw', undefined);
}

function onKeyPointsChange(value: string[]): void {
  writeExpectedAnswer({ ...expectedAnswerObject.value, keyPoints: value });
}

function onSolutionSqlChange(value: string): void {
  writeExpectedAnswer({ ...expectedAnswerObject.value, solutionSql: value });
}

function onRawJsonChange(value: string): void {
  emit('setEdit', 'expected_answer_raw', value);
}
</script>

<style scoped>
.subtask-editor { display: flex; flex-direction: column; gap: 16px; padding: 14px 12px; background: var(--control-bg); border-radius: var(--radius-md); border: 1px solid var(--border-light); }
.field-row-sm { display: flex; gap: 14px; }
.typed-editor-slot { padding: 12px; background: var(--bg-overlay); border-radius: var(--radius-sm); border: 1px solid var(--border-light); }
.editor-actions { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
.save-ok { color: var(--success-text); font-size: 13px; font-weight: 600; }
</style>
