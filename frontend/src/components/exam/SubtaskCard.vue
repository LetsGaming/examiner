<template>
  <div class="subtask-card">
    <div class="sc-header">
      <div class="sc-badge">{{ subtask.label }})</div>
      <span class="sc-type-chip" :class="`chip-${subtask.taskType}`">{{ TASK_TYPE_LABELS[subtask.taskType] }}</span>
      <span class="sc-pts">{{ subtask.points }} Punkte</span>
    </div>

    <div class="sc-question">{{ subtask.questionText }}</div>

    <div class="sc-body">
      <!-- Multiple Choice (Einzelauswahl) -->
      <McInput
        v-if="subtask.taskType === 'mc'"
        :options="subtask.mcOptions"
        :model-value="state.selectedMcOption"
        :name="`mc-${subtask.id}`"
        @update:model-value="onMcSelect"
      />

      <!-- Multiple Choice (Mehrfachauswahl) -->
      <McInput
        v-else-if="subtask.taskType === 'mc_multi'"
        :options="subtask.mcOptions"
        :model-value="state.selectedMcOption"
        :name="`mc-${subtask.id}`"
        multi
        @update:model-value="onMcSelect"
      />

      <!-- SQL -->
      <SqlInput
        v-else-if="subtask.taskType === 'sql'"
        :model-value="state.textValue"
        @update:model-value="onTextInput"
      />

      <!-- PlantUML -->
      <PlantUmlInput
        v-else-if="subtask.taskType === 'plantuml'"
        :code-value="state.textValue"
        :upload-file="state.uploadedFile"
        @update:code-value="onTextInput"
        @update:upload-file="onFileSelected"
      />

      <!-- Diagram upload -->
      <FileUploadInput
        v-else-if="subtask.taskType === 'diagram_upload'"
        :file="state.uploadedFile"
        hint="Zeichne dein Diagramm auf Papier, fotografiere es und lade es hier hoch."
        title="Diagramm-Bild hochladen"
        @file-selected="onFileSelected"
      />

      <!-- Table -->
      <TableInput
        v-else-if="subtask.taskType === 'table' && tableConfig"
        :rows="tableRows"
        :config="tableConfig"
        @cell-input="onTableCellInput"
        @add-row="$emit('add-table-row')"
      />

      <!-- Pseudocode -->
      <textarea
        v-else-if="subtask.taskType === 'pseudocode'"
        :value="state.textValue"
        class="code-input"
        :placeholder="PSEUDOCODE_PLACEHOLDER"
        @input="onTextInput"
        spellcheck="false"
      />

      <!-- Freitext (default) -->
      <textarea
        v-else
        :value="state.textValue"
        class="text-input"
        placeholder="Antwort eingeben…"
        @input="onTextInput"
      />
    </div>

    <div class="sc-footer">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="m9 12 2 2 4-4"/></svg>
      KI-Bewertung nach der Abgabe
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SubTask, TableConfig } from '../../types/index.js';
import { TASK_TYPE_LABELS } from '../../types/index.js';
import type { AnswerState } from '../../composables/useAnswerState.js';
import McInput       from './McInput.vue';
import SqlInput      from './SqlInput.vue';
import PlantUmlInput from './PlantUmlInput.vue';
import FileUploadInput from './FileUploadInput.vue';
import TableInput    from './TableInput.vue';

const PSEUDOCODE_PLACEHOLDER = `BEGIN\n\n  ' Pseudocode hier eingeben\n\nEND`;

const props = defineProps<{
  subtask: SubTask;
  state: AnswerState;
  tableRows: string[][];
  tableConfig: TableConfig | null;
}>();

const emit = defineEmits<{
  'text-input': [value: string];
  'mc-select': [id: string | null];
  'file-selected': [file: File];
  'table-cell-input': [ri: number, ci: number, value: string];
  'add-table-row': [];
}>();

function onTextInput(e: Event | string) {
  const value = typeof e === 'string' ? e : (e.target as HTMLTextAreaElement).value;
  emit('text-input', value);
}
function onMcSelect(id: string | null) { emit('mc-select', id); }
function onFileSelected(file: File | null) {
  if (file) emit('file-selected', file);
}
function onTableCellInput(ri: number, ci: number, value: string) { emit('table-cell-input', ri, ci, value); }
</script>

<style scoped>
.subtask-card { background: #131620; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; margin-bottom: 16px; }
.sc-header { display: flex; align-items: center; gap: 10px; padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); }
.sc-badge { width: 30px; height: 30px; border-radius: 8px; background: rgba(79,70,229,0.3); color: #a5b4fc; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; flex-shrink: 0; }
.sc-type-chip { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; }
.chip-freitext       { background: rgba(79,70,229,0.2);   color: #a5b4fc; }
.chip-pseudocode     { background: rgba(34,197,94,0.15);  color: #86efac; }
.chip-sql            { background: rgba(20,184,166,0.15); color: #5eead4; }
.chip-mc             { background: rgba(245,158,11,0.15); color: #fcd34d; }
.chip-mc_multi       { background: rgba(249,115,22,0.15); color: #fdba74; }
.chip-plantuml       { background: rgba(168,85,247,0.2);  color: #d8b4fe; }
.chip-diagram_upload { background: rgba(249,115,22,0.15); color: #fdba74; }
.chip-table          { background: rgba(20,184,166,0.15); color: #5eead4; }
.sc-pts { margin-left: auto; font-size: 13px; font-weight: 600; color: #6b7280; }
.sc-question { padding: 16px; font-size: 14px; line-height: 1.75; color: #d1d5db; white-space: pre-wrap; border-bottom: 1px solid rgba(255,255,255,0.05); border-left: 3px solid #4f46e5; }
.sc-body { padding: 16px; }
.sc-footer { display: flex; align-items: center; gap: 6px; padding: 9px 16px; font-size: 11px; color: #374151; font-style: italic; border-top: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.01); }
.text-input {
  width: 100%; min-height: 160px; padding: 12px; border-radius: 10px; resize: vertical; outline: none;
  background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.1); color: #e8eaf0;
  font-size: 14px; line-height: 1.7; font-family: inherit; transition: border-color 0.15s; box-sizing: border-box;
}
.text-input:focus { border-color: #4f46e5; }
.code-input {
  width: 100%; min-height: 200px; padding: 12px; border-radius: 10px; resize: vertical; outline: none;
  background: #0a0c12; border: 1.5px solid rgba(255,255,255,0.1); color: #d1d5db;
  font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; line-height: 1.65;
  transition: border-color 0.15s; box-sizing: border-box;
}
.code-input:focus { border-color: #4f46e5; }
</style>
