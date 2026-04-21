<template>
  <ion-page>
    <div class="home-page">
      <header class="home-header">
        <div class="home-logo">
          <span class="logo-badge">AP2</span>
          <div>
            <div class="logo-title">FIAE Trainer</div>
            <div class="logo-sub">Abschlussprüfung Teil 2</div>
          </div>
        </div>
        <div class="header-right">
          <div v-if="user" class="user-badge">
            <span class="user-avatar">{{
              user.displayName.charAt(0).toUpperCase()
            }}</span>
            <span class="user-name">{{ user.displayName }}</span>
            <button class="logout-btn" @click="logout" title="Abmelden">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
          <button
            class="settings-btn"
            @click="openSettings"
            title="KI-Einstellungen"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
              />
            </svg>
            KI-Einstellungen
            <span
              v-if="aiSettings.keySource === 'user'"
              class="settings-key-badge"
              >Eigener Key</span
            >
            <span
              v-else-if="aiSettings.keySource === 'env'"
              class="settings-key-badge settings-key-env"
              >Server-Key</span
            >
            <span v-else class="settings-key-badge settings-key-missing"
              >Kein Key</span
            >
          </button>
        </div>
      </header>

      <main class="home-main">
        <div class="home-grid">
          <div class="home-intro">
            <h1 class="intro-headline">Prüfungs&shy;vorbereitung</h1>
            <p class="intro-text">
              Realitätsnahe IHK AP2-Prüfungen mit KI-generierten Aufgaben,
              automatischer Bewertung und detailliertem Feedback.
            </p>
            <div class="intro-badges">
              <span class="badge">KI-generiert</span>
              <span class="badge">IHK-konform</span>
              <span class="badge">Sofort-Feedback</span>
            </div>

            <!-- Active AI indicator -->
            <div v-if="aiSettings.hasKey" class="ai-indicator">
              <span class="ai-dot" />
              <span class="ai-label">{{ currentProviderLabel }}</span>
              <span class="ai-model">{{ currentProviderModel }}</span>
            </div>
            <div v-else class="ai-indicator ai-indicator-warn">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path
                  d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
                />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Kein API-Key —
              <button class="ai-indicator-link" @click="openSettings">
                Jetzt einrichten
              </button>
            </div>
          </div>

          <div class="parts-list">
            <div v-for="p in PARTS" :key="p.value" class="part-row">
              <div class="part-info">
                <div class="part-number">{{ p.number }}</div>
                <div class="part-details">
                  <div class="part-name">{{ p.label }}</div>
                  <div class="part-meta">
                    {{ p.duration }} Min &middot; {{ p.points }} Punkte &middot;
                    {{ p.taskCount }} Aufgaben
                  </div>
                </div>
                <div
                  class="part-pool"
                  :class="
                    (poolStatus[p.value] ?? 0) >= POOL_MIN
                      ? 'pool-ok'
                      : 'pool-low'
                  "
                >
                  <span class="pool-dot" />
                  <span>{{ poolStatus[p.value] ?? "…" }} im Pool</span>
                  <button
                    v-if="generating !== p.value + '_gen'"
                    class="pool-add"
                    :disabled="generating !== null"
                    @click.stop="addToPool(p.value)"
                    title="Neue Aufgaben generieren"
                  >
                    +
                  </button>
                  <span v-else class="pool-spinner">⟳</span>
                </div>
              </div>

              <div v-if="generating === p.value" class="part-generating">
                <div class="generating-spinner" />
                <span>{{ statusMessage }}</span>
              </div>
              <template v-else>
                <button
                  class="part-start-btn"
                  :class="[
                    `btn-${p.color}`,
                    { 'btn-disabled': generating !== null },
                  ]"
                  :disabled="generating !== null"
                  @click="startExam(p.value)"
                >
                  <span v-if="generating !== null" class="btn-wait-spinner" />
                  <template v-else>
                    Prüfung starten
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </template>
                </button>
              </template>

              <p v-if="errors[p.value]" class="part-error">
                {{ errors[p.value] }}
              </p>
              <div v-if="warnings[p.value]?.length" class="part-warnings">
                <div
                  v-for="(w, i) in warnings[p.value]"
                  :key="i"
                  class="part-warning"
                  :class="`warn-${w.source}`"
                >
                  <span class="warn-badge">
                    <template v-if="w.source === 'server_ai'"
                      >↩ Server-KI</template
                    >
                    <template v-else-if="w.source === 'fallback'"
                      >⚠ Platzhalter</template
                    >
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

    <!-- ─── Settings Modal ──────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showSettings"
        class="modal-backdrop"
        @click.self="closeSettings"
      >
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-label="KI-Einstellungen"
        >
          <div class="modal-header">
            <div class="modal-title">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                />
              </svg>
              KI-Einstellungen
            </div>
            <button
              class="modal-close"
              @click="closeSettings"
              aria-label="Schließen"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- Current status banner -->
            <div
              class="status-banner"
              :class="
                aiSettings.keySource === 'none' ? 'status-warn' : 'status-ok'
              "
            >
              <template v-if="aiSettings.keySource === 'user'">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Eigener API-Key gespeichert
                <span class="status-date" v-if="aiSettings.updatedAt"
                  >· gespeichert {{ formatDate(aiSettings.updatedAt) }}</span
                >
              </template>
              <template v-else-if="aiSettings.keySource === 'env'">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Server-Key aktiv ({{ aiSettings.provider }})
              </template>
              <template v-else>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path
                    d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
                  />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Kein API-Key konfiguriert — Prüfungen können nicht generiert
                oder bewertet werden
              </template>
            </div>

            <!-- Provider selector -->
            <div class="field-group">
              <label class="field-label">KI-Anbieter</label>
              <div class="provider-grid">
                <button
                  v-for="p in aiSettings.providers"
                  :key="p.id"
                  class="provider-card"
                  :class="{ 'provider-active': form.provider === p.id }"
                  @click="selectProvider(p)"
                >
                  <span class="provider-name">{{ p.label }}</span>
                  <span class="provider-model">{{ p.textModel }}</span>
                </button>
              </div>
            </div>

            <!-- API Key input -->
            <div class="field-group">
              <label class="field-label" :for="'apikey-input'">
                API-Key
                <a
                  v-if="selectedProviderMeta"
                  :href="selectedProviderMeta.docsUrl"
                  target="_blank"
                  rel="noopener"
                  class="field-docs-link"
                  >Key erstellen ↗</a
                >
              </label>
              <div class="key-input-row">
                <input
                  id="apikey-input"
                  v-model="form.apiKey"
                  :type="showKey ? 'text' : 'password'"
                  class="key-input"
                  :placeholder="
                    aiSettings.keySource === 'user'
                      ? '•••••••••••••••••••••• (gespeichert)'
                      : (selectedProviderMeta?.keyHint ?? 'API-Key eingeben…')
                  "
                  autocomplete="off"
                  spellcheck="false"
                />
                <button
                  class="key-toggle"
                  @click="showKey = !showKey"
                  :title="showKey ? 'Verbergen' : 'Anzeigen'"
                >
                  <svg
                    v-if="!showKey"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <svg
                    v-else
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                    />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                </button>
              </div>
              <p class="field-hint">
                Der Key wird AES-256-verschlüsselt auf dem Server gespeichert.
                Er verlässt den Server nie — er wird ausschließlich für
                Bewertungsanfragen an
                {{
                  selectedProviderMeta?.label ?? "den gewählten Anbieter"
                }}
                verwendet.
              </p>
            </div>

            <!-- Vision model note -->
            <div v-if="selectedProviderMeta" class="model-info">
              <div class="model-row">
                <span class="model-badge">Text</span>
                <span>{{ selectedProviderMeta.textModel }}</span>
              </div>
              <div class="model-row">
                <span class="model-badge">Vision</span>
                <span>{{ selectedProviderMeta.visionModel }}</span>
              </div>
            </div>

            <!-- Error / success feedback -->
            <p v-if="settingsError" class="settings-error">
              {{ settingsError }}
            </p>
            <p v-if="settingsSuccess" class="settings-success">
              {{ settingsSuccess }}
            </p>
          </div>

          <div class="modal-footer">
            <button
              v-if="aiSettings.keySource === 'user'"
              class="btn-ghost btn-danger"
              :disabled="settingsSaving"
              @click="deleteKey"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
              Key löschen
            </button>
            <div class="modal-footer-right">
              <button class="btn-ghost" @click="closeSettings">
                Abbrechen
              </button>
              <button
                class="btn-primary"
                :disabled="settingsSaving"
                @click="saveSettings"
              >
                <span v-if="settingsSaving" class="btn-wait-spinner" />
                <template v-else>Speichern</template>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { IonPage } from "@ionic/vue";
