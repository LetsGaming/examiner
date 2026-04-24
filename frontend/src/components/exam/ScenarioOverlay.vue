<template>
  <div v-if="modelValue" class="overlay" @click.self="$emit('update:modelValue', false)">
    <div class="overlay-panel">
      <div class="overlay-header">
        <span>Ausgangssituation</span>
        <button @click="$emit('update:modelValue', false)">✕</button>
      </div>
      <div class="overlay-body">
        <h3 class="overlay-company">{{ name }}</h3>
        <p class="overlay-text">
          {{ description ?? `Alle Aufgaben beziehen sich auf: ${name}` }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ScenarioOverlay — Einblendung für das Szenarien-Setup (Firma + Kontext)
 * beim ersten Öffnen einer Session. MD §5.1 — ein Situationsunternehmen
 * pro Prüfung, alle Aufgaben beziehen sich darauf.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

defineProps<{
  modelValue: boolean;
  name?: string;
  description?: string;
}>();

defineEmits<{
  'update:modelValue': [open: boolean];
}>();
</script>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: flex-end; justify-content: center; z-index: 200; padding: 20px; }
@media (min-width: 600px) { .overlay { align-items: center; } }
.overlay-panel { background: var(--bg-overlay); border: 1px solid var(--control-border); border-radius: var(--radius-lg); width: 100%; max-width: 520px; max-height: 80dvh; display: flex; flex-direction: column; overflow: hidden; }
.overlay-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--border-light); font-size: 14px; font-weight: 700; color: var(--text-primary); flex-shrink: 0; }
.overlay-header button { background: none; border: none; color: var(--text-subtle); cursor: pointer; font-size: 18px; line-height: 1; }
.overlay-header button:hover { color: var(--text-primary); }
.overlay-body { padding: 18px; overflow-y: auto; }
.overlay-company { font-size: 14px; font-weight: 700; color: var(--brand-text); margin-bottom: 10px; }
.overlay-text { font-size: 14px; line-height: 1.8; color: var(--text-secondary); }
</style>
