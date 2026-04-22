<template>
  <div class="table-editor-wrap">
    <div v-if="!rows.length" class="table-empty">
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
          <tr v-for="(row, ri) in rows" :key="ri" class="table-row">
            <td
              v-for="(cell, ci) in row"
              :key="ci"
              class="table-td"
              :class="{ 'td-fixed': config.fixedFirstColumn && ci === 0 }"
            >
              <span v-if="config.fixedFirstColumn && ci === 0" class="td-fixed-text">{{ cell }}</span>
              <textarea
                v-else
                :value="cell"
                class="td-input"
                rows="2"
                :placeholder="config.columns?.[ci] ?? ''"
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
import type { TableConfig } from '../../types/index.js';

defineProps<{ rows: string[][]; config: TableConfig }>();
const emit = defineEmits<{ 'cell-input': [ri: number, ci: number, value: string]; 'add-row': [] }>();

function onCellInput(ri: number, ci: number, value: string) {
  emit('cell-input', ri, ci, value);
}
</script>

<style scoped>
.table-editor-wrap { overflow-x: auto; }
.table-empty { display: flex; align-items: center; gap: 8px; padding: 14px; font-size: 13px; color: #6b7280; background: rgba(255,255,255,0.03); border-radius: 10px; }
.table-editor { display: flex; flex-direction: column; gap: 10px; }
.answer-table { width: 100%; border-collapse: collapse; border-radius: 10px; overflow: hidden; border: 1.5px solid rgba(255,255,255,0.1); }
.table-th { background: rgba(79,70,229,0.18); padding: 9px 12px; text-align: left; font-size: 12px; font-weight: 700; color: #a5b4fc; border-bottom: 1.5px solid rgba(255,255,255,0.1); white-space: nowrap; }
.table-th:not(:last-child) { border-right: 1px solid rgba(255,255,255,0.08); }
.table-row:nth-child(even) { background: rgba(255,255,255,0.02); }
.table-td { padding: 6px; vertical-align: top; border-bottom: 1px solid rgba(255,255,255,0.06); }
.table-td:not(:last-child) { border-right: 1px solid rgba(255,255,255,0.06); }
.td-fixed { background: rgba(255,255,255,0.04); }
.td-fixed-text { display: block; padding: 6px 8px; font-size: 13px; font-weight: 600; color: #9ca3af; }
.td-input {
  width: 100%; min-height: 52px; padding: 6px 8px;
  background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.08);
  border-radius: 6px; color: #e8eaf0; font-size: 13px; font-family: inherit; line-height: 1.5;
  resize: vertical; transition: border-color 0.15s; outline: none;
}
.td-input:focus { border-color: #4f46e5; background: rgba(79,70,229,0.08); }
.td-input::placeholder { color: #374151; }
.add-row-btn {
  display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05);
  border: 1px dashed rgba(255,255,255,0.15); border-radius: 8px; padding: 7px 14px;
  font-size: 12px; color: #6b7280; cursor: pointer; transition: all 0.15s; align-self: flex-start;
}
.add-row-btn:hover { background: rgba(255,255,255,0.09); color: #9ca3af; border-color: rgba(255,255,255,0.25); }
</style>
