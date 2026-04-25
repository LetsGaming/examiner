<template>
  <button
    class="report-btn-icon"
    :class="{ 'report-btn-icon--compact': compact }"
    :title="compact ? 'Aufgabe melden' : undefined"
    @click="onClick"
  >
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <!-- Bug-Icon: simpler Käfer-Umriss -->
      <path d="M8 2l1.88 1.88" />
      <path d="M14.12 3.88L16 2" />
      <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z" />
      <path d="M12 20v-9" />
      <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
      <path d="M6 13H2" />
      <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
      <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
      <path d="M22 13h-4" />
      <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
    </svg>
    <span v-if="!compact" class="report-btn-label">Melden</span>
  </button>
</template>

<script setup lang="ts">
/**
 * TaskReportButton — Auslöser für das Report-Modal.
 *
 * Nimmt den Kontext (taskId, optional subtaskId etc.) als Prop, ruft beim
 * Klick `openReport` aus dem Composable auf. Compact-Mode rendert nur das
 * Icon (für Plätze mit wenig Platz wie History-Subtask-Header).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { openReport, type ReportContext } from '../../composables/useTaskReport.js';

const props = defineProps<{
  context: ReportContext;
  compact?: boolean;
}>();

function onClick(): void {
  openReport(props.context);
}
</script>

<style scoped>
.report-btn-icon {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: var(--control-bg);
  border: 1px solid var(--control-border);
  border-radius: 7px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-subtle);
  transition: all var(--transition);
}
.report-btn-icon:hover {
  border-color: var(--danger, #b32d2d);
  color: var(--danger, #b32d2d);
}
.report-btn-icon--compact {
  padding: 4px 6px;
  gap: 0;
}
.report-btn-label {
  white-space: nowrap;
}
</style>
