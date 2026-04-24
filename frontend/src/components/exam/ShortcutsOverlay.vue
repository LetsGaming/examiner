<template>
  <Teleport to="body">
    <div v-if="modelValue" class="shortcut-overlay" @click.self="$emit('update:modelValue', false)">
      <div class="shortcut-panel">
        <div class="shortcut-header">
          <span>Tastaturkürzel</span>
          <button @click="$emit('update:modelValue', false)">✕</button>
        </div>
        <table class="shortcut-table">
          <tr><td><kbd>→</kbd></td><td>Nächste Teilaufgabe</td></tr>
          <tr><td><kbd>←</kbd></td><td>Vorherige Teilaufgabe</td></tr>
          <tr><td><kbd>Ctrl+M</kbd></td><td>Markieren / Entmarkieren</td></tr>
          <tr><td><kbd>Esc</kbd></td><td>Sidebar schließen</td></tr>
          <tr><td><kbd>?</kbd></td><td>Diese Übersicht</td></tr>
        </table>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * ShortcutsOverlay — Help-Overlay mit Auflistung der aktiven Tastaturkürzel.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

defineProps<{
  modelValue: boolean;
}>();

defineEmits<{
  'update:modelValue': [open: boolean];
}>();
</script>

<style scoped>
.shortcut-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; display: flex; align-items: center; justify-content: center; }
.shortcut-panel { background: var(--bg-overlay); border: 1px solid var(--control-border); border-radius: var(--radius-lg); padding: 24px; min-width: 300px; }
.shortcut-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-weight: 700; font-size: 15px; color: var(--text-primary); }
.shortcut-header button { background: none; border: none; color: var(--text-subtle); cursor: pointer; font-size: 16px; }
.shortcut-table { width: 100%; border-collapse: collapse; }
.shortcut-table tr td { padding: 6px 8px; font-size: 13px; color: var(--text-secondary); }
.shortcut-table tr td:first-child { width: 110px; }
kbd { display: inline-block; padding: 2px 8px; background: var(--control-bg); border: 1px solid var(--control-border); border-radius: 5px; font-family: monospace; font-size: 12px; color: var(--text-primary); }
</style>
