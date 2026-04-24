<template>
  <div class="mc-editor">
    <div class="mc-editor-head">
      <span class="editor-heading">Multiple-Choice-Optionen</span>
      <span class="mc-count">
        {{ options.length }} {{ isWiso ? '/ 5 empfohlen' : '/ 4 empfohlen' }}
      </span>
    </div>

    <p v-if="isMulti" class="editor-hint">
      Mehrere Optionen können korrekt sein. MD §5.3 (WiSo): genau 2 von 5 korrekt.
    </p>
    <p v-else class="editor-hint">
      Genau eine Option ist korrekt.
    </p>

    <div class="mc-list">
      <div v-for="(opt, i) in options" :key="opt.id" class="mc-row">
        <span class="mc-id mono">{{ opt.id }}</span>
        <input
          :value="opt.text"
          class="field-input mc-text"
          placeholder="Option-Text…"
          @input="onTextInput(i, $event)"
        />
        <label class="mc-correct">
          <input
            :type="isMulti ? 'checkbox' : 'radio'"
            :checked="opt.correct === true"
            :name="`mc-correct-${isMulti ? 'multi' : 'single'}`"
            @change="onCorrectChange(i)"
          />
          Korrekt
        </label>
        <button
          class="icon-btn-danger"
          :disabled="options.length <= 2"
          :title="options.length <= 2 ? 'Mindestens 2 Optionen' : 'Option entfernen'"
          @click="removeOption(i)"
        >
          ×
        </button>
      </div>
    </div>

    <div class="mc-editor-actions">
      <button class="btn-ghost btn-sm" :disabled="atMax" @click="addOption">
        + Option
      </button>
      <span v-if="atMax" class="mc-max-note">
        Max. {{ isWiso ? 5 : 6 }} Optionen erreicht
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * McOptionsEditor — Editor für MC-Optionen (single + multi).
 *
 * IDs werden automatisch vergeben:
 *   - Normal: A, B, C, D, ... (Teil 1/2, MD §5.1)
 *   - WiSo:   1, 2, 3, 4, 5   (Teil 3, MD §5.3)
 *
 * Die Modus-Erkennung läuft über das `isWiso`-Prop. Entscheidet der Parent,
 * typischerweise aus dem Task-Part (`teil_3`).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { computed } from 'vue';
import type { McOption } from '../../../types/index.js';

const props = defineProps<{
  options: McOption[];
  /** WiSo = Teil 3 = Ziffern-IDs. Sonst Buchstaben-IDs. */
  isWiso?: boolean;
  /** mc_multi erlaubt mehrere korrekte Optionen. */
  isMulti?: boolean;
}>();

const emit = defineEmits<{
  'update:options': [value: McOption[]];
}>();

const atMax = computed(() => props.options.length >= (props.isWiso ? 5 : 6));

function nextId(existing: McOption[]): string {
  const usedIds = new Set(existing.map((o) => o.id));
  if (props.isWiso) {
    for (let n = 1; n <= 9; n++) {
      const id = String(n);
      if (!usedIds.has(id)) return id;
    }
    return '9';
  }
  const letters = 'ABCDEFGHIJ'.split('');
  for (const l of letters) if (!usedIds.has(l)) return l;
  return 'Z';
}

function addOption(): void {
  const id = nextId(props.options);
  emit('update:options', [...props.options, { id, text: '', correct: false }]);
}

function removeOption(index: number): void {
  const next = props.options.filter((_, i) => i !== index);
  emit('update:options', next);
}

function onTextInput(index: number, ev: Event): void {
  const text = (ev.target as HTMLInputElement).value;
  emit(
    'update:options',
    props.options.map((o, i) => (i === index ? { ...o, text } : o)),
  );
}

function onCorrectChange(index: number): void {
  if (props.isMulti) {
    // Multi-Modus: Toggle nur die geklickte Option.
    emit(
      'update:options',
      props.options.map((o, i) => (i === index ? { ...o, correct: !o.correct } : o)),
    );
  } else {
    // Single-Modus: Radio-Verhalten, nur die geklickte ist korrekt.
    emit(
      'update:options',
      props.options.map((o, i) => ({ ...o, correct: i === index })),
    );
  }
}
</script>

<style scoped>
.mc-editor { display: flex; flex-direction: column; gap: 10px; }
.mc-editor-head { display: flex; justify-content: space-between; align-items: baseline; }
.editor-heading { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); }
.mc-count { font-size: 11px; color: var(--text-faint); }
.editor-hint { font-size: 11px; color: var(--text-faint); line-height: 1.5; margin: 0; }
.mc-list { display: flex; flex-direction: column; gap: 6px; }
.mc-row { display: flex; align-items: center; gap: 8px; }
.mc-id { min-width: 22px; font-weight: 700; color: var(--brand-text); font-size: 13px; }
.mc-text { flex: 1; }
.mc-correct { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-muted); cursor: pointer; white-space: nowrap; }
.mc-correct input { cursor: pointer; }
.icon-btn-danger { background: transparent; border: 1px solid var(--danger-border); color: var(--danger-text); border-radius: 6px; width: 26px; height: 26px; font-size: 16px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.icon-btn-danger:disabled { opacity: 0.3; cursor: not-allowed; }
.icon-btn-danger:hover:not(:disabled) { background: var(--danger-bg); }
.mc-editor-actions { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
.mc-max-note { font-size: 11px; color: var(--text-faint); }
</style>