import { API_BASE_URL } from "../constants.js";
import { useAuth, getAuthHeaders } from "../composables/useAuth.js";

const router = useRouter();
const API = API_BASE_URL;
const { user, logout } = useAuth();

// ─── Exam state ───────────────────────────────────────────────────────────────

const generating = ref<string | null>(null);
const statusMessage = ref("");
const poolStatus = ref<Record<string, number>>({});
const errors = ref<Record<string, string>>({});
const warnings = ref<
  Record<string, { topic: string; source: string; message: string }[]>
>({});
const POOL_MIN = 5;

const PARTS = [
  {
    value: "teil_1",
    number: "1",
    label: "Planen eines Softwareproduktes",
    color: "blue",
    duration: 90,
    points: 100,
    taskCount: 4,
  },
  {
    value: "teil_2",
    number: "2",
    label: "Entwicklung und Umsetzung von Algorithmen",
    color: "purple",
    duration: 90,
    points: 100,
    taskCount: 4,
  },
  {
    value: "teil_3",
    number: "3",
    label: "Wirtschafts- und Sozialkunde",
    color: "teal",
    duration: 60,
    points: 100,
    taskCount: 8,
  },
];

// ─── AI Settings state ────────────────────────────────────────────────────────

interface ProviderInfo {
  id: string;
  label: string;
  keyHint: string;
  docsUrl: string;
  textModel: string;
  visionModel: string;
}

