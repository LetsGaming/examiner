<template>
  <div class="advanced-json">
    <button
      class="collapse-toggle"
      :class="{ 'is-open': isOpen }"
      @click="isOpen = !isOpen"
    >
      <svg
        class="chev"
        :class="{ open: isOpen }"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
      Erweitert: Raw JSON
    </button>

    <div v-if="isOpen" class="advanced-body">
      <p class="advanced-hint">
        Für Power-User. Ändert <strong>expected_answer</strong> direkt als JSON.
        Bei Konflikt mit den Editor-Feldern oben gewinnt dieser Raw-Wert beim
        Speichern.
      </p>
      <textarea
        :value="raw"
        class="field-textarea field-textarea--code"
        rows="10"
        spellcheck="false"
        @input="onInput"
      />
      <p v-if="parseError" class="advanced-error">
        ⚠ {{ parseError }} (Wert wird als String gespeichert)
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * AdvancedJsonFallback — Collapsible Raw-JSON-Editor für Admins, die Dinge
 * außerhalb der typ-spezifischen Editoren setzen wollen (seltene Fälle wie
 * custom gradingHints, operator, Legacy-Felder).
 *
 * Default geschlossen. Validiert JSON beim Tippen und zeigt Fehler an; der
 * Save-Flow im Parent entscheidet, ob das Raw-JSON statt der Editor-Werte
 * gesendet wird (siehe useTaskDetail: expected_answer hat Vorrang vor
 * expected_answer_raw).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { ref, watch } from 'vue';

const props = defineProps<{
  raw: string;
}>();

const emit = defineEmits<{
  'update:raw': [value: string];
}>();

const isOpen = ref(false);
const parseError = ref<string | null>(null);

function onInput(ev: Event): void {
  const value = (ev.target as HTMLTextAreaElement).value;
  emit('update:raw', value);
}

// Bei jedem Raw-Update versuchen wir zu parsen — nur um dem User visuelles
// Feedback über Syntaxfehler zu geben. Gespeichert wird trotzdem.
watch(
  () => props.raw,
  (value) => {
    if (!value.trim()) {
      parseError.value = null;
      return;
    }
    try {
      JSON.parse(value);
      parseError.value = null;
    } catch (e) {
      parseError.value = e instanceof Error ? e.message : 'Ungültiges JSON';
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.advanced-json { margin-top: 10px; }
.collapse-toggle { display: flex; align-items: center; gap: 6px; background: transparent; border: none; color: var(--text-faint); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; cursor: pointer; padding: 6px 0; }
.collapse-toggle:hover { color: var(--text-muted); }
.chev { transition: transform 0.2s ease; }
.chev.open { transform: rotate(-180deg); }
.advanced-body { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.advanced-hint { font-size: 11px; color: var(--text-faint); line-height: 1.5; margin: 0; }
.advanced-error { font-size: 11px; color: var(--warning-text); margin: 0; }
</style>
