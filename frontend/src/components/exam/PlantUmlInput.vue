<template>
  <div class="plantuml-wrap">
    <div class="uml-tabs">
      <button class="uml-tab" :class="{ active: mode === 'code' }" @click="mode = 'code'">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        PlantUML Code
      </button>
      <button class="uml-tab" :class="{ active: mode === 'upload' }" @click="mode = 'upload'">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Bild hochladen
      </button>
    </div>

    <!-- Code mode -->
    <div v-if="mode === 'code'" class="code-panes">
      <div class="pane">
        <div class="pane-label">PlantUML Code</div>
        <textarea
          :value="codeValue"
          class="code-input"
          :placeholder="PLANTUML_PLACEHOLDER"
          @input="onCodeInput"
          spellcheck="false"
        />
      </div>
      <div class="pane">
        <div class="pane-label">Vorschau</div>
        <div class="preview-box">
          <img v-if="previewUrl" :src="previewUrl" @error="previewUrl = null" alt="PlantUML Vorschau" />
          <div v-else class="preview-empty">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>Vorschau erscheint beim Tippen</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload mode -->
    <FileUploadInput
      v-else
      :file="uploadFile"
      hint="Zeichne dein UML-Diagramm auf Papier, fotografiere es und lade es hier hoch."
      title="UML-Diagramm hochladen"
      @file-selected="onFileSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import FileUploadInput from './FileUploadInput.vue';

const PLANTUML_PLACEHOLDER = `@startuml\n\n' Diagramm hier eingeben\n\n@enduml`;

const props = defineProps<{
  codeValue: string;
  uploadFile: File | null;
}>();

const emit = defineEmits<{
  'update:codeValue': [v: string];
  'update:uploadFile': [f: File | null];
}>();

const mode       = ref<'code' | 'upload'>('code');
const previewUrl = ref<string | null>(null);

// ─── PlantUML encoding (deflate-raw + custom base64) ─────────────────────────

function encode64(data: Uint8Array): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  let result = '';
  for (let i = 0; i < data.length; i += 3) {
    const b0 = data[i], b1 = data[i + 1] ?? 0, b2 = data[i + 2] ?? 0;
    result += chars[(b0 >> 2) & 0x3f];
    result += chars[((b0 & 0x03) << 4) | ((b1 >> 4) & 0x0f)];
    result += chars[((b1 & 0x0f) << 2) | ((b2 >> 6) & 0x03)];
    result += chars[b2 & 0x3f];
  }
  return result;
}

async function encodePlantUml(code: string): Promise<string | null> {
  try {
    const utf8 = new TextEncoder().encode(code);
    const ds = new (window as unknown as { CompressionStream: new (f: string) => TransformStream }).CompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(utf8);
    writer.close();
    const chunks: Uint8Array[] = [];
    const reader = ds.readable.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const compressed = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { compressed.set(c, offset); offset += c.length; }
    return encode64(compressed);
  } catch {
    return null;
  }
}

function onCodeInput(e: Event) {
  const code = (e.target as HTMLTextAreaElement).value;
  emit('update:codeValue', code);
  if (!code.trim()) { previewUrl.value = null; return; }
  encodePlantUml(code).then((encoded) => {
    previewUrl.value = encoded ? `https://www.plantuml.com/plantuml/svg/~1${encoded}` : null;
  });
}

function onFileSelected(file: File) {
  emit('update:uploadFile', file);
}

// Restore preview when re-mounting with existing code
watch(() => props.codeValue, (code) => {
  if (code && mode.value === 'code') {
    encodePlantUml(code).then((encoded) => {
      previewUrl.value = encoded ? `https://www.plantuml.com/plantuml/svg/~1${encoded}` : null;
    });
  }
}, { immediate: true });
</script>

<style scoped>
.plantuml-wrap { display: flex; flex-direction: column; }
.uml-tabs { display: flex; gap: 4px; margin-bottom: 12px; background: var(--control-bg); border-radius: var(--radius-md); padding: 4px; }
.uml-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 12px; border-radius: 7px; border: none; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--text-subtle); background: transparent; transition: all var(--transition); }
.uml-tab.active { background: var(--bg-raised); color: var(--brand-text); box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
.uml-tab:hover:not(.active) { color: var(--text-muted); }
.code-panes { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 600px) { .code-panes { grid-template-columns: 1fr; } }
.pane { display: flex; flex-direction: column; gap: 6px; }
.pane-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-faint); }
.code-input {
  flex: 1; min-height: 240px; padding: 12px; border-radius: var(--radius-md); resize: vertical; outline: none;
  background: #0a0c12; /* code editor: always dark */ border: 1.5px solid var(--control-border); color: var(--text-secondary);
  font-family: var(--font-mono); font-size: 13px; line-height: 1.65; transition: border-color var(--transition);
}
.code-input:focus { border-color: var(--brand); }
.preview-box {
  min-height: 240px; border-radius: var(--radius-md); border: 1.5px solid var(--border);
  background: #f8fafc; /* diagram preview: always white for SVG rendering */ display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.preview-box img { max-width: 100%; max-height: 300px; object-fit: contain; }
.preview-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--text-muted); font-size: 12px; }
</style>
