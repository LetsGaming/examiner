<template>
  <div class="upload-area">
    <div v-if="hint" class="upload-hint">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      {{ hint }}
    </div>
    <div
      class="upload-zone"
      :class="{ 'has-file': !!file }"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <template v-if="previewUrl">
        <img :src="previewUrl" class="preview-img" />
        <button class="replace-btn" @click="triggerInput">Bild ersetzen</button>
      </template>
      <template v-else>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="upload-icon">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p class="upload-title">{{ title }}</p>
        <p class="upload-sub">PNG oder JPG · Drag &amp; Drop oder</p>
        <button class="upload-btn" @click="triggerInput">Datei auswählen</button>
      </template>
    </div>
    <input ref="inputRef" type="file" accept="image/*" style="display:none" @change="onInputChange" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  file: File | null;
  hint?: string;
  title?: string;
}>();

const emit = defineEmits<{ 'file-selected': [file: File] }>();

const inputRef   = ref<HTMLInputElement | null>(null);
const previewUrl = ref<string | null>(null);

watch(() => props.file, (f) => {
  previewUrl.value = f ? URL.createObjectURL(f) : null;
}, { immediate: true });

function triggerInput() { inputRef.value?.click(); }

function onInputChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) { emit('file-selected', file); }
  if (inputRef.value) inputRef.value.value = '';
}

function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files[0];
  if (file) emit('file-selected', file);
}
</script>

<style scoped>
.upload-area { display: flex; flex-direction: column; gap: 10px; }
.upload-hint { display: flex; align-items: center; gap: 7px; background: var(--brand-bg); border-radius: var(--radius-sm); padding: 9px 12px; font-size: 12px; color: var(--brand-text); }
.upload-zone {
  border: 2px dashed var(--border); border-radius: var(--radius-md); min-height: 160px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 24px; text-align: center; transition: border-color var(--transition);
}
.upload-zone:hover, .upload-zone.has-file { border-color: var(--brand); }
.upload-icon { color: var(--text-faint); }
.upload-title { font-size: 14px; font-weight: 600; color: var(--text-secondary); }
.upload-sub { font-size: 12px; color: var(--text-faint); }
.upload-btn {
  background: var(--brand); color: white; border: none; border-radius: var(--radius-sm); padding: 9px 18px;
  font-size: 13px; font-weight: 600; cursor: pointer; margin-top: 4px; transition: background var(--transition);
}
.upload-btn:hover { background: var(--brand-dark); }
.preview-img { max-width: 100%; max-height: 260px; border-radius: var(--radius-sm); object-fit: contain; }
.replace-btn {
  background: var(--control-bg); border: 1px solid var(--control-border);
  border-radius: 7px; padding: 6px 14px; font-size: 12px; color: var(--text-muted); cursor: pointer; margin-top: 6px;
}
</style>
