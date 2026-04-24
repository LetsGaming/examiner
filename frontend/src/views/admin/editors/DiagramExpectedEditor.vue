<template>
  <div class="diagram-editor">
    <div class="editor-heading-row">
      <span class="editor-heading">Erwartete Elemente</span>
      <span class="elements-count">{{ elements.length }}</span>
    </div>
    <p class="editor-hint">
      Jedes Element ist ein Freitext-Stichwort, auf das die KI-Bewertung prüft
      (z.B. Klassennamen, Beziehungen, Zustände). Reihenfolge spielt keine Rolle.
      MD §6.1: granulare Bewertung pro Element.
    </p>

    <div class="elements-list">
      <div v-for="(el, i) in elements" :key="i" class="element-row">
        <span class="el-index mono">{{ i + 1 }}</span>
        <input
          :value="el"
          class="field-input"
          placeholder="z.B. Klasse Kunde mit Attribut kundenNr"
          @input="updateElement(i, ($event.target as HTMLInputElement).value)"
        />
        <button class="icon-btn-danger" @click="removeElement(i)">×</button>
      </div>
    </div>

    <button class="btn-ghost btn-sm" @click="addElement">+ Element</button>
  </div>
</template>

<script setup lang="ts">
/**
 * DiagramExpectedEditor — Editor für `expected_elements` bei Diagramm-Tasks.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

const props = defineProps<{
  elements: string[];
}>();

const emit = defineEmits<{
  'update:elements': [value: string[]];
}>();

function addElement(): void {
  emit('update:elements', [...props.elements, '']);
}

function removeElement(index: number): void {
  emit(
    'update:elements',
    props.elements.filter((_, i) => i !== index),
  );
}

function updateElement(index: number, value: string): void {
  emit(
    'update:elements',
    props.elements.map((e, i) => (i === index ? value : e)),
  );
}
</script>

<style scoped>
.diagram-editor { display: flex; flex-direction: column; gap: 10px; }
.editor-heading-row { display: flex; justify-content: space-between; align-items: baseline; }
.editor-heading { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); }
.elements-count { font-size: 11px; color: var(--text-faint); }
.editor-hint { font-size: 11px; color: var(--text-faint); line-height: 1.5; margin: 0; }
.elements-list { display: flex; flex-direction: column; gap: 6px; }
.element-row { display: flex; align-items: center; gap: 8px; }
.el-index { min-width: 22px; color: var(--text-faint); font-size: 12px; }
.icon-btn-danger { background: transparent; border: 1px solid var(--danger-border); color: var(--danger-text); border-radius: 6px; width: 26px; height: 26px; font-size: 16px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.icon-btn-danger:hover { background: var(--danger-bg); }
</style>