interface AiSettings {
  provider: string;
  providers: ProviderInfo[];
  hasKey: boolean;
  keySource: "user" | "env" | "none";
  keyMasked: string | null;
  updatedAt: string | null;
}

const aiSettings = ref<AiSettings>({
  provider: "openai",
  providers: [],
  hasKey: false,
  keySource: "none",
  keyMasked: null,
  updatedAt: null,
});

const showSettings = ref(false);
const showKey = ref(false);
const settingsSaving = ref(false);
const settingsError = ref("");
const settingsSuccess = ref("");

const form = ref({ provider: "openai", apiKey: "" });

const selectedProviderMeta = computed<ProviderInfo | null>(
  () =>
    aiSettings.value.providers.find((p) => p.id === form.value.provider) ??
    null,
);

const currentProviderLabel = computed(
  () =>
    aiSettings.value.providers.find((p) => p.id === aiSettings.value.provider)
      ?.label ?? aiSettings.value.provider,
);

const currentProviderModel = computed(
  () =>
    aiSettings.value.providers.find((p) => p.id === aiSettings.value.provider)
      ?.textModel ?? "",
);

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([loadPoolStatus(), loadAiSettings()]);
});

// ─── Data loaders ─────────────────────────────────────────────────────────────

async function loadPoolStatus() {
  try {
    const res = await fetch(`${API}/exams/pool-status`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      const s: Record<string, number> = {};
      for (const p of data.data.parts) s[p.part] = p.total;
      poolStatus.value = s;
    }
  } catch {
    /* ignore */
  }
}

async function loadAiSettings() {
  try {
    const res = await fetch(`${API}/settings/ai`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      aiSettings.value = data.data;
      form.value.provider = data.data.provider;
    }
  } catch {
    /* ignore */
  }
}

// ─── Settings modal ───────────────────────────────────────────────────────────

function openSettings() {
  form.value = { provider: aiSettings.value.provider, apiKey: "" };
  showKey.value = false;
  settingsError.value = "";
  settingsSuccess.value = "";
  showSettings.value = true;
}

function closeSettings() {
  showSettings.value = false;
}

function selectProvider(p: ProviderInfo) {
  form.value.provider = p.id;
  form.value.apiKey = ""; // clear key field when switching provider
  settingsError.value = "";
  settingsSuccess.value = "";
}

