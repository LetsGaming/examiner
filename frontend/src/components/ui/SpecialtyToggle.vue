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
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.specialty-btn {
  padding: 7px 20px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: background 0.15s, color 0.15s;
}
.specialty-btn:hover:not(.active) {
  color: #9ca3af;
  background: rgba(255, 255, 255, 0.05);
}
.specialty-btn.active {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.35);
}
</style>
