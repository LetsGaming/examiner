<template>
  <ion-page>
    <div class="login-page">
      <div class="login-card">
        <AppLogo title="FIAE / FISI Trainer" />

        <div class="tab-row">
          <button :class="['tab', { 'tab-active': mode === 'login' }]" @click="mode = 'login'">
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
                :placeholder="mode === 'register' ? 'Mindestens 8 Zeichen' : 'Passwort'"
                :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
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
            <template v-else>{{ mode === 'login' ? 'Anmelden' : 'Konto erstellen' }}</template>
          </button>
        </div>
      </div>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage } from '@ionic/vue';
import { apiLogin, apiRegister } from '../composables/useApi.js';
import { setToken } from '../composables/useAuth.js';
import AppLogo from '../components/ui/AppLogo.vue';

const router = useRouter();
const mode = ref<'login' | 'register'>('login');
const showPw = ref(false);
const loading = ref(false);
const error = ref('');
const form = ref({ email: '', password: '', displayName: '' });

async function submit() {
  error.value = '';
  const { email, password, displayName } = form.value;

  if (!email || !password) {
    error.value = 'E-Mail und Passwort erforderlich.';
    return;
  }
  if (mode.value === 'register' && !displayName) {
    error.value = 'Name erforderlich.';
    return;
  }

  loading.value = true;
  try {
    const result =
      mode.value === 'login'
        ? await apiLogin(email, password)
        : await apiRegister(email, password, displayName);
    setToken(result.token, result.user);
    router.push('/home');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Anmelden.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--bg-base);
  padding: 24px;
  font-family: var(--font-sans);
  display: flex;
  flex-direction: column;
}
.login-page > * {
  margin-top: auto;
  margin-bottom: auto;
}
.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-raised);
  border: 1px solid var(--control-border);
  border-radius: var(--radius-xl);
  padding: 32px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.tab-row {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--control-bg);
  border-radius: var(--radius-md);
}
.tab {
  flex: 1;
  padding: 8px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--text-subtle);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}
.tab-active {
  background: var(--brand-bg);
  color: var(--brand-text);
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
  color: var(--text-subtle);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.field-input {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--control-border);
  background: var(--control-bg);
  color: var(--text-secondary);
  font-size: 14px;
  outline: none;
  width: 100%;
  transition: border-color var(--transition);
}
.field-input:focus {
  border-color: var(--brand);
}
.field-input::placeholder {
  color: var(--text-ghost);
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
  border-radius: var(--radius-md);
  border: 1px solid var(--control-border);
  background: var(--control-bg);
  color: var(--text-subtle);
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition), color var(--transition);
}
.pw-toggle:hover {
  background: var(--control-bg-hover);
  color: var(--text-primary);
}
.login-error {
  font-size: 12px;
  color: var(--danger-text);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
}
.submit-btn {
  width: 100%;
  padding: 12px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--brand-gradient);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity var(--transition);
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
  to { transform: rotate(360deg); }
}
</style>
