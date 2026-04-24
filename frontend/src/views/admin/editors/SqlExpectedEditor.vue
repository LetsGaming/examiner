<template>
  <div class="sql-editor">
    <div class="editor-heading-row">
      <span class="editor-heading">SQL-Musterlösung</span>
    </div>
    <p class="editor-hint">
      Die Musterlösung wird der KI als Referenz gegeben. Andere syntaktisch/semantisch
      korrekte Lösungen werden ebenso als richtig bewertet. MD §6.1.
    </p>

    <div class="field-group">
      <label class="field-label">SOLUTION SQL</label>
      <textarea
        :value="solutionSql"
        class="field-textarea field-textarea--code"
        rows="5"
        placeholder="SELECT kundenNr, COUNT(*) FROM bestellung GROUP BY kundenNr HAVING COUNT(*) > 5;"
        @input="emit('update:solutionSql', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <KeyPointsEditor :points="keyPoints" @update:points="emit('update:keyPoints', $event)" />
  </div>
</template>

<script setup lang="ts">
/**
 * SqlExpectedEditor — zwei Felder: SQL-Musterlösung + Key-Points für die KI-
 * Bewertung (Aspekte wie "Filterung korrekt", "GROUP BY gesetzt" etc.).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import KeyPointsEditor from './KeyPointsEditor.vue';

defineProps<{
  solutionSql: string;
  keyPoints: string[];
}>();

const emit = defineEmits<{
  'update:solutionSql': [value: string];
  'update:keyPoints': [value: string[]];
}>();
</script>

<style scoped>
.sql-editor { display: flex; flex-direction: column; gap: 14px; }
.editor-heading-row { display: flex; justify-content: space-between; }
.editor-heading { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); }
.editor-hint { font-size: 11px; color: var(--text-faint); line-height: 1.5; margin: 0; }
</style>
