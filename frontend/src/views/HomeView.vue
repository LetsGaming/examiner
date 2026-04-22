<template>
  <ion-page>
    <div class="home-page">
      <!-- Header -->
      <header class="home-header">
        <AppLogo :title="specialty === 'fisi' ? 'FISI Trainer' : 'FIAE Trainer'" />

        <div class="header-center">
          <SpecialtyToggle v-model="specialty" @update:model-value="onSpecialtyChange" />
        </div>

        <div class="header-right">
          <div v-if="user" class="user-badge">
            <span class="user-avatar">{{ user.displayName.charAt(0).toUpperCase() }}</span>
            <span class="user-name">{{ user.displayName }}</span>
            <button class="icon-btn" @click="logout" title="Abmelden">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
          <button class="settings-btn" @click="aiSettings.open()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            KI-Einstellungen
            <span class="key-badge" :class="keyBadgeClass">{{ keyBadgeLabel }}</span>
          </button>
        </div>
      </header>

      <!-- Main -->
      <main class="home-main">
        <div class="home-grid">
          <!-- Intro -->
          <div class="home-intro">
            <h1 class="intro-headline">Prüfungs&shy;vorbereitung</h1>
            <p class="intro-text">
              <template v-if="specialty === 'fisi'">
                Realitätsnahe IHK AP2-Prüfungen für <strong>Fachinformatiker Systemintegration</strong>
                mit KI-generierten Aufgaben zu Netzwerktechnik, Serverinfrastruktur und IT-Sicherheit.
              </template>
              <template v-else>
                Realitätsnahe IHK AP2-Prüfungen für <strong>Fachinformatiker Anwendungsentwicklung</strong>
                mit KI-generierten Aufgaben, automatischer Bewertung und detailliertem Feedback.
              </template>
            </p>
            <div class="intro-badges">
              <span class="badge badge-specialty">{{ specialty.toUpperCase() }}</span>
              <span class="badge">KI-generiert</span>
              <span class="badge">IHK-konform</span>
              <span class="badge">Sofort-Feedback</span>
            </div>

            <div v-if="aiSettings.settings.value.hasKey" class="ai-indicator">
              <span class="ai-dot" />
              <span class="ai-label">{{ aiSettings.currentProviderLabel.value }}</span>
              <span class="ai-model">{{ aiSettings.currentProviderModel.value }}</span>
            </div>
            <div v-else class="ai-indicator ai-indicator-warn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Kein API-Key —
              <button class="ai-indicator-link" @click="aiSettings.open()">Jetzt einrichten</button>
            </div>
          </div>

          <!-- Parts list -->
          <div class="parts-list">
            <div v-for="p in parts" :key="p.value" class="part-row">
              <div class="part-info">
                <div class="part-number">{{ p.number }}</div>
                <div class="part-details">
                  <div class="part-name">{{ specialtyPartLabel(p.value) }}</div>
                  <div class="part-meta">{{ p.duration }} Min · {{ p.points }} Punkte · {{ p.taskCount }} Aufgaben</div>
                </div>
                <div class="part-pool" :class="(pool.status.value[p.value] ?? 0) >= POOL_MIN ? 'pool-ok' : 'pool-low'">
                  <span class="pool-dot" />
                  <span>{{ pool.status.value[p.value] ?? '…' }} im Pool</span>
                  <button
                    v-if="pool.generating.value !== p.value + '_gen'"
                    class="pool-add"
                    :disabled="pool.generating.value !== null"
                    @click.stop="pool.addToPool(p.value, specialty)"
                    title="Neue Aufgaben generieren"
                  >+</button>
                  <span v-else class="pool-spinner">⟳</span>
                </div>
              </div>

              <div v-if="pool.generating.value === p.value" class="part-generating">
                <div class="generating-spinner" />
                <span>{{ pool.statusMessage.value }}</span>
              </div>
              <template v-else>
                <button
                  class="part-start-btn"
                  :class="[`btn-${p.color}`, { 'btn-disabled': pool.generating.value !== null }]"
                  :disabled="pool.generating.value !== null"
                  @click="launch(p.value)"
                >
                  <span v-if="pool.generating.value !== null" class="btn-spinner" />
                  <template v-else>
                    Prüfung starten
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
                  </template>
                </button>
              </template>

              <p v-if="pool.errors.value[p.value]" class="part-error">{{ pool.errors.value[p.value] }}</p>

              <div v-if="pool.warnings.value[p.value]?.length" class="part-warnings">
                <div
                  v-for="(w, i) in pool.warnings.value[p.value]"
                  :key="i"
                  class="part-warning"
                  :class="`warn-${w.source}`"
                >
                  <span class="warn-badge">
                    <template v-if="w.source === 'server_ai'">↩ Server-KI</template>
                    <template v-else-if="w.source === 'fallback'">⚠ Platzhalter</template>
                    <template v-else>⚠ Warnung</template>
                  </span>
                  <span class="warn-text">{{ w.message }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- AI Settings Modal -->
    <AiSettingsModal
      v-model="aiSettings.showModal.value"
      :settings="aiSettings.settings.value"
      :form="aiSettings.form.value"
      :selected-provider="aiSettings.selectedProvider.value"
      :show-key="aiSettings.showKey.value"
      :saving="aiSettings.saving.value"
      :error="aiSettings.error.value"
      :success="aiSettings.success.value"
      @toggle-key="aiSettings.showKey.value = !aiSettings.showKey.value"
      @save="aiSettings.save()"
      @delete-key="aiSettings.removeKey()"
      @select-provider="aiSettings.selectProvider($event)"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage } from '@ionic/vue';
