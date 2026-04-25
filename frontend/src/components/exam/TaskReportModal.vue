<template>
  <Teleport to="body">
    <Transition name="report-modal">
      <div
        v-if="report.open.value"
        class="report-backdrop"
        @click.self="report.closeReport"
      >
        <div class="report-dialog" role="dialog" aria-labelledby="report-title">
          <header class="report-header">
            <h3 id="report-title" class="report-title">Aufgabe melden</h3>
            <button class="icon-btn" aria-label="Schließen" @click="report.closeReport">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <div class="report-body">
            <p class="report-intro">
              Was ist das Problem? Du hilfst dem Admin, indem du die Kategorie auswählst und kurz
              beschreibst, was nicht stimmt.
            </p>

            <fieldset class="report-fieldset">
              <legend class="report-legend">Kategorie</legend>
              <div class="report-categories">
                <label
                  v-for="cat in report.categories"
                  :key="cat.id"
                  class="report-cat"
                  :class="{ 'report-cat--active': report.form.category === cat.id }"
                >
                  <input
                    type="radio"
                    name="report-category"
                    :value="cat.id"
                    :checked="report.form.category === cat.id"
                    @change="report.changeCategory(cat.id)"
                  />
                  <span class="report-cat-emoji">{{ cat.emoji }}</span>
                  <span class="report-cat-label">{{ cat.label }}</span>
                </label>
              </div>
            </fieldset>

            <label class="report-field">
              <span class="report-field-label">
                Beschreibung
                <span class="report-field-hint">(unverändert lassen → wird nicht gesendet)</span>
              </span>
              <textarea
                v-model="report.form.description"
                class="report-textarea"
                rows="3"
                maxlength="500"
              />
            </label>

            <details class="report-suggest" :open="suggestionOpen">
              <summary @click.prevent="suggestionOpen = !suggestionOpen">
                <span class="report-suggest-arrow">▸</span>
                Vorschlag, wie es richtig wäre
                <span class="report-field-hint">(optional)</span>
              </summary>
              <textarea
                v-model="report.form.suggestion"
                class="report-textarea"
                rows="2"
                maxlength="300"
              />
            </details>

            <div class="report-meta-info">
              <span class="report-meta-icon">ℹ</span>
              Mitgesendet werden: Aufgaben-ID, Topic, Prüfungsteil, Zeitstempel und ein
              Direktlink für den Admin.
            </div>

            <div v-if="report.submitError.value" class="report-error">
              {{ report.submitError.value }}
            </div>
          </div>

          <footer class="report-footer">
            <button
              class="report-btn report-btn--cancel"
              :disabled="report.submitting.value"
              @click="report.closeReport"
            >
              Abbrechen
            </button>
            <button
              class="report-btn report-btn--primary"
              :disabled="report.submitting.value"
              @click="report.submitReport"
            >
              <span v-if="report.submittedSuccess.value">✓ In Zwischenablage kopiert</span>
              <span v-else-if="report.submitting.value">Wird vorbereitet…</span>
              <span v-else>Kopieren &amp; senden</span>
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * TaskReportModal — Eingabeformular für den Aufgaben-Report.
 *
 * State + Logik leben komplett in `useTaskReport`. Diese Component ist reine
 * Präsentation — sie liest und mutiert via `useTaskReport()`.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { ref } from 'vue';
import { useTaskReport } from '../../composables/useTaskReport.js';

const report = useTaskReport();
const suggestionOpen = ref(false);
</script>

<style scoped>
.report-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 220;
  padding: 20px;
}
.report-dialog {
  background: var(--bg-overlay);
  border: 1px solid var(--control-border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 480px;
  max-height: calc(100dvh - 40px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}
.report-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
.icon-btn {
  background: transparent;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}
.icon-btn:hover {
  background: var(--control-bg-hover);
  color: var(--text-primary);
}

.report-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}
.report-intro {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0 0 14px;
  line-height: 1.5;
}

.report-fieldset {
  border: none;
  padding: 0;
  margin: 0 0 14px;
}
.report-legend {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  margin-bottom: 8px;
  padding: 0;
}
.report-categories {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.report-cat {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--control-border);
  border-radius: 7px;
  cursor: pointer;
  transition: all var(--transition);
  font-size: 13px;
  color: var(--text-muted);
}
.report-cat:hover {
  background: var(--control-bg-hover);
}
.report-cat--active {
  background: var(--brand-bg, var(--control-bg-hover));
  border-color: var(--brand);
  color: var(--text-primary);
}
.report-cat input[type='radio'] {
  margin: 0;
  accent-color: var(--brand);
}
.report-cat-emoji {
  font-size: 14px;
  line-height: 1;
}

.report-field {
  display: block;
  margin-bottom: 12px;
}
.report-field-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  margin-bottom: 6px;
}
.report-field-hint {
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--text-ghost);
  font-size: 10px;
  margin-left: 4px;
}
.report-textarea {
  width: 100%;
  padding: 8px 10px;
  background: var(--control-bg);
  border: 1px solid var(--control-border);
  border-radius: 7px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  min-height: 44px;
}
.report-textarea:focus {
  outline: none;
  border-color: var(--brand);
}

.report-suggest {
  margin-bottom: 12px;
}
.report-suggest summary {
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  list-style: none;
  padding: 4px 0;
  user-select: none;
}
.report-suggest summary::-webkit-details-marker {
  display: none;
}
.report-suggest-arrow {
  display: inline-block;
  transition: transform 0.15s;
  margin-right: 4px;
}
.report-suggest[open] .report-suggest-arrow {
  transform: rotate(90deg);
}
.report-suggest summary + .report-textarea {
  margin-top: 6px;
}

.report-meta-info {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  font-size: 11px;
  color: var(--text-ghost);
  background: var(--control-bg);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  padding: 8px 10px;
  line-height: 1.4;
}
.report-meta-icon {
  flex-shrink: 0;
  font-weight: 700;
}

.report-error {
  margin-top: 8px;
  padding: 8px 10px;
  background: var(--danger-bg, #2a0c0c);
  border: 1px solid var(--danger, #b32d2d);
  border-radius: 6px;
  font-size: 12px;
  color: var(--danger-text, #ffb3b3);
}

.report-footer {
  display: flex;
  gap: 8px;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--border-light);
}
.report-btn {
  flex: 1;
  padding: 9px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--transition);
}
.report-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.report-btn--cancel {
  background: var(--control-bg);
  border-color: var(--control-border);
  color: var(--text-muted);
}
.report-btn--cancel:hover:not(:disabled) {
  background: var(--control-bg-hover);
}
.report-btn--primary {
  background: var(--brand);
  color: white;
}
.report-btn--primary:hover:not(:disabled) {
  background: var(--brand-dark);
}

/* Transition */
.report-modal-enter-active,
.report-modal-leave-active {
  transition: opacity 0.15s ease;
}
.report-modal-enter-from,
.report-modal-leave-to {
  opacity: 0;
}
</style>