async function saveSettings() {
  settingsError.value = "";
  settingsSuccess.value = "";
  settingsSaving.value = true;

  try {
    const body: Record<string, string> = { provider: form.value.provider };
    if (form.value.apiKey.trim()) body.apiKey = form.value.apiKey.trim();

    const res = await fetch(`${API}/settings/ai`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    await loadAiSettings();
    form.value.apiKey = "";
    settingsSuccess.value = data.data.keyStored
      ? "Einstellungen gespeichert. API-Key ist verschlüsselt hinterlegt."
      : "Anbieter aktualisiert.";
  } catch (err) {
    settingsError.value =
      err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
  } finally {
    settingsSaving.value = false;
  }
}

async function deleteKey() {
  if (!confirm("Gespeicherten API-Key wirklich löschen?")) return;
  settingsError.value = "";
  settingsSuccess.value = "";
  settingsSaving.value = true;

  try {
    const res = await fetch(`${API}/settings/ai`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    await loadAiSettings();
    settingsSuccess.value = "API-Key wurde gelöscht.";
  } catch (err) {
    settingsError.value =
      err instanceof Error ? err.message : "Löschen fehlgeschlagen.";
  } finally {
    settingsSaving.value = false;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + "Z").toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ─── Exam actions ─────────────────────────────────────────────────────────────

async function addToPool(part: string) {
  generating.value = part + "_gen";
  errors.value[part] = "";
  try {
    const res = await fetch(`${API}/exams/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ part, count: 4 }),
    });
    const data = await res.json();
    if (res.status === 401) {
      logout();
      return;
    }
    if (res.status === 401) {
      logout();
      return;
    }
    if (!data.success) throw new Error(data.error);
    warnings.value[part] = data.data?.warnings ?? [];
    await loadPoolStatus();
  } catch (err) {
    errors.value[part] = err instanceof Error ? err.message : "Fehler";
  } finally {
    generating.value = null;
  }
}

async function startExam(part: string) {
  generating.value = part;
  statusMessage.value = "Prüfung wird zusammengestellt…";
  errors.value[part] = "";
  try {
    let res = await fetch(`${API}/exams/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ part }),
    });
    let data = await res.json();

    if (!data.success && data.needsGeneration) {
      statusMessage.value = "Pool leer — generiere Aufgaben…";
      const gen = await fetch(`${API}/exams/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ part, count: 6 }),
      });
      const genData = await gen.json();
      if (!genData.success) throw new Error(genData.error);
      warnings.value[part] = genData.data?.warnings ?? [];
      await loadPoolStatus();
      statusMessage.value = "Prüfung wird zusammengestellt…";
      res = await fetch(`${API}/exams/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part }),
      });
      data = await res.json();
    }
    if (!data.success) throw new Error(data.error);
    router.push(`/session/${data.data.sessionId}`);
  } catch (err) {
    errors.value[part] = err instanceof Error ? err.message : "Fehler";
  } finally {
    generating.value = null;
  }
}
</script>

<style scoped>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.home-page {
  min-height: 100vh;
  background: #0f1117;
  color: #e8eaf0;
  font-family: "Inter", system-ui, sans-serif;
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
}
.home-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: white;
  letter-spacing: 0.05em;
}
.logo-title {
  font-size: 16px;
  font-weight: 700;
  color: #f0f1f8;
}
.logo-sub {
  font-size: 11px;
  color: #6b7280;
  margin-top: 1px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  font-size: 13px;
  color: #9ca3af;
}
.user-avatar {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}
.user-name {
  font-weight: 500;
  color: #c4c9d8;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.logout-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    color 0.15s;
  flex-shrink: 0;
}
.logout-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.settings-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #9ca3af;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}
.settings-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.18);
  color: #e8eaf0;
}

.settings-key-badge {
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
  border: 1px solid rgba(34, 197, 94, 0.25);
}
.settings-key-env {
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  border-color: rgba(99, 102, 241, 0.25);
}
.settings-key-missing {
  background: rgba(239, 68, 68, 0.12);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.2);
}

/* ─── Main ─── */
.home-main {
  flex: 1;
  padding: 40px 32px;
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
}
.home-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 48px;
  align-items: start;
}

/* ─── Intro ─── */
.intro-headline {
  font-size: 32px;
  font-weight: 800;
  line-height: 1.2;
  color: #f0f1f8;
  margin-bottom: 14px;
}
.intro-text {
  font-size: 14px;
  line-height: 1.7;
  color: #9ca3af;
  margin-bottom: 20px;
}
.intro-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}
.badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(79, 70, 229, 0.15);
  color: #818cf8;
  border: 1px solid rgba(79, 70, 229, 0.3);
}

.ai-indicator {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: #6b7280;
  padding: 7px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.ai-indicator-warn {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.06);
  border-color: rgba(245, 158, 11, 0.2);
}
.ai-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  flex-shrink: 0;
}
.ai-label {
  font-weight: 600;
  color: #c4c9d8;
}
.ai-model {
  font-size: 11px;
  color: #4b5563;
}
.ai-indicator-link {
  background: none;
  border: none;
  cursor: pointer;
  color: #f59e0b;
  font-size: 12px;
  font-weight: 600;
  padding: 0;
  text-decoration: underline;
}

