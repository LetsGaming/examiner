<template>
  <ion-page>
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <span class="logo-badge">AP2</span>
          <div>
            <div class="logo-title">FIAE Trainer</div>
            <div class="logo-sub">Abschlussprüfung Teil 2</div>
          </div>
        </div>

        <div class="tab-row">
          <button
            :class="['tab', { 'tab-active': mode === 'login' }]"
            @click="mode = 'login'"
          >
            Anmelden
          </button>
          <button
            :class="['tab', { 'tab-active': mode === 'register' }]"
            @click="mode = 'register'"
          >
            Registrieren
          </button>
        </div>

        <div class="fields">
          <div v-if="mode === 'register'" class="field-group">
            <label class="field-label">Name</label>
            <input
              v-model="form.displayName"
              type="text"
              class="field-input"
              placeholder="Dein Name"
              autocomplete="name"
            />
          </div>

          <div class="field-group">
            <label class="field-label">E-Mail</label>
            <input
              v-model="form.email"
              type="email"
              class="field-input"
              placeholder="name@example.com"
              autocomplete="email"
            />
          </div>

          <div class="field-group">
            <label class="field-label">Passwort</label>
            <div class="pw-row">
              <input
                v-model="form.password"
                :type="showPw ? 'text' : 'password'"
                class="field-input"
                :placeholder="
                  mode === 'register' ? 'Mindestens 8 Zeichen' : 'Passwort'
                "
                :autocomplete="
                  mode === 'register' ? 'new-password' : 'current-password'
                "
                @keydown.enter="submit"
              />
              <button class="pw-toggle" @click="showPw = !showPw" type="button">
                <svg
                  v-if="!showPw"
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
          </div>

          <p v-if="error" class="login-error">{{ error }}</p>

          <button class="submit-btn" :disabled="loading" @click="submit">
            <span v-if="loading" class="btn-spinner" />
            <template v-else>
              {{ mode === "login" ? "Anmelden" : "Konto erstellen" }}
            </template>
          </button>
        </div>
      </div>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { IonPage } from "@ionic/vue";
import { API_BASE_URL } from "../constants.js";
import { setToken } from "../composables/useAuth.js";

const router = useRouter();
const API = API_BASE_URL;

const mode = ref<"login" | "register">("login");
const showPw = ref(false);
const loading = ref(false);
const error = ref("");

const form = ref({ email: "", password: "", displayName: "" });

async function submit() {
  error.value = "";
  const { email, password, displayName } = form.value;

  if (!email || !password) {
    error.value = "E-Mail und Passwort erforderlich.";
    return;
  }
  if (mode.value === "register" && !displayName) {
    error.value = "Name erforderlich.";
    return;
  }

  loading.value = true;
  try {
    const endpoint = mode.value === "login" ? "/auth/login" : "/auth/register";
    const body: Record<string, string> = { email, password };
    if (mode.value === "register") body.displayName = displayName;

    const res = await fetch(`${API}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    setToken(data.data.token, data.data.user);
    router.push("/home");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Fehler beim Anmelden.";
  } finally {
    loading.value = false;
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

.login-page {
  min-height: 100vh;
  background: #0f1117;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: "Inter", system-ui, sans-serif;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: #16181f;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
}

.login-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
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

.tab-row {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
}
.tab {
  flex: 1;
  padding: 8px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.tab-active {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.field-input {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #e8eaf0;
  font-size: 14px;
  outline: none;
  width: 100%;
  transition: border-color 0.15s;
}
.field-input:focus {
  border-color: rgba(99, 102, 241, 0.6);
}
.field-input::placeholder {
  color: #374151;
}

.pw-row {
  display: flex;
  gap: 8px;
}
.pw-row .field-input {
  flex: 1;
}
.pw-toggle {
  width: 40px;
  height: 40px;
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
.pw-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e8eaf0;
}

.login-error {
  font-size: 12px;
  color: #f87171;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.submit-btn {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.15s;
  margin-top: 4px;
}
.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
}
.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
