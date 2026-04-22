<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="modal-backdrop"
      @click.self="$emit('update:modelValue', false)"
    >
      <div class="modal" role="dialog" aria-modal="true" aria-label="KI-Einstellungen">
        <!-- Header -->
        <div class="modal-header">
          <div class="modal-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            KI-Einstellungen
          </div>
          <button class="modal-close" @click="$emit('update:modelValue', false)" aria-label="Schließen">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <!-- Status banner -->
          <div class="status-banner" :class="settings.keySource === 'none' ? 'status-warn' : 'status-ok'">
            <template v-if="settings.keySource === 'user'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Eigener API-Key gespeichert
              <span v-if="settings.updatedAt" class="status-date">· gespeichert {{ formatDate(settings.updatedAt) }}</span>
            </template>
            <template v-else-if="settings.keySource === 'env'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Server-Key aktiv ({{ settings.provider }})
            </template>
            <template v-else>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Kein API-Key konfiguriert
            </template>
          </div>

          <!-- Provider selector -->
          <div class="field-group">
            <label class="field-label">KI-Anbieter</label>
            <div class="provider-grid">
              <button
                v-for="p in settings.providers"
                :key="p.id"
                class="provider-card"
                :class="{ 'provider-active': form.provider === p.id }"
                @click="$emit('select-provider', p)"
              >
                <span class="provider-name">{{ p.label }}</span>
                <span class="provider-model">{{ p.textModel }}</span>
              </button>
            </div>
          </div>

          <!-- API Key input -->
          <div class="field-group">
            <label class="field-label">
              API-Key
              <a v-if="selectedProvider" :href="selectedProvider.docsUrl" target="_blank" rel="noopener" class="field-docs-link">Key erstellen ↗</a>
            </label>
            <div class="key-input-row">
              <input
                v-model="form.apiKey"
                :type="showKey ? 'text' : 'password'"
                class="key-input"
                :placeholder="settings.keySource === 'user' ? '•••••••••••••••••• (gespeichert)' : (selectedProvider?.keyHint ?? 'API-Key eingeben…')"
                autocomplete="off"
                spellcheck="false"
              />
              <button class="key-toggle" @click="$emit('toggle-key')" :title="showKey ? 'Verbergen' : 'Anzeigen'">
                <svg v-if="!showKey" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
            <p class="field-hint">Der Key wird AES-256-verschlüsselt auf dem Server gespeichert und ausschließlich für KI-Anfragen verwendet.</p>
          </div>

          <!-- Model info -->
          <div v-if="selectedProvider" class="model-info">
            <div class="model-row"><span class="model-badge">Text</span><span>{{ selectedProvider.textModel }}</span></div>
            <div class="model-row"><span class="model-badge">Vision</span><span>{{ selectedProvider.visionModel }}</span></div>
          </div>

          <p v-if="error" class="feedback-error">{{ error }}</p>
          <p v-if="success" class="feedback-success">{{ success }}</p>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button v-if="settings.keySource === 'user'" class="btn-ghost btn-danger" :disabled="saving" @click="$emit('delete-key')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
            Key löschen
          </button>
          <div class="modal-footer-right">
            <button class="btn-ghost" @click="$emit('update:modelValue', false)">Abbrechen</button>
            <button class="btn-primary" :disabled="saving" @click="$emit('save')">
              <span v-if="saving" class="btn-spinner" />
              <template v-else>Speichern</template>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { AiSettings, ProviderInfo } from '../../types/index.js';

defineProps<{
  modelValue: boolean;
  settings: AiSettings;
  form: { provider: string; apiKey: string };
  selectedProvider: ProviderInfo | null;
  showKey: boolean;
  saving: boolean;
  error: string;
  success: string;
}>();

defineEmits<{
  'update:modelValue': [value: boolean];
  'toggle-key': [];
  'save': [];
  'delete-key': [];
  'select-provider': [p: ProviderInfo];
}>();

function formatDate(iso: string): string {
  try {
    return new Date(iso + 'Z').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return iso; }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.65); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
  animation: fade-in 0.15s ease;
}
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }

.modal {
  background: #16181f; border: 1px solid rgba(255,255,255,0.1); border-radius: 18px;
  width: 100%; max-width: 520px; box-shadow: 0 24px 64px rgba(0,0,0,0.6);
  animation: slide-up 0.2s ease; display: flex; flex-direction: column; max-height: 90vh;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0;
}
.modal-title {
  display: flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 700; color: #f0f1f8;
}
.modal-close {
  width: 32px; height: 32px; border-radius: 8px; border: none;
  background: rgba(255,255,255,0.06); color: #6b7280; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.modal-close:hover { background: rgba(255,255,255,0.1); color: #e8eaf0; }
.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; }
.status-banner {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px;
  font-size: 12px; font-weight: 500;
  background: rgba(34,197,94,0.08); color: #86efac; border: 1px solid rgba(34,197,94,0.2);
}
.status-warn { background: rgba(245,158,11,0.07); color: #fbbf24; border-color: rgba(245,158,11,0.2); }
.status-date { color: #4b5563; margin-left: 2px; }
.field-group { display: flex; flex-direction: column; gap: 8px; }
.field-label {
  font-size: 12px; font-weight: 600; color: #9ca3af;
  text-transform: uppercase; letter-spacing: 0.06em;
  display: flex; align-items: center; justify-content: space-between;
}
.field-docs-link { font-size: 11px; font-weight: 500; color: #6366f1; text-decoration: none; text-transform: none; letter-spacing: 0; }
.field-docs-link:hover { color: #818cf8; }
.field-hint { font-size: 11px; color: #4b5563; line-height: 1.6; }
.provider-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
.provider-card {
  padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03); cursor: pointer; text-align: left;
  display: flex; flex-direction: column; gap: 3px; transition: all 0.15s;
}
.provider-card:hover { border-color: rgba(255,255,255,0.16); background: rgba(255,255,255,0.06); }
.provider-active { border-color: #6366f1 !important; background: rgba(99,102,241,0.12) !important; }
.provider-name { font-size: 13px; font-weight: 600; color: #e8eaf0; }
.provider-model { font-size: 10px; color: #4b5563; }
.key-input-row { display: flex; gap: 8px; }
.key-input {
  flex: 1; padding: 10px 14px; border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
  color: #e8eaf0; font-size: 13px; font-family: 'JetBrains Mono', 'Fira Code', monospace;
  outline: none; transition: border-color 0.15s;
}
.key-input::placeholder { color: #374151; font-family: inherit; }
.key-input:focus { border-color: rgba(99,102,241,0.6); }
.key-toggle {
  width: 38px; height: 38px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04); color: #6b7280; cursor: pointer;
  flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: background 0.15s;
}
.key-toggle:hover { background: rgba(255,255,255,0.08); color: #e8eaf0; }
.model-info {
  display: flex; gap: 12px; flex-wrap: wrap; padding: 10px 14px;
  border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
}
.model-row { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #6b7280; }
.model-badge {
  padding: 2px 7px; border-radius: 6px; font-size: 10px; font-weight: 600;
  background: rgba(99,102,241,0.15); color: #a5b4fc;
}
.feedback-error {
  font-size: 12px; color: #f87171; padding: 8px 12px; border-radius: 8px;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
}
.feedback-success {
  font-size: 12px; color: #86efac; padding: 8px 12px; border-radius: 8px;
  background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2);
}
.modal-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px 20px; border-top: 1px solid rgba(255,255,255,0.06);
}
.modal-footer-right { display: flex; gap: 8px; margin-left: auto; }
.btn-ghost {
  padding: 9px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
  background: transparent; color: #9ca3af; font-size: 13px; font-weight: 500; cursor: pointer;
  transition: all 0.15s; display: flex; align-items: center; gap: 6px;
}
.btn-ghost:hover { background: rgba(255,255,255,0.06); color: #e8eaf0; }
.btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-danger { color: #f87171; border-color: rgba(239,68,68,0.25); }
.btn-danger:hover { background: rgba(239,68,68,0.1) !important; color: #fca5a5 !important; }
.btn-primary {
  padding: 9px 20px; border-radius: 10px; border: none;
  background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white;
  font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;
  transition: opacity 0.15s;
}
.btn-primary:hover:not(:disabled) { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-spinner {
  width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,0.35); border-top-color: white;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
