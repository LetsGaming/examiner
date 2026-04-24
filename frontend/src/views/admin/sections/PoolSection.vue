<template>
  <section class="tab-content">
    <div class="pool-toolbar">
      <input
        v-model="search"
        class="field-input field-input--sm"
        placeholder="Thema suchen…"
        @input="$emit('debouncedLoad')"
      />
      <select
        v-if="currentPart !== 'teil_3'"
        v-model="kind"
        class="field-select"
        @change="$emit('load')"
      >
        <option value="">Alle Arten</option>
        <option v-for="k in KINDS" :key="k" :value="k">{{ k }}</option>
      </select>
      <select v-model="sort" class="field-select" @change="$emit('load')">
        <option value="newest">Neueste zuerst</option>
        <option value="oldest">Älteste zuerst</option>
        <option value="most_used">Meist verwendet</option>
        <option value="least_used">Selten verwendet</option>
        <option value="topic">Nach Thema A–Z</option>
      </select>
      <span class="pool-count">{{ tasks.length }} Aufgaben</span>
      <button class="btn-primary btn-sm" @click="$emit('openGenerateModal')">+ Generieren</button>
    </div>

    <div v-if="loading" class="loading-row">
      <div class="spinner" />
      Lädt…
    </div>
    <div v-else-if="!tasks.length" class="empty-state">
      <span class="empty-icon">📭</span>
      Keine Aufgaben gefunden
    </div>
    <div v-else class="pool-table-wrap">
      <table class="pool-table">
        <thead>
          <tr>
            <th>Thema</th>
            <th>Art</th>
            <th>Punkte</th>
            <th>Verwendet</th>
            <th>Erstellt</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="task in tasks"
            :key="task.id"
            class="pool-row"
            @click="$emit('openDetail', task.id)"
          >
            <td>
              <div class="topic-name">{{ task.topic_area }}</div>
              <div v-if="task.admin_note" class="topic-note">{{ task.admin_note }}</div>
            </td>
            <td>
              <span class="kind-chip">{{ task.task_kind }}</span>
            </td>
            <td>
              <span class="mono">{{ task.points_value }}P</span>
            </td>
            <td>
              <span
                class="usage-badge"
                :class="task.times_used > 0 ? 'usage-badge--used' : 'usage-badge--new'"
                >{{ task.times_used }}×</span
              >
            </td>
            <td class="date-cell">{{ fmtDate(task.created_at) }}</td>
            <td>
              <button class="link-btn" @click.stop="$emit('openDetail', task.id)">Details</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * PoolSection — Aufgaben-Liste für einen Teil mit Such-/Filter-/Sort-Toolbar.
 *
 * Der Filter-State (search, kind, sort) wird via `v-model` nach oben gespiegelt
 * (two-way binding). So kann das useAdminPool-Composable weiterhin die Quelle
 * der Wahrheit sein, und diese Section bleibt dumm — nur UI, keine Logik.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { computed } from 'vue';
import type { AdminPoolTask, ExamPart } from '../../../types/index.js';
import { KINDS } from '../constants.js';
import { fmtDate } from '../utils.js';

const props = defineProps<{
  tasks: AdminPoolTask[];
  loading: boolean;
  currentPart: ExamPart;
  searchValue: string;
  kindValue: string;
  sortValue: string;
}>();

const emit = defineEmits<{
  'update:searchValue': [value: string];
  'update:kindValue': [value: string];
  'update:sortValue': [value: string];
  load: [];
  debouncedLoad: [];
  openDetail: [taskId: string];
  openGenerateModal: [];
}>();

// Drei writable computed-Brücken für v-model — Vue 3 pattern.
const search = computed({
  get: () => props.searchValue,
  set: (v) => emit('update:searchValue', v),
});
const kind = computed({
  get: () => props.kindValue,
  set: (v) => emit('update:kindValue', v),
});
const sort = computed({
  get: () => props.sortValue,
  set: (v) => emit('update:sortValue', v),
});
</script>