/* ─── Parts ─── */
.parts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.part-row {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 18px 20px;
  transition: border-color 0.2s;
}
.part-row:hover {
  border-color: rgba(255, 255, 255, 0.14);
}
.part-info {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}
.part-number {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
  color: #9ca3af;
  flex-shrink: 0;
}
.part-details {
  flex: 1;
  min-width: 0;
}
.part-name {
  font-size: 14px;
  font-weight: 600;
  color: #e8eaf0;
}
.part-meta {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}
.part-pool {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
}
.pool-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pool-ok .pool-dot {
  background: #22c55e;
}
.pool-low .pool-dot {
  background: #f59e0b;
}
.pool-ok {
  color: #86efac;
}
.pool-low {
  color: #fcd34d;
}
.pool-add {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-size: 15px;
  font-weight: 700;
  padding: 0 2px;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.15s;
}
.pool-add:hover {
  opacity: 1;
}
.pool-spinner {
  animation: spin 1s linear infinite;
  display: inline-block;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.part-generating {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #9ca3af;
  padding: 4px 0 6px;
}
.generating-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: #4f46e5;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}
.part-start-btn {
  width: 100%;
  padding: 11px 20px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition:
    opacity 0.15s,
    transform 0.1s;
}
.part-start-btn:hover:not(:disabled) {
  opacity: 0.9;
}
.part-start-btn:active:not(:disabled) {
  transform: scale(0.98);
}
.part-start-btn:disabled {
  cursor: not-allowed;
}
.part-start-btn.btn-disabled {
  opacity: 0.45;
  filter: grayscale(0.3);
}
.btn-wait-spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}
.btn-blue {
  background: linear-gradient(135deg, #4f46e5, #4338ca);
  color: white;
}
.btn-purple {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: white;
}
.btn-teal {
  background: linear-gradient(135deg, #0d9488, #0f766e);
  color: white;
}
.part-error {
  font-size: 12px;
  color: #f87171;
  margin-top: 8px;
}
.part-warnings {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 6px;
}
.part-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 11px;
  line-height: 1.5;
  padding: 6px 10px;
  border-radius: 8px;
}
.part-warning.warn-server_ai {
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
}
.part-warning.warn-fallback {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
}
.warn-badge {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  white-space: nowrap;
}
.warn-text {
  flex: 1;
}

/* ─── Modal backdrop ─── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fade-in 0.15s ease;
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal {
  background: #16181f;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  animation: slide-up 0.2s ease;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}
.modal-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 15px;
  font-weight: 700;
  color: #f0f1f8;
}
.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    color 0.15s;
}
.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e8eaf0;
}

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

/* Status banner */
.status-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(34, 197, 94, 0.08);
  color: #86efac;
  border: 1px solid rgba(34, 197, 94, 0.2);
}
.status-warn {
  background: rgba(245, 158, 11, 0.07);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.2);
}
.status-date {
  color: #4b5563;
  margin-left: 2px;
}

/* Fields */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.field-docs-link {
  font-size: 11px;
  font-weight: 500;
  color: #6366f1;
  text-decoration: none;
  text-transform: none;
  letter-spacing: 0;
}
.field-docs-link:hover {
  color: #818cf8;
}
.field-hint {
  font-size: 11px;
  color: #4b5563;
  line-height: 1.6;
}

/* Provider grid */
.provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
}
.provider-card {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s,
    background 0.15s;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.provider-card:hover {
  border-color: rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
}
.provider-active {
  border-color: #6366f1 !important;
  background: rgba(99, 102, 241, 0.12) !important;
}
.provider-name {
  font-size: 13px;
  font-weight: 600;
  color: #e8eaf0;
}
.provider-model {
  font-size: 10px;
  color: #4b5563;
}

/* Key input */
.key-input-row {
  display: flex;
  gap: 8px;
}
.key-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #e8eaf0;
  font-size: 13px;
  font-family: "JetBrains Mono", "Fira Code", monospace;
  outline: none;
  transition: border-color 0.15s;
}
.key-input::placeholder {
  color: #374151;
  font-family: inherit;
}
.key-input:focus {
  border-color: rgba(99, 102, 241, 0.6);
}
.key-toggle {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #6b7280;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.key-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e8eaf0;
}

/* Model info */
.model-info {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.model-row {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: #6b7280;
}
.model-badge {
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
}

/* Feedback */
.settings-error {
  font-size: 12px;
  color: #f87171;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
}
.settings-success {
  font-size: 12px;
  color: #86efac;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.2);
}

/* Modal footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.modal-footer-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.btn-ghost {
  padding: 9px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: #9ca3af;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}
.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #e8eaf0;
}
.btn-ghost:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-danger {
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.25);
}
.btn-danger:hover {
  background: rgba(239, 68, 68, 0.1) !important;
  color: #fca5a5 !important;
}

.btn-primary {
  padding: 9px 20px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: opacity 0.15s;
}
.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 700px) {
  .home-main {
    padding: 24px 16px;
  }
  .home-header {
    padding: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .home-grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .provider-grid {
    grid-template-columns: 1fr 1fr;
  }
  .modal {
    border-radius: 14px;
  }
}
</style>
