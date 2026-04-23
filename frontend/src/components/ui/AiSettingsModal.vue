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
  background: var(--bg-raised); border: 1px solid var(--control-border); border-radius: var(--radius-xl);
  width: 100%; max-width: 520px; box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  animation: slide-up 0.2s ease; display: flex; flex-direction: column; max-height: 90vh;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0;
}
.modal-title {
  display: flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 700; color: var(--text-primary);
}
.modal-close {
  width: 32px; height: 32px; border-radius: var(--radius-sm); border: none;
  background: var(--control-bg); color: var(--text-subtle); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all var(--transition);
}
.modal-close:hover { background: var(--control-bg-hover); color: var(--text-primary); }
.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; }
.status-banner {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: var(--radius-md);
  font-size: 12px; font-weight: 500;
  background: var(--success-bg); color: var(--success-text); border: 1px solid var(--success-border);
}
.status-warn { background: var(--warning-bg); color: var(--warning-text); border-color: var(--warning-border); }
.status-date { color: var(--text-faint); margin-left: 2px; }
.field-group { display: flex; flex-direction: column; gap: 8px; }
.field-label {
  font-size: 12px; font-weight: 600; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.06em;
  display: flex; align-items: center; justify-content: space-between;
}
.field-docs-link { font-size: 11px; font-weight: 500; color: var(--brand-text); text-decoration: none; text-transform: none; letter-spacing: 0; }
.field-docs-link:hover { filter: brightness(1.2); }
.field-hint { font-size: 11px; color: var(--text-faint); line-height: 1.6; }
.provider-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
.provider-card {
  padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--border);
  background: var(--control-bg); cursor: pointer; text-align: left;
  display: flex; flex-direction: column; gap: 3px; transition: all var(--transition);
}
.provider-card:hover { border-color: var(--border-hover); background: var(--control-bg-hover); }
.provider-active { border-color: var(--brand) !important; background: var(--brand-bg) !important; }
.provider-name { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.provider-model { font-size: 10px; color: var(--text-faint); }
.key-input-row { display: flex; gap: 8px; }
.key-input {
  flex: 1; padding: 10px 14px; border-radius: var(--radius-md);
  border: 1px solid var(--control-border); background: var(--control-bg);
  color: var(--text-secondary); font-size: 13px; font-family: var(--font-mono);
  outline: none; transition: border-color var(--transition);
}
.key-input::placeholder { color: var(--text-ghost); font-family: inherit; }
.key-input:focus { border-color: var(--brand); }
.key-toggle {
  width: 38px; height: 38px; border-radius: var(--radius-md); border: 1px solid var(--control-border);
  background: var(--control-bg); color: var(--text-subtle); cursor: pointer;
  flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: background var(--transition);
}
.key-toggle:hover { background: var(--control-bg-hover); color: var(--text-primary); }
.model-info {
  display: flex; gap: 12px; flex-wrap: wrap; padding: 10px 14px;
  border-radius: var(--radius-md); background: var(--control-bg); border: 1px solid var(--border-light);
}
.model-row { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text-subtle); }
.model-badge {
  padding: 2px 7px; border-radius: 6px; font-size: 10px; font-weight: 600;
  background: var(--brand-bg); color: var(--brand-text);
}
.feedback-error {
  font-size: 12px; color: var(--danger-text); padding: 8px 12px; border-radius: var(--radius-sm);
  background: var(--danger-bg); border: 1px solid var(--danger-border);
}
.feedback-success {
  font-size: 12px; color: var(--success-text); padding: 8px 12px; border-radius: var(--radius-sm);
  background: var(--success-bg); border: 1px solid var(--success-border);
}
.modal-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px 20px; border-top: 1px solid var(--border-light);
}
.modal-footer-right { display: flex; gap: 8px; margin-left: auto; }
.btn-ghost {
  padding: 9px 16px; border-radius: var(--radius-md); border: 1px solid var(--control-border);
  background: transparent; color: var(--text-muted); font-size: 13px; font-weight: 500; cursor: pointer;
  transition: all var(--transition); display: flex; align-items: center; gap: 6px;
}
.btn-ghost:hover { background: var(--control-bg); color: var(--text-primary); }
.btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-danger { color: var(--danger-text); border-color: var(--danger-border); }
.btn-danger:hover { background: var(--danger-bg) !important; color: var(--danger-text) !important; }
.btn-primary {
  padding: 9px 20px; border-radius: var(--radius-md); border: none;
  background: var(--brand-gradient); color: white;
  font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;
  transition: opacity var(--transition);
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
