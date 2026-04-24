<template>
  <div class="part-row">
    <div class="part-info">
      <div class="part-number">{{ part.number }}</div>
      <div class="part-details">
        <div class="part-name">{{ label }}</div>
        <div class="part-meta">
          {{ part.duration }} Min · {{ part.points }} Punkte · {{ part.taskCount }} Aufgaben
        </div>
      </div>
      <div class="part-pool" :class="(poolCount ?? 0) >= poolMin ? 'pool-ok' : 'pool-low'">
        <span class="pool-dot" />
        <span>{{ poolCount === null ? '…' : poolCount }} im Pool</span>
        <button
          v-if="generating !== part.value + '_gen'"
          class="pool-add"
          :disabled="generating !== null"
          @click.stop="$emit('addToPool')"
          title="Neue Aufgaben generieren"
        >
          +
        </button>
        <span v-else class="pool-spinner">⟳</span>
      </div>
    </div>

    <div v-if="generating === part.value" class="part-generating">
      <div class="generating-spinner" />
      <span>{{ statusMessage }}</span>
    </div>
    <template v-else>
      <button
        class="part-start-btn"
        :class="[`btn-${part.color}`, { 'btn-disabled': generating !== null }]"
        :disabled="generating !== null"
        @click="$emit('launch')"
      >
        <span v-if="generating !== null" class="btn-spinner" />
        <template v-else>
          Prüfung starten
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </template>
      </button>
    </template>

    <p v-if="error" class="part-error">{{ error }}</p>

    <div v-if="warnings?.length" class="part-warnings">
      <div
        v-for="(w, i) in warnings"
        :key="i"
        class="part-warning"
        :class="`warn-${w.source}`"
      >
        <span class="warn-badge">
          <template v-if="w.source === 'server_ai'">↩ Server-KI</template>
          <template v-else-if="w.source === 'fallback'">⚠ Platzhalter</template>
          <template v-else>⚠ Warnung</template>
        </span>
        <span class="warn-text">{{ w.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ExamPartCard — Eine Zeile pro Prüfungsteil mit Pool-Status, Start-Button und
 * Fehler-/Warn-Hinweisen. Rendert sich drei Mal in der HomeView (Teil 1/2/3).
 *
 * Der Warn-Typ ist nicht im zentralen `types/`-Barrel, darum wird hier der
 * Shape inline gespiegelt. Quelle: `usePool.ts` in Composables.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { HomePart } from '../config.js';

export interface PoolWarning {
  source: 'server_ai' | 'fallback' | string;
  message: string;
}

defineProps<{
  part: HomePart;
  label: string;
  poolCount: number | null;
  poolMin: number;
  generating: string | null;
  statusMessage: string;
  error?: string;
  warnings?: readonly PoolWarning[];
}>();

defineEmits<{
  addToPool: [];
  launch: [];
}>();
</script>
