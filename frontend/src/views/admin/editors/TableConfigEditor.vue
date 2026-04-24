<template>
  <div class="table-editor">
    <div class="editor-heading-row">
      <span class="editor-heading">Tabellen-Konfiguration</span>
    </div>
    <p class="editor-hint">
      Spalten und Zeilenzahl werden dem Prüfling vorgegeben. Bei "Erste Spalte
      fixiert" kannst du Zeilen-Label (z.B. Entitätsnamen) vordefinieren — MD §5.1
      W19/20 HS3.
    </p>

    <div class="field-group">
      <label class="field-label">SPALTEN</label>
      <div class="columns-list">
        <div v-for="(col, i) in draft.columns" :key="i" class="column-row">
          <span class="col-index mono">{{ i + 1 }}</span>
          <input
            :value="col"
            class="field-input"
            placeholder="Spalten-Überschrift…"
            @input="updateColumn(i, ($event.target as HTMLInputElement).value)"
          />
          <button
            class="icon-btn-danger"
            :disabled="draft.columns.length <= 1"
            @click="removeColumn(i)"
          >
            ×
          </button>
        </div>
      </div>
      <button class="btn-ghost btn-sm" @click="addColumn">+ Spalte</button>
    </div>

    <div class="field-row-sm">
      <div class="field-group">
        <label class="field-label">ZEILENZAHL</label>
        <input
          type="number"
          :value="draft.rowCount"
          min="1"
          max="20"
          class="field-input"
          style="width: 80px"
          @input="updateRowCount(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div class="field-group">
      <label class="checkbox-row">
        <input
          type="checkbox"
          :checked="draft.fixedFirstColumn === true"
          @change="toggleFixedFirstColumn(($event.target as HTMLInputElement).checked)"
        />
        Erste Spalte fixiert (z.B. Entitätsnamen vorgegeben)
      </label>
    </div>

    <div v-if="draft.fixedFirstColumn" class="field-group">
      <label class="field-label">FIXIERTE WERTE DER ERSTEN SPALTE</label>
      <div class="columns-list">
        <div v-for="(val, i) in fixedValues" :key="i" class="column-row">
          <span class="col-index mono">{{ i + 1 }}</span>
          <input
            :value="val"
            class="field-input"
            placeholder="z.B. Entitätsname…"
            @input="updateFixedValue(i, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
      <p class="field-hint">
        Wird automatisch an die Zeilenzahl angeglichen.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * TableConfigEditor — Editor für TableConfig (task_type = 'table').
 *
 * Draft-State: wir arbeiten auf einer lokalen Kopie der Config und emittieren
 * bei jeder Änderung das neue komplette Objekt. Das ist einfacher zu handeln
 * als einzelne Field-Updates und produziert weniger Re-Render-Ping-Pongs.
 *
 * `fixedFirstColumnValues` wird implizit an `rowCount` angeglichen, damit
 * zu kurz/zu lang keine Laufzeit-Fehler im Prüfungs-Frontend macht.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { computed } from 'vue';
import type { TableConfig } from '../../../types/index.js';

const props = defineProps<{
  config: TableConfig | null;
}>();

const emit = defineEmits<{
  'update:config': [value: TableConfig];
}>();

// Default-Config wenn noch keine existiert (frisch gewechselter Typ auf 'table')
const DEFAULT_CONFIG: TableConfig = {
  columns: ['Spalte 1', 'Spalte 2'],
  rows: [],
  rowCount: 3,
  fixedFirstColumn: false,
};

const draft = computed<TableConfig>(() => props.config ?? DEFAULT_CONFIG);

const fixedValues = computed<string[]>(() => {
  const existing = draft.value.fixedFirstColumnValues ?? [];
  // An rowCount angleichen: abschneiden oder mit Leer-Strings auffüllen.
  const result = [...existing];
  while (result.length < draft.value.rowCount) result.push('');
  return result.slice(0, draft.value.rowCount);
});

function emitUpdate(next: Partial<TableConfig>): void {
  emit('update:config', { ...draft.value, ...next });
}

function addColumn(): void {
  emitUpdate({ columns: [...draft.value.columns, `Spalte ${draft.value.columns.length + 1}`] });
}

function removeColumn(index: number): void {
  emitUpdate({ columns: draft.value.columns.filter((_, i) => i !== index) });
}

function updateColumn(index: number, value: string): void {
  emitUpdate({
    columns: draft.value.columns.map((c, i) => (i === index ? value : c)),
  });
}

function updateRowCount(raw: string): void {
  const n = Math.max(1, Math.min(20, Number(raw) || 1));
  emitUpdate({ rowCount: n });
}

function toggleFixedFirstColumn(checked: boolean): void {
  // Beim Aktivieren initialisieren wir das Values-Array auf die aktuelle
  // rowCount-Länge, damit der Editor sofort Inputs rendert.
  const base: Partial<TableConfig> = { fixedFirstColumn: checked };
  if (checked && !draft.value.fixedFirstColumnValues) {
    base.fixedFirstColumnValues = Array.from({ length: draft.value.rowCount }, () => '');
  }
  emitUpdate(base);
}

function updateFixedValue(index: number, value: string): void {
  const next = [...fixedValues.value];
  next[index] = value;
  emitUpdate({ fixedFirstColumnValues: next });
}
</script>

<style scoped>
.table-editor { display: flex; flex-direction: column; gap: 14px; }
.editor-heading-row { display: flex; justify-content: space-between; }
.editor-heading { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); }
.editor-hint { font-size: 11px; color: var(--text-faint); line-height: 1.5; margin: 0; }
.columns-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.column-row { display: flex; align-items: center; gap: 8px; }
.col-index { min-width: 22px; color: var(--text-faint); font-size: 12px; }
.field-row-sm { display: flex; gap: 14px; }
.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); cursor: pointer; }
.field-hint { font-size: 11px; color: var(--text-faint); margin-top: 4px; }
.icon-btn-danger { background: transparent; border: 1px solid var(--danger-border); color: var(--danger-text); border-radius: 6px; width: 26px; height: 26px; font-size: 16px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.icon-btn-danger:disabled { opacity: 0.3; cursor: not-allowed; }
.icon-btn-danger:hover:not(:disabled) { background: var(--danger-bg); }
</style>
