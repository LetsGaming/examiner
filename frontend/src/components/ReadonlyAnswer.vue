<template>
  <div class="readonly-answer">
    <!-- No answer -->
    <div v-if="!answer" class="no-answer">Keine Antwort abgegeben.</div>

    <!-- MC / MC-Multi -->
    <template v-else-if="subtask.taskType === 'mc' || subtask.taskType === 'mc_multi'">
      <div
        v-for="opt in subtask.mcOptions ?? []"
        :key="opt.id"
        class="mc-option"
        :class="{
          'mc-option--selected': answer?.selectedMcOption === opt.id,
          'mc-option--correct': isCorrect(opt.id),
          'mc-option--wrong': answer?.selectedMcOption === opt.id && !isCorrect(opt.id),
          'mc-option--unselected': answer?.selectedMcOption !== opt.id && !isCorrect(opt.id),
        }"
      >
        <span class="mc-letter">{{ opt.id }}</span>
        <span class="mc-text">{{ opt.text }}</span>
        <svg v-if="answer?.selectedMcOption === opt.id && isCorrect(opt.id)" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else-if="answer?.selectedMcOption === opt.id && !isCorrect(opt.id)" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><path d="m15 9-6 6M9 9l6 6"/></svg>
        <svg v-else-if="isCorrect(opt.id)" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    </template>

    <!-- SQL / Pseudocode -->
    <template v-else-if="subtask.taskType === 'sql' || subtask.taskType === 'pseudocode'">
      <pre class="code-answer">{{ answer.textValue || '(leer)' }}</pre>
    </template>

    <!-- Diagram upload -->
    <template v-else-if="subtask.taskType === 'diagram_upload'">
      <div v-if="answer.diagramImagePath" class="diagram-answer">
        <img :src="`/uploads/${filename(answer.diagramImagePath)}`" alt="Diagramm" class="diagram-img" />
      </div>
      <div v-else class="no-answer">Kein Diagramm hochgeladen.</div>
    </template>

    <!-- PlantUML -->
    <template v-else-if="subtask.taskType === 'plantuml'">
      <pre class="code-answer">{{ answer.textValue || '(leer)' }}</pre>
    </template>

    <!-- Table -->
    <template v-else-if="subtask.taskType === 'table'">
      <div v-if="tableData.length > 0" class="table-answer">
        <table class="readonly-table">
          <thead>
            <tr>
              <th v-for="col in subtask.tableConfig?.columns ?? []" :key="col">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in tableData" :key="i">
              <td v-for="(cell, j) in row" :key="j">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="no-answer">Keine Tabelleneinträge.</div>
    </template>

    <!-- Freitext / Default -->
    <template v-else>
      <div class="text-answer">{{ answer.textValue || '(leer)' }}</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SubTask, Answer } from '../types/index.js';

const props = defineProps<{
  subtask: SubTask;
  answer?: Answer;
  expectedAnswer?: Record<string, unknown>;
}>();

function isCorrect(optId: string): boolean {
  if (!props.expectedAnswer) return false;
  const ea = props.expectedAnswer;
  if (typeof ea.correctOption === 'string') return ea.correctOption === optId;
  if (Array.isArray(ea.correctOptions)) return (ea.correctOptions as string[]).includes(optId);
  return false;
}

const tableData = computed<string[][]>(() => {
  if (!props.answer?.textValue) return [];
  try {
    return JSON.parse(props.answer.textValue) as string[][];
  } catch {
    return [];
  }
});

function filename(path: string): string {
  return path.split('/').pop() ?? path;
}
</script>

<style scoped>
.readonly-answer { font-size: 14px; }
.no-answer { color: #4b5563; font-style: italic; font-size: 13px; }

.mc-option { display: flex; align-items: flex-start; gap: 10px; padding: 9px 12px; border-radius: 8px; margin-bottom: 6px; border: 1px solid; transition: none; }
.mc-option--selected { background: rgba(129,140,248,0.12); border-color: rgba(129,140,248,0.35); }
.mc-option--correct { background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.3); }
.mc-option--wrong { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); }
.mc-option--unselected { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.06); opacity: 0.55; }
.mc-letter { font-weight: 700; font-size: 13px; color: #818cf8; width: 16px; flex-shrink: 0; }
.mc-text { flex: 1; color: #d1d5db; line-height: 1.5; }

.code-answer { background: rgba(0,0,0,0.35); border-radius: 8px; padding: 12px 14px; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px; color: #86efac; overflow-x: auto; white-space: pre-wrap; margin: 0; }

.diagram-img { max-width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); }

.table-answer { overflow-x: auto; }
.readonly-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.readonly-table th { padding: 8px 12px; background: rgba(255,255,255,0.06); color: #9ca3af; font-weight: 600; text-align: left; border: 1px solid rgba(255,255,255,0.08); }
.readonly-table td { padding: 7px 12px; color: #d1d5db; border: 1px solid rgba(255,255,255,0.06); }

.text-answer { color: #d1d5db; line-height: 1.65; white-space: pre-wrap; }
</style>
