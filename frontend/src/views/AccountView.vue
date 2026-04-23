<template>
  <ion-page>
    <div class="account-page">
      <header class="account-header">
        <button class="back-btn" @click="router.push('/home')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Zurück
        </button>
        <h1 class="account-title">Mein Account</h1>
      </header>

      <main class="account-main">
        <div class="account-sections">

          <!-- ─── Profil ─── -->
          <section class="card">
            <h2 class="card-heading">Profil</h2>
            <div class="field-group">
              <label class="field-label">ANZEIGENAME</label>
              <input v-model="profileForm.displayName" class="field-input" type="text" placeholder="Dein Name" />
            </div>
            <div class="field-group">
              <label class="field-label">E-MAIL</label>
              <input v-model="profileForm.email" class="field-input" type="email" placeholder="deine@email.de" />
            </div>
            <div v-if="profileError" class="feedback-error">{{ profileError }}</div>
            <div v-if="profileSuccess" class="feedback-success">{{ profileSuccess }}</div>
            <button class="btn-primary" :disabled="profileSaving" @click="saveProfile">
              <span v-if="profileSaving" class="btn-spinner" />
              <template v-else>Speichern</template>
            </button>
          </section>

          <!-- ─── Passwort ─── -->
          <section class="card">
            <h2 class="card-heading">Passwort ändern</h2>
            <div class="field-group">
              <label class="field-label">AKTUELLES PASSWORT</label>
              <div class="pw-row">
                <input v-model="pwForm.current" class="field-input" :type="showPw.current ? 'text' : 'password'" autocomplete="current-password" />
                <button class="pw-toggle" @click="showPw.current = !showPw.current" type="button">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">NEUES PASSWORT</label>
              <div class="pw-row">
                <input v-model="pwForm.next" class="field-input" :type="showPw.next ? 'text' : 'password'" autocomplete="new-password" placeholder="Mindestens 8 Zeichen" />
                <button class="pw-toggle" @click="showPw.next = !showPw.next" type="button">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
            <div v-if="pwError" class="feedback-error">{{ pwError }}</div>
            <div v-if="pwSuccess" class="feedback-success">{{ pwSuccess }}</div>
            <button class="btn-primary" :disabled="pwSaving" @click="changePassword">
              <span v-if="pwSaving" class="btn-spinner" />
              <template v-else>Passwort ändern</template>
            </button>
          </section>

          <!-- ─── Account löschen ─── -->
          <section class="card card--danger">
            <h2 class="card-heading card-heading--danger">Account löschen</h2>
            <p class="danger-text">Dein Account und alle deine Prüfungsdaten werden unwiderruflich gelöscht.</p>
            <template v-if="!confirmDelete">
              <button class="btn-danger-outline" @click="confirmDelete = true">Account löschen</button>
            </template>
            <template v-else>
              <div class="field-group">
                <label class="field-label">PASSWORT ZUR BESTÄTIGUNG</label>
                <input v-model="deletePassword" class="field-input" type="password" autocomplete="current-password" placeholder="Passwort eingeben" />
              </div>
              <div v-if="deleteError" class="feedback-error">{{ deleteError }}</div>
              <div class="confirm-btns">
                <button class="btn-ghost" @click="confirmDelete = false; deletePassword = ''; deleteError = null">Abbrechen</button>
                <button class="btn-danger" :disabled="deleteSaving" @click="deleteAccount">
                  <span v-if="deleteSaving" class="btn-spinner" />
                  <template v-else>Endgültig löschen</template>
                </button>
              </div>
            </template>
          </section>

        </div>
      </main>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { IonPage } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { useAuth, clearToken } from '../composables/useAuth.js';
import { updateProfile, changePassword as changePasswordApi, deleteAccount as deleteAccountApi } from '../composables/useApi.js';

const router = useRouter();
const { user } = useAuth();

// ─── Profile ──────────────────────────────────────────────────────────────────

const profileForm = ref({ displayName: '', email: '' });
const profileSaving = ref(false);
const profileError = ref<string | null>(null);
const profileSuccess = ref<string | null>(null);

onMounted(() => {
  profileForm.value.displayName = user.value?.displayName ?? '';
  profileForm.value.email = user.value?.email ?? '';
});

