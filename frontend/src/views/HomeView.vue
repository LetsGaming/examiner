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
          <button class="settings-btn settings-btn--nav" @click="router.push('/stats')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Mein Fortschritt
          </button>
          <button class="settings-btn settings-btn--nav" @click="router.push('/history')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Historie
          </button>
          <button class="settings-btn settings-btn--nav" @click="router.push('/practice')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Übungsmodus
          </button>
          <button v-if="reviewCount > 0" class="review-badge-btn" @click="router.push('/review')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.95"/></svg>
            {{ reviewCount }} fällig
          </button>
          <button class="theme-btn" @click="toggleTheme" :title="theme === 'dark' ? 'Zum Hellmodus wechseln' : 'Zum Dunkelmodus wechseln'">
            <svg v-if="theme === 'dark'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
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
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage } from '@ionic/vue';
import { useAuth } from '../composables/useAuth.js';
import { useSpecialty } from '../composables/useSpecialty.js';
import { useAiSettings } from '../composables/useAiSettings.js';
import { usePool, POOL_MIN } from '../composables/usePool.js';
import { useTheme } from '../composables/useTheme.js';
import { fetchReviewDue } from '../composables/useApi.js';
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
const { theme, init: initTheme, toggle: toggleTheme } = useTheme();
const reviewCount = ref(0);

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
  initTheme();
  try { const r = await fetchReviewDue(); reviewCount.value = r.count; } catch { /* ignore */ }
});
</script>

<style scoped>
.home-page {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--bg-base);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  display: flex;
  flex-direction: column;
}

/* ─── Header ─── */
.home-header {
  padding: 20px 32px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.header-center { flex: 1; display: flex; justify-content: center; }
.header-right  { display: flex; align-items: center; gap: 10px; }

.user-badge {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px 6px 6px; border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--control-bg); font-size: 13px; color: var(--text-muted);
  flex-shrink: 0;
}
.user-avatar {
  width: 26px; height: 26px; border-radius: 7px;
  background: var(--brand-gradient);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: white; flex-shrink: 0;
}
.user-name {
  font-weight: 500; color: var(--text-primary);
  max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.icon-btn {
  width: 24px; height: 24px; border-radius: var(--radius-sm); border: none;
  background: var(--control-bg); color: var(--text-subtle); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background var(--transition), color var(--transition);
}
.icon-btn:hover { background: var(--danger-bg); color: var(--danger-text); }

.settings-btn {
  display: flex; align-items: center; gap: 8px; padding: 8px 14px;
  border-radius: var(--radius-md); border: 1px solid var(--control-border);
  background: var(--control-bg); color: var(--text-muted); font-size: 13px;
  font-weight: 500; cursor: pointer; transition: all var(--transition);
  white-space: nowrap; flex-shrink: 0;
}
.settings-btn--nav { color: var(--brand-text); border-color: var(--brand-border); background: var(--brand-bg); }
.settings-btn--nav:hover { background: var(--brand-bg); filter: brightness(1.2); }
.settings-btn:hover { background: var(--control-bg-hover); border-color: var(--border-hover); color: var(--text-primary); }

.key-badge { padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; }
.badge-key-user    { background: var(--success-bg);  color: var(--success-text); border: 1px solid var(--success-border); }
.badge-key-env     { background: var(--brand-bg);    color: var(--brand-text);   border: 1px solid var(--brand-border); }
.badge-key-missing { background: var(--danger-bg);   color: var(--danger-text);  border: 1px solid var(--danger-border); }

/* ─── Main ─── */
.home-main { flex: 1; padding: 40px 32px; max-width: 960px; margin: 0 auto; width: 100%; }
.home-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 48px; align-items: start; }

/* ─── Intro ─── */
.intro-headline { font-size: 32px; font-weight: 800; line-height: 1.2; color: var(--text-primary); margin-bottom: 14px; }
.intro-text { font-size: 14px; line-height: 1.7; color: var(--text-muted); margin-bottom: 20px; }
.intro-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.badge {
  padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;
  background: var(--brand-bg); color: var(--brand-text); border: 1px solid var(--brand-border);
}
.badge-specialty {
  background: linear-gradient(135deg, var(--brand-bg), rgba(124, 58, 237, 0.25));
  color: #c4b5fd; border-color: rgba(124, 58, 237, 0.4); font-weight: 800; letter-spacing: 0.08em; /* purple accent: intentional specialty badge color */
}
.ai-indicator {
  display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text-subtle);
  padding: 7px 12px; border-radius: var(--radius-sm);
  background: var(--control-bg); border: 1px solid var(--border-light);
}
.ai-indicator-warn { color: var(--warning); background: var(--warning-bg); border-color: var(--warning-border); }
.ai-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--success); flex-shrink: 0; }
.ai-label { font-weight: 600; color: var(--text-primary); }
.ai-model { font-size: 11px; color: var(--text-faint); }
.ai-indicator-link { background: none; border: none; cursor: pointer; color: var(--warning); font-size: 12px; font-weight: 600; padding: 0; text-decoration: underline; }

