<template>
  <div class="type-selector">
    <div class="field-group">
      <label class="field-label">AUFGABEN-TYP</label>
      <select :value="taskType" class="field-select" @change="onTypeChange">
        <option v-for="opt in TASK_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <p class="field-hint">{{ hintForType(taskType) }}</p>
    </div>

    <!-- Diagramm-Typ nur relevant bei plantuml/diagram_upload -->
    <div v-if="taskType === 'plantuml' || taskType === 'diagram_upload'" class="field-group">
      <label class="field-label">DIAGRAMM-ART</label>
      <select
        :value="diagramType ?? ''"
        class="field-select"
        @change="onDiagramChange"
      >
        <option value="">— bitte wählen —</option>
        <option v-for="dt in DIAGRAM_TYPE_OPTIONS" :key="dt.value" :value="dt.value">
          {{ dt.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * TypeSelector — Wählt den Aufgaben-Typ und (wenn relevant) den Diagramm-Typ.
 *
 * Ein Type-Wechsel emittiert sowohl `update:taskType` als auch ggf. ein
 * Reset-Signal, damit der Parent abhängige Felder (mc_options, table_config,
 * diagram_type) passend zurücksetzt. Sonst würden Leichen aus dem alten Typ
 * im DB-Record bleiben.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { DiagramType, TaskType } from '../../../types/index.js';

interface TypeOption {
  value: TaskType;
  label: string;
  hint: string;
}

const TASK_TYPE_OPTIONS: readonly TypeOption[] = [
  { value: 'freitext', label: 'Freitext', hint: 'Offene Antwort, wird von der KI bewertet.' },
  { value: 'pseudocode', label: 'Pseudocode / Algorithmus', hint: 'Code-artige Antwort.' },
  { value: 'sql', label: 'SQL', hint: 'SQL-Statement als Antwort.' },
  { value: 'mc', label: 'Multiple Choice (eine Antwort)', hint: 'Genau eine Option ist korrekt.' },
  { value: 'mc_multi', label: 'Multiple Choice (mehrere Antworten)', hint: 'Mehrere Optionen können korrekt sein. MD §5.3: WiSo hat genau 2 korrekt von 5.' },
  { value: 'plantuml', label: 'Diagramm (PlantUML)', hint: 'PlantUML-Code, wird als Diagramm gerendert.' },
  { value: 'diagram_upload', label: 'Diagramm (Upload)', hint: 'User lädt Bild/PDF hoch, KI analysiert.' },
  { value: 'table', label: 'Tabelle', hint: 'Strukturierte Tabellen-Antwort mit festen Spalten.' },
] as const;

const DIAGRAM_TYPE_OPTIONS: readonly { value: DiagramType; label: string }[] = [
  { value: 'uml_class', label: 'UML Klassendiagramm' },
  { value: 'uml_sequence', label: 'UML Sequenzdiagramm' },
  { value: 'uml_use_case', label: 'UML Anwendungsfall' },
  { value: 'uml_activity', label: 'UML Aktivitätsdiagramm' },
  { value: 'uml_state', label: 'UML Zustandsdiagramm' },
  { value: 'er', label: 'Entity-Relationship (ER)' },
] as const;

const props = defineProps<{
  taskType: TaskType;
  diagramType?: DiagramType | null;
}>();

const emit = defineEmits<{
  'update:taskType': [value: TaskType];
  'update:diagramType': [value: DiagramType | null];
  typeChanged: [newType: TaskType, oldType: TaskType];
}>();

function onTypeChange(ev: Event): void {
  const next = (ev.target as HTMLSelectElement).value as TaskType;
  const previous = props.taskType;
  if (next === previous) return;
  emit('update:taskType', next);
  emit('typeChanged', next, previous);
}

function onDiagramChange(ev: Event): void {
  const value = (ev.target as HTMLSelectElement).value;
  emit('update:diagramType', value ? (value as DiagramType) : null);
}

function hintForType(t: TaskType): string {
  return TASK_TYPE_OPTIONS.find((o) => o.value === t)?.hint ?? '';
}
</script>

<style scoped>
.type-selector {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.field-hint {
  font-size: 11px;
  color: var(--text-faint);
  margin-top: 4px;
  line-height: 1.5;
}
</style>
