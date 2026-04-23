<template>
  <Teleport to="body">
    <div v-if="modelValue" class="overlay-backdrop" @click.self="$emit('update:modelValue', false)">
      <div class="confirm-dialog">
        <h3 class="dialog-title">{{ title }}</h3>
        <p class="dialog-body">
          <slot />
        </p>
        <div class="dialog-actions">
          <button class="btn-cancel" @click="$emit('update:modelValue', false)">
            {{ cancelLabel }}
          </button>
          <button class="btn-confirm" :class="{ 'btn-danger': danger }" @click="$emit('confirm')">
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: boolean;
  title: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}>(), {
  confirmLabel: 'Bestätigen',
  cancelLabel: 'Abbrechen',
  danger: false,
});

defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [];
}>();
</script>

<style scoped>
.overlay-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
  animation: fade-in 0.15s ease;
}
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

.confirm-dialog {
  background: var(--bg-overlay);
  border: 1px solid var(--control-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  width: 100%;
  max-width: 400px;
}
.dialog-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 10px;
}
.dialog-body {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-muted);
  margin-bottom: 20px;
}
.dialog-actions {
  display: flex;
  gap: 10px;
}
.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 10px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition);
}
.btn-cancel {
  border: 1px solid var(--control-border);
  background: var(--control-bg);
  color: var(--text-muted);
}
.btn-cancel:hover { background: var(--control-bg-hover); }

.btn-confirm {
  border: none;
  background: var(--brand);
  color: white;
}
.btn-confirm:hover { background: var(--brand-dark); }
.btn-confirm.btn-danger { background: var(--danger); }
.btn-confirm.btn-danger:hover { filter: brightness(0.9); }
</style>