import { useAuth } from '../composables/useAuth.js';
import { useSpecialty } from '../composables/useSpecialty.js';
import { useAiSettings } from '../composables/useAiSettings.js';
import { usePool, POOL_MIN } from '../composables/usePool.js';
import AppLogo from '../components/ui/AppLogo.vue';
import SpecialtyToggle from '../components/ui/SpecialtyToggle.vue';
import AiSettingsModal from '../components/ui/AiSettingsModal.vue';
import type { ExamPart } from '../types/index.js';

const PARTS_FISI_LABELS: Record<string, string> = {
  teil_1: 'Konzeption und Administration von IT-Systemen',
  teil_2: 'Betrieb und Verwaltung von Netzwerken',
};

const parts = [
  { value: 'teil_1' as ExamPart, number: '1', label: 'Planen eines Softwareproduktes',            color: 'blue',   duration: 90, points: 100, taskCount: 4 },
  { value: 'teil_2' as ExamPart, number: '2', label: 'Entwicklung und Umsetzung von Algorithmen', color: 'purple', duration: 90, points: 100, taskCount: 4 },
  { value: 'teil_3' as ExamPart, number: '3', label: 'Wirtschafts- und Sozialkunde',              color: 'teal',   duration: 60, points: 100, taskCount: 8 },
];

const router = useRouter();
const { user, logout } = useAuth();
const { specialty } = useSpecialty();
const aiSettings = useAiSettings();
const pool = usePool();

function specialtyPartLabel(part: string): string {
  if (specialty.value === 'fisi' && PARTS_FISI_LABELS[part]) return PARTS_FISI_LABELS[part];
  return parts.find((p) => p.value === part)?.label ?? part;
}

const keyBadgeLabel = computed(() => {
  const s = aiSettings.settings.value.keySource;
  if (s === 'user') return 'Eigener Key';
  if (s === 'env')  return 'Server-Key';
  return 'Kein Key';
});

const keyBadgeClass = computed(() => {
  const s = aiSettings.settings.value.keySource;
  if (s === 'user') return 'badge-key-user';
  if (s === 'env')  return 'badge-key-env';
  return 'badge-key-missing';
});

function onSpecialtyChange() {
  pool.loadStatus(specialty.value);
}

async function launch(part: ExamPart) {
  try {
    const sessionId = await pool.launchExam(part, specialty.value);
    router.push(`/session/${sessionId}`);
  } catch {
    // error already stored in pool.errors
  }
}

onMounted(async () => {
  await Promise.all([pool.loadStatus(specialty.value), aiSettings.load()]);
});
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #0f1117;
  color: #e8eaf0;
  font-family: 'Inter', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
}

/* ─── Header ─── */
.home-header {
  padding: 20px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.header-center { flex: 1; display: flex; justify-content: center; }
.header-right  { display: flex; align-items: center; gap: 10px; }

.user-badge {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px 6px 6px; border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03); font-size: 13px; color: #9ca3af;
}
.user-avatar {
  width: 26px; height: 26px; border-radius: 7px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: white; flex-shrink: 0;
}
.user-name { font-weight: 500; color: #c4c9d8; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.icon-btn {
  width: 24px; height: 24px; border-radius: 6px; border: none;
  background: rgba(255, 255, 255, 0.06); color: #6b7280; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.icon-btn:hover { background: rgba(239, 68, 68, 0.15); color: #f87171; }

.settings-btn {
  display: flex; align-items: center; gap: 8px; padding: 8px 14px;
  border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04); color: #9ca3af; font-size: 13px;
  font-weight: 500; cursor: pointer; transition: all 0.15s;
}
.settings-btn:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.18); color: #e8eaf0; }

.key-badge { padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; }
.badge-key-user    { background: rgba(34, 197, 94, 0.15);  color: #86efac; border: 1px solid rgba(34, 197, 94, 0.25); }
.badge-key-env     { background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.25); }
.badge-key-missing { background: rgba(239, 68, 68, 0.12);  color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.2); }

