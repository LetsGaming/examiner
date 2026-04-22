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
  background: #1a1d2e;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
}
.dialog-title {
  font-size: 16px;
  font-weight: 700;
  color: #f0f1f8;
  margin-bottom: 10px;
}
.dialog-body {
  font-size: 13px;
  line-height: 1.6;
  color: #9ca3af;
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
  transition: background 0.15s;
}
.btn-cancel {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #9ca3af;
}
.btn-cancel:hover { background: rgba(255, 255, 255, 0.1); }

.btn-confirm {
  border: none;
  background: #4f46e5;
  color: white;
}
.btn-confirm:hover { background: #4338ca; }
.btn-confirm.btn-danger { background: #dc2626; }
.btn-confirm.btn-danger:hover { background: #b91c1c; }
</style>
