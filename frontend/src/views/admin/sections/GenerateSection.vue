<template>
  <section class="tab-content">
    <div class="generate-form card">
      <h2 class="card-heading">Neue Aufgaben generieren</h2>
      <div class="form-row">
        <div class="field-group">
          <label class="field-label">PRÜFUNGSTEIL</label>
          <select v-model="form.part" class="field-select field-select--full">
            <option value="teil_1">Teil 1 — Planen</option>
            <option value="teil_2">Teil 2 — Entwicklung</option>
            <option value="teil_3">Teil 3 — WiSo</option>
          </select>
        </div>
        <div class="field-group">
          <label class="field-label">FACHRICHTUNG</label>
          <select v-model="form.specialty" class="field-select field-select--full">
            <option value="fiae">FIAE</option>
            <option value="fisi">FISI</option>
          </select>
        </div>
        <div class="field-group">
          <label class="field-label">ANZAHL (1–8)</label>
          <input
            v-model.number="form.count"
            class="field-input"
            type="number"
            min="1"
            max="8"
          />
        </div>
      </div>
      <div class="field-group">
        <label class="field-label"
          >SPEZIFISCHES THEMA <span class="field-optional">(optional)</span></label
        >
        <input v-model="form.topic" class="field-input" placeholder="z.B. SQL GROUP BY" />
      </div>
      <div class="field-actions">
        <button class="btn-primary" :disabled="running" @click="$emit('run')">
          <span v-if="running" class="btn-spinner" />
          <template v-else>Generieren starten</template>
        </button>
      </div>
      <div
        v-if="result"
        class="gen-result"
        :class="result.failed > 0 ? 'gen-result--warn' : 'gen-result--ok'"
      >
        <span class="gen-result-icon">{{ result.failed > 0 ? '⚠' : '✓' }}</span>
        <span>{{ result.generated }} generiert</span>
        <span v-if="result.failed > 0" class="gen-failed"
          >{{ result.failed }} fehlgeschlagen</span
        >
      </div>
      <div v-if="error" class="feedback-error">{{ error }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * GenerateSection — Formular-Tab für Task-Generierung.
 *
 * Das Formular-Objekt ist reaktiv und wird von `useAdminGenerate` geteilt —
 * die Section schreibt direkt via v-model hinein. Run-Click und Resultate
 * laufen per Events/Props, damit die Section keinen API-Call selbst kennt.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { AdminGenerateResult, ExamPart, Specialty } from '../../../types/index.js';

defineProps<{
  form: { part: ExamPart; specialty: Specialty; count: number; topic: string };
  running: boolean;
  result: AdminGenerateResult | null;
  error: string | null;
}>();

defineEmits<{
  run: [];
}>();
</script>