/* ─── Main ─── */
.home-main { flex: 1; padding: 40px 32px; max-width: 960px; margin: 0 auto; width: 100%; }
.home-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 48px; align-items: start; }

/* ─── Intro ─── */
.intro-headline { font-size: 32px; font-weight: 800; line-height: 1.2; color: #f0f1f8; margin-bottom: 14px; }
.intro-text { font-size: 14px; line-height: 1.7; color: #9ca3af; margin-bottom: 20px; }
.intro-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.badge {
  padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;
  background: rgba(79, 70, 229, 0.15); color: #818cf8; border: 1px solid rgba(79, 70, 229, 0.3);
}
.badge-specialty {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.25), rgba(124, 58, 237, 0.25));
  color: #c4b5fd; border-color: rgba(124, 58, 237, 0.4); font-weight: 800; letter-spacing: 0.08em;
}
.ai-indicator {
  display: flex; align-items: center; gap: 7px; font-size: 12px; color: #6b7280;
  padding: 7px 12px; border-radius: 8px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06);
}
.ai-indicator-warn { color: #f59e0b; background: rgba(245, 158, 11, 0.06); border-color: rgba(245, 158, 11, 0.2); }
.ai-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }
.ai-label { font-weight: 600; color: #c4c9d8; }
.ai-model { font-size: 11px; color: #4b5563; }
.ai-indicator-link { background: none; border: none; cursor: pointer; color: #f59e0b; font-size: 12px; font-weight: 600; padding: 0; text-decoration: underline; }

/* ─── Parts ─── */
.parts-list { display: flex; flex-direction: column; gap: 12px; }
.part-row {
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px; padding: 18px 20px; transition: border-color 0.2s;
}
.part-row:hover { border-color: rgba(255, 255, 255, 0.14); }
.part-info { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.part-number {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 800; color: #9ca3af; flex-shrink: 0;
}
.part-details { flex: 1; min-width: 0; }
.part-name { font-size: 14px; font-weight: 600; color: #e8eaf0; }
.part-meta { font-size: 12px; color: #6b7280; margin-top: 2px; }
.part-pool {
  display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 500;
  white-space: nowrap; padding: 4px 10px; border-radius: 20px; background: rgba(255, 255, 255, 0.04);
}
.pool-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.pool-ok .pool-dot { background: #22c55e; }
.pool-low .pool-dot { background: #f59e0b; }
.pool-ok { color: #86efac; }
.pool-low { color: #fcd34d; }
.pool-add { background: none; border: none; cursor: pointer; color: inherit; font-size: 15px; font-weight: 700; padding: 0 2px; line-height: 1; opacity: 0.7; transition: opacity 0.15s; }
.pool-add:hover { opacity: 1; }
.pool-spinner { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

.part-generating { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #9ca3af; padding: 4px 0 6px; }
.generating-spinner {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.1); border-top-color: #4f46e5;
  animation: spin 0.8s linear infinite; flex-shrink: 0;
}

.part-start-btn {
  width: 100%; padding: 11px 20px; border-radius: 10px; border: none;
  font-size: 14px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: opacity 0.15s, transform 0.1s;
}
.part-start-btn:hover:not(:disabled) { opacity: 0.9; }
.part-start-btn:active:not(:disabled) { transform: scale(0.98); }
.part-start-btn:disabled, .btn-disabled { cursor: not-allowed; opacity: 0.45; filter: grayscale(0.3); }
.btn-blue   { background: linear-gradient(135deg, #4f46e5, #4338ca); color: white; }
.btn-purple { background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; }
.btn-teal   { background: linear-gradient(135deg, #0d9488, #0f766e); color: white; }
.btn-spinner {
  width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.35); border-top-color: white;
  animation: spin 0.8s linear infinite;
}

.part-error { font-size: 12px; color: #f87171; margin-top: 8px; }
.part-warnings { display: flex; flex-direction: column; gap: 5px; margin-top: 6px; }
.part-warning {
  display: flex; align-items: flex-start; gap: 8px; font-size: 11px; line-height: 1.5; padding: 6px 10px; border-radius: 8px;
}
.warn-server_ai { color: #93c5fd; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); }
.warn-fallback  { color: #fca5a5; background: rgba(239, 68, 68, 0.08);  border: 1px solid rgba(239, 68, 68, 0.2); }
.warn-badge { flex-shrink: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.03em; padding: 1px 6px; border-radius: 4px; background: rgba(255, 255, 255, 0.08); white-space: nowrap; }
.warn-text { flex: 1; }

/* ─── Responsive ─── */
@media (max-width: 700px) {
  .home-main { padding: 24px 16px; }
  .home-header { padding: 16px; flex-wrap: wrap; gap: 12px; }
  .header-center { order: 3; width: 100%; }
  .home-grid { grid-template-columns: 1fr; gap: 32px; }
}
</style>