async function saveProfile() {
  profileError.value = null;
  profileSuccess.value = null;
  profileSaving.value = true;
  try {
    const body: Record<string, string> = {};
    if (profileForm.value.displayName !== user.value?.displayName)
      body.displayName = profileForm.value.displayName;
    if (profileForm.value.email !== user.value?.email)
      body.email = profileForm.value.email;
    if (Object.keys(body).length === 0) {
      profileSuccess.value = 'Keine Änderungen.';
      return;
    }
    const updated = await updateProfile(body);
    // Update cached user
    const stored = localStorage.getItem('ap2_auth_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.displayName = updated.displayName;
      parsed.email = updated.email;
      localStorage.setItem('ap2_auth_user', JSON.stringify(parsed));
      if (user.value) {
        user.value.displayName = updated.displayName;
        user.value.email = updated.email;
      }
    }
    profileSuccess.value = 'Profil gespeichert.';
  } catch (e: unknown) {
    profileError.value = (e as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Fehler beim Speichern.';
  } finally {
    profileSaving.value = false;
  }
}

// ─── Password ─────────────────────────────────────────────────────────────────

const pwForm = ref({ current: '', next: '' });
const showPw = ref({ current: false, next: false });
const pwSaving = ref(false);
const pwError = ref<string | null>(null);
const pwSuccess = ref<string | null>(null);

async function changePassword() {
  pwError.value = null;
  pwSuccess.value = null;
  if (!pwForm.value.current || !pwForm.value.next) {
    pwError.value = 'Beide Felder ausfüllen.';
    return;
  }
  pwSaving.value = true;
  try {
    await changePasswordApi(pwForm.value.current, pwForm.value.next);
    pwForm.value = { current: '', next: '' };
    pwSuccess.value = 'Passwort geändert.';
  } catch (e: unknown) {
    pwError.value = (e as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Fehler.';
  } finally {
    pwSaving.value = false;
  }
}

// ─── Delete account ───────────────────────────────────────────────────────────

const confirmDelete = ref(false);
const deletePassword = ref('');
const deleteSaving = ref(false);
const deleteError = ref<string | null>(null);

async function deleteAccount() {
  deleteError.value = null;
  if (!deletePassword.value) { deleteError.value = 'Passwort eingeben.'; return; }
  deleteSaving.value = true;
  try {
    await deleteAccountApi(deletePassword.value);
    clearToken();
    router.push('/login');
  } catch (e: unknown) {
    deleteError.value = (e as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Fehler.';
  } finally {
    deleteSaving.value = false;
  }
}
</script>

<style scoped>
.account-page { min-height: 100vh; background: var(--bg-base); color: var(--text-secondary); display: flex; flex-direction: column; }
.account-header { display: flex; align-items: center; gap: 16px; padding: 16px 24px; border-bottom: 1px solid var(--border-light); }
.back-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: var(--control-bg); border: 1px solid var(--control-border); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; color: var(--text-muted); }
.back-btn:hover { background: var(--control-bg-hover); }
.account-title { font-size: 18px; font-weight: 700; margin: 0; color: var(--text-primary); }

.account-main { padding: 32px 24px; display: flex; justify-content: center; }
.account-sections { display: flex; flex-direction: column; gap: 20px; max-width: 480px; width: 100%; }

.card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.card--danger { border-color: var(--danger-border); background: var(--danger-bg); }
.card-heading { font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0; }
.card-heading--danger { color: var(--danger-text); }

.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 11px; font-weight: 600; color: var(--text-subtle); text-transform: uppercase; letter-spacing: 0.06em; }
.field-input { padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--control-border); background: var(--control-bg); color: var(--text-secondary); font-size: 14px; outline: none; transition: border-color var(--transition); }
.field-input:focus { border-color: var(--brand); }
.pw-row { display: flex; gap: 8px; }
.pw-row .field-input { flex: 1; }
.pw-toggle { width: 40px; height: 40px; border-radius: var(--radius-md); border: 1px solid var(--control-border); background: var(--control-bg); color: var(--text-subtle); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pw-toggle:hover { background: var(--control-bg-hover); color: var(--text-primary); }

.feedback-error { font-size: 12px; color: var(--danger-text); padding: 8px 12px; border-radius: var(--radius-sm); background: var(--danger-bg); border: 1px solid var(--danger-border); }
.feedback-success { font-size: 12px; color: var(--success-text); padding: 8px 12px; border-radius: var(--radius-sm); background: var(--success-bg); border: 1px solid var(--success-border); }

.danger-text { font-size: 13px; color: var(--danger-text); line-height: 1.5; margin: 0; }

.btn-primary { padding: 10px 20px; border-radius: var(--radius-md); border: none; background: var(--brand-gradient); color: white; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: opacity var(--transition); align-self: flex-start; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-danger-outline { padding: 9px 18px; border-radius: var(--radius-md); border: 1px solid var(--danger-border); background: transparent; color: var(--danger-text); font-size: 13px; font-weight: 600; cursor: pointer; align-self: flex-start; transition: background var(--transition); }
.btn-danger-outline:hover { background: var(--danger-bg); }

.confirm-btns { display: flex; gap: 10px; }
.btn-ghost { padding: 9px 16px; border-radius: var(--radius-md); border: 1px solid var(--control-border); background: transparent; color: var(--text-muted); font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-ghost:hover { background: var(--control-bg); }
.btn-danger { padding: 9px 18px; border-radius: var(--radius-md); border: none; background: var(--danger); color: white; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.btn-danger:hover:not(:disabled) { filter: brightness(0.9); }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
