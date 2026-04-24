<template>
  <div class="keypoints-editor">
    <div class="editor-heading-row">
      <span class="editor-heading">Musterpunkte (Key Points)</span>
      <span class="points-count">{{ points.length }}</span>
    </div>
    <p class="editor-hint">
      Inhalts-Aspekte, die in einer vollständigen Musterlösung vorkommen sollten.
      Die KI prüft Antworten gegen diese Liste. Bei Aufzählungsaufgaben ("Nennen
      Sie 3…") ist die Reihenfolge egal, MD §6.1.
    </p>

    <div class="points-list">
      <div v-for="(pt, i) in points" :key="i" class="point-row">
        <span class="pt-index mono">{{ i + 1 }}</span>
        <textarea
          :value="pt"
          class="field-textarea point-text"
          rows="2"
          placeholder="z.B. Transaktion erlaubt atomare Datenänderung"
          @input="updatePoint(i, ($event.target as HTMLTextAreaElement).value)"
        />
        <button class="icon-btn-danger" @click="removePoint(i)">×</button>
      </div>
    </div>

    <button class="btn-ghost btn-sm" @click="addPoint">+ Musterpunkt</button>
  </div>
</template>

<script setup lang="ts">
/**
 * KeyPointsEditor — Shared-Component für die `keyPoints`-Liste, die bei
 * freitext / pseudocode / sql / plantuml / diagram_upload in `expected_answer`
 * steckt und der KI-Bewertung als Musterinhalt dient.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

const props = defineProps<{
  points: string[];
}>();

const emit = defineEmits<{
  'update:points': [value: string[]];
}>();

function addPoint(): void {
  emit('update:points', [...props.points, '']);
}

function removePoint(index: number): void {
  emit(
    'update:points',
    props.points.filter((_, i) => i !== index),
  );
}

function updatePoint(index: number, value: string): void {
  emit(
    'update:points',
    props.points.map((p, i) => (i === index ? value : p)),
  );
}
</script>

<style scoped>
.keypoints-editor { display: flex; flex-direction: column; gap: 10px; }
.editor-heading-row { display: flex; justify-content: space-between; align-items: baseline; }
.editor-heading { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); }
.points-count { font-size: 11px; color: var(--text-faint); }
.editor-hint { font-size: 11px; color: var(--text-faint); line-height: 1.5; margin: 0; }
.points-list { display: flex; flex-direction: column; gap: 8px; }
.point-row { display: flex; align-items: flex-start; gap: 8px; }
.pt-index { min-width: 22px; color: var(--text-faint); font-size: 12px; padding-top: 8px; }
.point-text { flex: 1; font-family: inherit; }
.icon-btn-danger { background: transparent; border: 1px solid var(--danger-border); color: var(--danger-text); border-radius: 6px; width: 26px; height: 26px; font-size: 16px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4px; }
.icon-btn-danger:hover { background: var(--danger-bg); }
</style>
