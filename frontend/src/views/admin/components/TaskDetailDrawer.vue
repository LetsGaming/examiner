<template>
  <Transition name="drawer">
    <div v-if="open" class="drawer-overlay" @click.self="$emit('close')">
      <aside class="drawer">
        <div class="drawer-header">
          <div>
            <div class="drawer-title">{{ task?.topic_area }}</div>
            <div class="drawer-id mono">{{ task?.id }}</div>
          </div>
          <div class="drawer-actions">
            <button class="btn-primary btn-sm" :disabled="saving" @click="$emit('saveMeta')">
              <span v-if="saving" class="btn-spinner" />
              <template v-else>Speichern</template>
            </button>
            <button class="btn-danger-sm" @click="$emit('confirmDelete')">Löschen</button>
            <button class="icon-btn" @click="$emit('close')">
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
          </div>
        </div>

        <div v-if="loading" class="loading-row">
          <div class="spinner" />
          Lädt…
        </div>
        <template v-else-if="task">
          <!-- Meta chips -->
          <div class="detail-chips">
            <span class="kind-chip">{{ task.task_kind }}</span>
            <span class="diff-chip" :class="`diff-chip--${task.difficulty}`">{{
              task.difficulty
            }}</span>
            <span class="kind-chip">{{ task.points_value }}P</span>
            <span
              class="usage-badge"
              :class="task.times_used > 0 ? 'usage-badge--used' : 'usage-badge--new'"
              >{{ task.times_used }}× verwendet</span
            >
          </div>

          <!-- Edit fields -->
          <div class="drawer-section">
            <div class="field-group">
              <label class="field-label">THEMA</label>
              <input v-model="editMeta.topic_area" class="field-input" />
            </div>
            <div class="field-row">
              <div class="field-group">
                <label class="field-label">SCHWIERIGKEIT</label>
                <select v-model="editMeta.difficulty" class="field-select">
                  <option>easy</option>
                  <option>medium</option>
                  <option>hard</option>
                </select>
              </div>
            </div>
            <div class="field-group">
              <label class="field-label"
                >ADMIN-NOTIZ <span class="field-optional">(intern)</span></label
              >
              <input
                v-model="editMeta.admin_note"
                class="field-input"
                placeholder="Interne Anmerkung…"
              />
            </div>
            <div v-if="saveSuccess" class="feedback-success feedback-success--sm">
              Gespeichert ✓
            </div>
            <div v-if="saveError" class="feedback-error">{{ saveError }}</div>
          </div>

          <!-- Subtasks -->
          <div class="drawer-section">
            <div class="section-title">Unteraufgaben ({{ task.subtasks.length }})</div>
            <div v-for="(sub, i) in task.subtasks" :key="sub.id" class="subtask-block">
              <div class="subtask-header" @click="$emit('toggleSub', i)">
                <div class="subtask-header-left">
                  <span class="sub-label mono">{{ sub.label }}</span>
                  <span class="kind-chip kind-chip--xs">{{ sub.task_type }}</span>
                  <span class="mono sub-points">{{ sub.points }}P</span>
                </div>
                <svg
                  class="chevron"
                  :class="{ open: openSubs.has(i) }"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <div v-if="openSubs.has(i)" class="subtask-body">
                <div class="field-group">
                  <label class="field-label">PUNKTE</label>
                  <input
                    :value="subEdits[i]?.points ?? sub.points"
                    @input="
                      $emit(
                        'setSubEdit',
                        i,
                        'points',
                        Number(($event.target as HTMLInputElement).value),
                      )
                    "
                    class="field-input"
                    type="number"
                    min="1"
                    max="50"
                    style="width: 80px"
                  />
                </div>
                <div class="field-group">
                  <label class="field-label">FRAGETEXT</label>
                  <textarea
                    :value="subEdits[i]?.question_text ?? sub.question_text"
                    @input="
                      $emit(
                        'setSubEdit',
                        i,
                        'question_text',
                        ($event.target as HTMLTextAreaElement).value,
                      )
                    "
                    class="field-textarea"
                  />
                </div>
                <div class="field-group">
                  <label class="field-label">ERWARTETE ANTWORT (JSON)</label>
                  <textarea
                    :value="
                      subEdits[i]?.expected_answer_raw ??
                      JSON.stringify(sub.expected_answer, null, 2)
                    "
                    @input="
                      $emit(
                        'setSubEdit',
                        i,
                        'expected_answer_raw',
                        ($event.target as HTMLTextAreaElement).value,
                      )
                    "
                    class="field-textarea field-textarea--code"
                  />
                </div>
                <button
                  class="btn-ghost btn-sm"
                  :disabled="subSaving.has(i)"
                  @click="$emit('saveSubtask', i, sub.id)"
                >
                  <span v-if="subSaving.has(i)" class="btn-spinner" />
                  <template v-else>Subtask speichern</template>
                </button>
                <span v-if="subSaveSuccess.has(i)" class="save-ok">✓</span>
              </div>
            </div>
          </div>

          <!-- Usage history -->
          <div v-if="task.usageHistory.length" class="drawer-section">
            <div class="section-title">
              Verwendungshistorie ({{ task.usageHistory.length }})
            </div>
            <div v-for="(h, i) in task.usageHistory" :key="i" class="history-row">
              <span class="history-title">{{ h.title }}</span>
              <div class="history-meta">
                <span class="role-badge role-badge--neutral">{{ h.ihk_grade || h.status }}</span>
                <span class="date-cell">{{ fmtDate(h.started_at) }}</span>
              </div>
            </div>
          </div>
        </template>
      </aside>
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * TaskDetailDrawer — Vollständiges Aufgaben-Edit-Drawer mit Meta, Subtasks,
 * Verwendungs-Historie.
 *
 * Reine Präsentations-Komponente: alle Mutationen laufen über Events zum
 * Parent, der wiederum `useTaskDetail` konsumiert. Das `editMeta`-Objekt ist
 * absichtlich reaktiv geshared (keine v-model-Brücke), weil es zum Composable
 * gehört und mutiert werden darf — vereinfacht den Flow bei Meta-Feldern.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { AdminTaskDetail } from '../../../types/index.js';
import { fmtDate } from '../utils.js';
import type { SubtaskEdit } from '../composables/useTaskDetail.js';

defineProps<{
  open: boolean;
  loading: boolean;
  task: AdminTaskDetail | null;
  editMeta: { topic_area: string; difficulty: string; admin_note: string };
  saving: boolean;
  saveSuccess: boolean;
  saveError: string | null;
  subEdits: Record<number, SubtaskEdit>;
  openSubs: Set<number>;
  subSaving: Set<number>;
  subSaveSuccess: Set<number>;
}>();

defineEmits<{
  close: [];
  saveMeta: [];
  confirmDelete: [];
  toggleSub: [index: number];
  setSubEdit: [index: number, field: keyof SubtaskEdit, value: unknown];
  saveSubtask: [index: number, subId: string];
}>();
</script>
