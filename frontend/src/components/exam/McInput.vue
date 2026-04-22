<template>
  <div class="mc-options">
    <template v-if="options && options.length">
      <label
        v-for="opt in options"
        :key="opt.id"
        class="mc-opt"
        :class="{ selected: modelValue === opt.id }"
      >
        <input type="radio" :name="name" :value="opt.id" :checked="modelValue === opt.id" @change="$emit('update:modelValue', opt.id)" />
        <span class="mc-opt-key">{{ opt.id }})</span>
        <span class="mc-opt-text">{{ opt.text }}</span>
      </label>
    </template>
    <div v-else class="mc-empty">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
      Keine Antwortmöglichkeiten verfügbar — überspringe diese Aufgabe.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { McOption } from '../../types/index.js';

defineProps<{ options?: McOption[]; modelValue: string | null; name: string }>();
defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<style scoped>
.mc-options { display: flex; flex-direction: column; gap: 8px; }
.mc-empty {
  display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-radius: 10px;
  font-size: 13px; color: #f87171; background: rgba(248, 113, 113, 0.08); border: 1px solid rgba(248, 113, 113, 0.2);
}
.mc-opt {
  display: flex; align-items: flex-start; gap: 12px; padding: 11px 14px; border-radius: 10px; cursor: pointer;
  border: 1.5px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.03); transition: all 0.12s;
}
.mc-opt.selected { border-color: #4f46e5; background: rgba(79, 70, 229, 0.12); }
.mc-opt input[type="radio"] { display: none; }
.mc-opt-key { font-weight: 700; color: #6b7280; min-width: 20px; flex-shrink: 0; }
.mc-opt.selected .mc-opt-key { color: #818cf8; }
.mc-opt-text { font-size: 14px; line-height: 1.5; color: #d1d5db; }
</style>
