<template>
  <ion-page>
    <div class="home-page">
      <HomeHeader
        :specialty="specialty"
        :user="user"
        :is-admin="Boolean(user?.isAdmin) ?? false"
        :theme="theme"
        :review-count="reviewCount"
        :key-badge-label="keyBadgeLabel"
        :key-badge-class="keyBadgeClass"
        @update:specialty="onSpecialtyUpdate"
        @logout="logout"
        @nav-account="router.push('/account')"
        @nav-admin="router.push('/admin')"
        @nav-stats="router.push('/stats')"
        @nav-history="router.push('/history')"
        @nav-practice="router.push('/practice')"
        @nav-review="router.push('/review')"
        @toggle-theme="toggleTheme"
        @open-ai-settings="aiSettings.open"
      />

      <main class="home-main">
        <div class="home-grid">
          <HomeIntro
            :specialty="specialty"
            :has-key="aiSettings.settings.value.hasKey"
            :provider-label="aiSettings.currentProviderLabel.value"
            :provider-model="aiSettings.currentProviderModel.value"
            @open-ai-settings="aiSettings.open"
          />

          <div class="parts-list">
            <ExamPartCard
              v-for="p in PARTS"
              :key="p.value"
              :part="p"
              :label="labelForPart(p.value, specialty)"
              :pool-count="pool.status.value[p.value] ?? null"
              :pool-min="POOL_MIN"
              :generating="pool.generating.value"
              :status-message="pool.statusMessage.value"
              :error="pool.errors.value[p.value]"
              :warnings="pool.warnings.value[p.value]"
              @add-to-pool="pool.addToPool(p.value, specialty)"
              @launch="launch(p.value)"
            />
          </div>
        </div>
      </main>
    </div>

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
/**
 * HomeView — Shell für die Startseite.
 *
 * Verantwortlichkeiten:
 *  - Auth + Theme + Specialty-State aus Composables beziehen
 *  - Pool- und AI-Settings-Composables instanziieren und an Kinder durchreichen
 *  - Review-Count beim Mount laden (best-effort, Fehler werden geschluckt)
 *  - Tab-übergreifende Navigation an router.push delegieren
 *
 * Business-Logik lebt in den Composables (`usePool`, `useAiSettings`,
 * `useTheme`, `useAuth`, `useSpecialty`). Rendering in Header/Intro/PartCard.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage } from '@ionic/vue';

import { useAuth } from '../composables/useAuth.js';
import { useSpecialty } from '../composables/useSpecialty.js';
import { useAiSettings } from '../composables/useAiSettings.js';
import { usePool, POOL_MIN } from '../composables/usePool.js';
import { useTheme } from '../composables/useTheme.js';
import { fetchReviewDue } from '../composables/useApi.js';
import AiSettingsModal from '../components/ui/AiSettingsModal.vue';
import type { ExamPart } from '../types/index.js';

import HomeHeader from './home/components/HomeHeader.vue';
import HomeIntro from './home/components/HomeIntro.vue';
import ExamPartCard from './home/components/ExamPartCard.vue';
import { PARTS, labelForPart } from './home/config.js';

const router = useRouter();
const { user, logout } = useAuth();
const { specialty } = useSpecialty();
const aiSettings = useAiSettings();
const pool = usePool();
const { theme, init: initTheme, toggle: toggleTheme } = useTheme();
const reviewCount = ref(0);

// ── Derived UI state ────────────────────────────────────────────────────────
const keyBadgeLabel = computed(() => {
  const s = aiSettings.settings.value.keySource;
  if (s === 'user') return 'Eigener Key';
  if (s === 'env') return 'Server-Key';
  return 'Kein Key';
});

const keyBadgeClass = computed(() => {
  const s = aiSettings.settings.value.keySource;
  if (s === 'user') return 'badge-key-user';
  if (s === 'env') return 'badge-key-env';
  return 'badge-key-missing';
});

// ── Actions ─────────────────────────────────────────────────────────────────
function onSpecialtyUpdate(next: string): void {
  // Spezialisierungs-Toggle feuert — `useSpecialty` pflegt den Ref, wir refreshen
  // den Pool-Status mit dem neuen Wert. Die Ref-Mutation läuft bereits implizit
  // über das v-model im Toggle → useSpecialty.
  specialty.value = next as 'fiae' | 'fisi';
  pool.loadStatus(specialty.value);
}

async function launch(part: ExamPart): Promise<void> {
  try {
    const sessionId = await pool.launchExam(part, specialty.value);
    router.push(`/session/${sessionId}`);
  } catch {
    // Fehler sind bereits in pool.errors gespeichert und werden in der PartCard angezeigt.
  }
}

onMounted(async () => {
  await Promise.all([pool.loadStatus(specialty.value), aiSettings.load()]);
  initTheme();
  // Review-Count ist non-kritisch — wenn der Endpoint noch nicht existiert
  // (z.B. neue Installation) oder der User nicht eingeloggt ist, einfach 0 lassen.
  try {
    const r = await fetchReviewDue();
    reviewCount.value = r.count;
  } catch {
    /* ignore */
  }
});
</script>

<style>
@import './home/home.css';
</style>
