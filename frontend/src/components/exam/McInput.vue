<template>
  <div class="mc-options">
    <div v-if="multi" class="mc-hint">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      Mehrere Antworten können korrekt sein — alle zutreffenden ankreuzen.
    </div>

    <template v-if="options && options.length">
      <label
        v-for="opt in options"
        :key="opt.id"
        class="mc-opt"
        :class="{ selected: isSelected(opt.id) }"
      >
        <input
          v-if="multi"
          type="checkbox"
          :value="opt.id"
          :checked="isSelected(opt.id)"
          @change="onMultiChange(opt.id, ($event.target as HTMLInputElement).checked)"
        />
        <input
          v-else
          type="radio"
          :name="name"
          :value="opt.id"
          :checked="isSelected(opt.id)"
          @change="$emit('update:modelValue', opt.id)"
        />
        <span class="mc-opt-key">{{ opt.id }})</span>
        <span class="mc-opt-text">{{ opt.text }}</span>
        <span v-if="multi" class="mc-check-indicator" :class="{ active: isSelected(opt.id) }">
          <svg v-if="isSelected(opt.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path d="m5 12 5 5L20 7" />
          </svg>
        </span>
      </label>
    </template>
    <div v-else class="mc-empty">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4m0 4h.01" />
      </svg>
      Keine Antwortmöglichkeiten verfügbar — überspringe diese Aufgabe.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { McOption } from "../../types/index.js";

const props = defineProps<{
  options?: McOption[];
  /** Single-select: the selected option ID or null. Multi-select: JSON-stringified array like '["A","C"]'. */
  modelValue: string | null;
  name: string;
  multi?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
}>();

const selectedSet = computed<Set<string>>(() => {
  const raw = (props.modelValue ?? "").trim();
  if (!raw) return new Set();
  if (!props.multi) return new Set([raw]);
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed.map((v) => String(v)));
    } catch {
      /* fall through */
    }
  }
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
});

function isSelected(id: string): boolean {
  return selectedSet.value.has(id);
}

function onMultiChange(id: string, checked: boolean) {
  const next = new Set(selectedSet.value);
  if (checked) next.add(id);
  else next.delete(id);
  const sorted = Array.from(next).sort();
  emit("update:modelValue", sorted.length ? JSON.stringify(sorted) : null);
}
</script>

<style scoped>
.mc-options { display: flex; flex-direction: column; gap: 8px; }
.mc-hint {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-radius: var(--radius-sm);
  background: var(--warning-bg); border: 1px solid var(--warning-border);
  color: var(--warning-text); font-size: 12px; font-weight: 500; align-self: flex-start;
}
.mc-empty {
  display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-radius: var(--radius-md);
  font-size: 13px; color: var(--danger-text); background: var(--danger-bg); border: 1px solid var(--danger-border);
}
.mc-opt {
  display: flex; align-items: flex-start; gap: 12px; padding: 11px 14px; border-radius: var(--radius-md); cursor: pointer;
  border: 1.5px solid var(--border); background: var(--control-bg); transition: all var(--transition);
}
.mc-opt:hover { border-color: var(--border-hover); }
.mc-opt.selected { border-color: var(--brand); background: var(--brand-bg); }
.mc-opt input[type="radio"], .mc-opt input[type="checkbox"] { display: none; }
.mc-opt-key { font-weight: 700; color: var(--text-subtle); min-width: 20px; flex-shrink: 0; }
.mc-opt.selected .mc-opt-key { color: var(--brand-text); }
.mc-opt-text { font-size: 14px; line-height: 1.5; color: var(--text-secondary); flex: 1; }
.mc-check-indicator {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 5px;
  border: 1.5px solid var(--control-border); background: transparent;
  color: white; flex-shrink: 0; transition: all var(--transition);
}
.mc-check-indicator.active { background: var(--brand); border-color: var(--brand); }
</style>
