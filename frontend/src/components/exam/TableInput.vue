<template>
  <div class="table-editor-wrap">
    <div v-if="!config?.columns?.length" class="table-empty">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
      Tabellenkonfiguration wird geladen…
    </div>
    <div v-else class="table-editor">
      <table class="answer-table">
        <thead>
          <tr>
            <th v-for="col in config.columns" :key="col" class="table-th">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <!-- Beispielzeile: nicht editierbar, als Orientierung -->
          <tr v-if="hasExampleRow" class="example-row">
            <td
              v-for="(cell, ci) in config.exampleRow"
              :key="'ex-' + ci"
              class="table-td example-td"
            >
              <span v-if="ci === 0" class="example-badge">Beispiel</span>
              <span class="example-text">{{ cell }}</span>
            </td>
          </tr>
          <!-- Editierbare Zeilen -->
          <tr v-for="(row, ri) in rows" :key="ri" class="table-row">
            <td
              v-for="(cell, ci) in row"
              :key="ci"
              class="table-td"
              :class="{ 'td-fixed': isFirstColumnLocked(ci) }"
            >
              <span v-if="isFirstColumnLocked(ci)" class="td-fixed-text">{{ displayFixedValue(ri, cell) }}</span>
              <textarea
                v-else
                :value="cell"
                class="td-input"
                rows="2"
                :placeholder="placeholderFor(ci)"
                @input="onCellInput(ri, ci, ($event.target as HTMLTextAreaElement).value)"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <button v-if="rows.length < 10" class="add-row-btn" @click="$emit('add-row')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Zeile hinzufügen
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TableConfig } from '../../types/index.js';

const props = defineProps<{ rows: string[][]; config: TableConfig }>();
const emit = defineEmits<{ 'cell-input': [ri: number, ci: number, value: string]; 'add-row': [] }>();

const hasExampleRow = computed(() => {
  const ex = props.config?.exampleRow;
  return Array.isArray(ex) && ex.length > 0 && ex.some(c => typeof c === 'string' && c.trim().length > 0);
});

function isFirstColumnLocked(ci: number): boolean {
  return !!props.config?.fixedFirstColumn && ci === 0;
}

function displayFixedValue(ri: number, cellValue: string): string {
  // Konkrete Werte aus fixedFirstColumnValues haben Vorrang
  const fixedVals = props.config?.fixedFirstColumnValues;
  if (fixedVals && fixedVals[ri]) return fixedVals[ri];
  return cellValue;
}

function placeholderFor(ci: number): string {
  const ex = props.config?.exampleRow;
  if (ex && ex[ci]) return ex[ci].length > 40 ? ex[ci].slice(0, 37) + "…" : ex[ci];
  return props.config?.columns?.[ci] ?? '';
}

function onCellInput(ri: number, ci: number, value: string) {
  emit('cell-input', ri, ci, value);
}
</script>

<style scoped>
.table-editor-wrap { overflow-x: auto; }
.table-empty { display: flex; align-items: center; gap: 8px; padding: 14px; font-size: 13px; color: var(--text-subtle); background: var(--control-bg); border-radius: var(--radius-md); }
.table-editor { display: flex; flex-direction: column; gap: 10px; }
.answer-table { width: 100%; border-collapse: collapse; border-radius: var(--radius-md); overflow: hidden; border: 1.5px solid var(--control-border); }
.table-th { background: var(--brand-bg); padding: 9px 12px; text-align: left; font-size: 12px; font-weight: 700; color: var(--brand-text); border-bottom: 1.5px solid var(--control-border); white-space: nowrap; }
.table-th:not(:last-child) { border-right: 1px solid var(--border-light); }
.table-row:nth-child(even) { background: var(--control-bg); }
.table-td { padding: 6px; vertical-align: top; border-bottom: 1px solid var(--border-light); }
.table-td:not(:last-child) { border-right: 1px solid var(--border-light); }
.td-fixed { background: var(--control-bg-hover); }
.td-fixed-text { display: block; padding: 6px 8px; font-size: 13px; font-weight: 600; color: var(--text-muted); }

/* Beispielzeile — klar als solche gekennzeichnet */
.example-row { background: rgba(34, 197, 94, 0.06); }
.example-row:hover { background: rgba(34, 197, 94, 0.09); }
.example-td { position: relative; padding: 10px 8px; }
.example-td:first-child { padding-top: 26px; }
.example-badge {
  position: absolute; top: 4px; left: 6px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
  color: var(--success); text-transform: uppercase;
  background: rgba(34, 197, 94, 0.12); padding: 2px 5px; border-radius: 3px;
}
.example-text { display: block; font-size: 13px; color: var(--text-muted); line-height: 1.5; font-style: italic; }

.td-input {
  width: 100%; min-height: 52px; padding: 6px 8px;
  background: var(--control-bg); border: 1.5px solid var(--border-light);
  border-radius: 6px; color: var(--text-secondary); font-size: 13px; font-family: inherit; line-height: 1.5;
  resize: vertical; transition: border-color var(--transition); outline: none;
}
.td-input:focus { border-color: var(--brand); background: var(--brand-bg); }
.td-input::placeholder { color: var(--text-ghost); }
.add-row-btn {
  display: inline-flex; align-items: center; gap: 6px; background: var(--control-bg);
  border: 1px dashed var(--border-hover); border-radius: var(--radius-sm); padding: 7px 14px;
  font-size: 12px; color: var(--text-subtle); cursor: pointer; transition: all var(--transition); align-self: flex-start;
}
.add-row-btn:hover { background: var(--control-bg-hover); color: var(--text-muted); border-color: var(--border-hover); }
</style>