/* ─── Parts ─── */
.parts-list { display: flex; flex-direction: column; gap: 12px; }
.part-row {
  background: var(--control-bg); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 18px 20px; transition: border-color var(--transition);
}
.part-row:hover { border-color: var(--border-hover); }
.part-info { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.part-number {
  width: 36px; height: 36px; border-radius: var(--radius-md);
  background: var(--control-bg); border: 1px solid var(--control-border);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 800; color: var(--text-muted); flex-shrink: 0;
}
.part-details { flex: 1; min-width: 0; }
.part-name { font-size: 14px; font-weight: 600; color: var(--text-secondary); }
.part-meta { font-size: 12px; color: var(--text-subtle); margin-top: 2px; }
.part-pool {
  display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 500;
  white-space: nowrap; padding: 4px 10px; border-radius: 20px; background: var(--control-bg);
}
.pool-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.pool-ok .pool-dot { background: var(--success); }
.pool-low .pool-dot { background: var(--warning); }
.pool-ok { color: var(--success-text); }
.pool-low { color: var(--warning-text); }
.pool-add { background: none; border: none; cursor: pointer; color: inherit; font-size: 15px; font-weight: 700; padding: 0 2px; line-height: 1; opacity: 0.7; transition: opacity var(--transition); }
.pool-add:hover { opacity: 1; }
.pool-spinner { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

.part-generating { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-muted); padding: 4px 0 6px; }
.generating-spinner {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--brand);
  animation: spin 0.8s linear infinite; flex-shrink: 0;
}

.part-start-btn {
  width: 100%; padding: 11px 20px; border-radius: var(--radius-md); border: none;
  font-size: 14px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: opacity var(--transition), transform 0.1s;
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

.part-error { font-size: 12px; color: var(--danger-text); margin-top: 8px; }
.part-warnings { display: flex; flex-direction: column; gap: 5px; margin-top: 6px; }
.part-warning {
  display: flex; align-items: flex-start; gap: 8px; font-size: 11px; line-height: 1.5; padding: 6px 10px; border-radius: var(--radius-sm);
}
.warn-server_ai { color: #93c5fd; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); } /* blue: server AI indicator — static accent */
.warn-fallback  { color: var(--danger-text); background: var(--danger-bg); border: 1px solid var(--danger-border); }
.warn-badge { flex-shrink: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.03em; padding: 1px 6px; border-radius: 4px; background: var(--control-bg); white-space: nowrap; }
.warn-text { flex: 1; }

/* ─── Responsive ─── */
@media (max-width: 700px) {
  .home-main   { padding: 24px 16px; }
  .home-header { padding: 16px; flex-wrap: wrap; gap: 12px; }
  .header-center { order: 3; width: 100%; }
  .home-grid   { grid-template-columns: 1fr; gap: 32px; }

  /* Mobile: header-right scrolls horizontally instead of wrapping/overflowing */
  .header-right {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;         /* Firefox */
    flex-wrap: nowrap;
    padding-bottom: 2px;           /* prevent clipped focus rings */
  }
  .header-right::-webkit-scrollbar { display: none; }
}

.review-badge-btn {
  display: flex; align-items: center; gap: 5px; padding: 6px 12px;
  background: var(--warning-bg); border: 1px solid var(--warning-border);
  border-radius: 20px; cursor: pointer; font-size: 12px; font-weight: 700;
  color: var(--warning-text); animation: pulse 2s infinite; white-space: nowrap; flex-shrink: 0;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.3); }
  50%       { box-shadow: 0 0 0 5px rgba(245, 158, 11, 0); }
}

.theme-btn {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px;
  background: var(--control-bg); border: 1px solid var(--control-border);
  border-radius: var(--radius-sm); cursor: pointer; color: var(--text-muted); flex-shrink: 0;
  transition: background var(--transition), color var(--transition);
}
.theme-btn:hover { background: var(--control-bg-hover); color: var(--text-primary); }
</style>
