<template>
  <Transition name="fade">
    <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-title">Aufgaben generieren</div>
        <div class="field-group">
          <label class="field-label">PRÜFUNGSTEIL</label>
          <input :value="PART_LABELS[part]" class="field-input" readonly />
        </div>
        <div class="field-group">
          <label class="field-label">ANZAHL (1–8)</label>
          <input
            :value="count"
            @input="$emit('update:count', Number(($event.target as HTMLInputElement).value))"
            class="field-input"
            type="number"
            min="1"
            max="8"
          />
        </div>
        <div class="field-group">
          <label class="field-label"
            >SPEZIFISCHES THEMA <span class="field-optional">(optional)</span></label
          >
          <input
            :value="topic"
            @input="$emit('update:topic', ($event.target as HTMLInputElement).value)"
            class="field-input"
            placeholder="leer = automatisch"
          />
        </div>
        <div class="modal-actions">
          <button class="btn-primary" :disabled="running" @click="$emit('run')">
            <span v-if="running" class="btn-spinner" />
            <template v-else>Generieren</template>
          </button>
          <button class="btn-ghost" @click="$emit('close')">Abbrechen</button>
        </div>
        <div
          v-if="result"
          class="gen-result"
          :class="result.failed > 0 ? 'gen-result--warn' : 'gen-result--ok'"
        >
          ✓ {{ result.generated }} generiert<span v-if="result.failed">
            · {{ result.failed }} fehlgeschlagen</span
          >
        </div>
        <div v-if="error" class="feedback-error">{{ error }}</div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * GenerateModal — Schnell-Generierung aus dem Pool-Tab.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { AdminGenerateResult, ExamPart } from '../../../types/index.js';
import { PART_LABELS } from '../constants.js';

defineProps<{
  open: boolean;
  part: ExamPart;
  count: number;
  topic: string;
  running: boolean;
  result: AdminGenerateResult | null;
  error: string | null;
}>();

defineEmits<{
  close: [];
  run: [];
  'update:count': [value: number];
  'update:topic': [value: string];
}>();
</script>
