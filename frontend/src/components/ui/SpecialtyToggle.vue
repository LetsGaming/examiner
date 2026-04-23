<template>
  <div class="specialty-toggle">
    <button
      class="specialty-btn"
      :class="{ active: modelValue === 'fiae' }"
      @click="$emit('update:modelValue', 'fiae')"
    >
      FIAE
    </button>
    <button
      class="specialty-btn"
      :class="{ active: modelValue === 'fisi' }"
      @click="$emit('update:modelValue', 'fisi')"
    >
      FISI
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Specialty } from '../../types/index.js';

defineProps<{ modelValue: Specialty }>();
defineEmits<{ 'update:modelValue': [value: Specialty] }>();
</script>

<style scoped>
.specialty-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: var(--control-bg);
  border: 1px solid var(--border);
}
.specialty-btn {
  padding: 7px 20px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-subtle);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: background var(--transition), color var(--transition);
}
.specialty-btn:hover:not(.active) {
  color: var(--text-muted);
  background: var(--control-bg-hover);
}
.specialty-btn.active {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.35);
}
</style>
