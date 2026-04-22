<template>
  <div class="sql-input-wrap">
    <div class="sql-toolbar">
      <div class="sql-chips">
        <button
          v-for="kw in KEYWORDS"
          :key="kw"
          type="button"
          class="kw-chip"
          :title="`${kw} einfügen`"
          @click="insertKeyword(kw)"
        >
          {{ kw }}
        </button>
      </div>
      <span class="sql-hint">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4m0-4h.01" />
        </svg>
        Bewertung: Syntax, Tabellenbezüge, JOIN/WHERE, Ergebnismenge
      </span>
    </div>
    <textarea
      ref="taRef"
      :value="modelValue"
      class="sql-textarea"
      spellcheck="false"
      autocapitalize="off"
      autocorrect="off"
      :placeholder="PLACEHOLDER"
      @input="onInput"
      @keydown.tab.prevent="onTab"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineProps<{ modelValue: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const taRef = ref<HTMLTextAreaElement | null>(null);

const PLACEHOLDER = `SELECT mitarbeiter.name, abteilung.bezeichnung
FROM mitarbeiter
INNER JOIN abteilung ON mitarbeiter.abteilung_id = abteilung.id
WHERE abteilung.bezeichnung = 'IT'
ORDER BY mitarbeiter.name;`;

const KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "JOIN",
  "ON",
  "GROUP BY",
  "HAVING",
  "ORDER BY",
  "INSERT",
  "UPDATE",
  "DELETE",
];

function onInput(e: Event) {
  emit("update:modelValue", (e.target as HTMLTextAreaElement).value);
}

function insertKeyword(kw: string) {
  const ta = taRef.value;
  if (!ta) return;
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? ta.value.length;
  const before = ta.value.slice(0, start);
  const after = ta.value.slice(end);
  const needsLeadingSpace = before.length > 0 && !/[\s\n]$/.test(before);
  const insertion = (needsLeadingSpace ? " " : "") + kw + " ";
  const next = before + insertion + after;
  emit("update:modelValue", next);
  requestAnimationFrame(() => {
    const pos = before.length + insertion.length;
    ta.focus();
    ta.setSelectionRange(pos, pos);
  });
}

function onTab(e: KeyboardEvent) {
  // Insert two spaces at caret; useful for indenting SQL.
  const ta = e.target as HTMLTextAreaElement;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const before = ta.value.slice(0, start);
  const after = ta.value.slice(end);
  const next = before + "  " + after;
  emit("update:modelValue", next);
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(start + 2, start + 2);
  });
}
</script>

<style scoped>
.sql-input-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sql-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(20, 184, 166, 0.06);
  border: 1px solid rgba(20, 184, 166, 0.15);
}
.sql-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.kw-chip {
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(20, 184, 166, 0.25);
  background: rgba(20, 184, 166, 0.1);
  color: #5eead4;
  font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: all 0.12s;
}
.kw-chip:hover {
  background: rgba(20, 184, 166, 0.2);
  border-color: rgba(20, 184, 166, 0.4);
  color: #99f6e4;
}
.kw-chip:active {
  transform: translateY(1px);
}
.sql-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  font-size: 11px;
  color: #6b7280;
  font-style: italic;
}
.sql-textarea {
  width: 100%;
  min-height: 200px;
  padding: 14px;
  border-radius: 10px;
  resize: vertical;
  outline: none;
  background: #0a0c12;
  border: 1.5px solid rgba(20, 184, 166, 0.2);
  color: #d1d5db;
  font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 13px;
  line-height: 1.65;
  transition: border-color 0.15s;
  box-sizing: border-box;
  tab-size: 2;
}
.sql-textarea:focus {
  border-color: #14b8a6;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.12);
}
.sql-textarea::placeholder {
  color: #3a4251;
  font-style: italic;
}
</style>
