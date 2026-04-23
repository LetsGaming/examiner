<template>
  <ion-page>
    <div class="review-start">
      <div v-if="loading" class="review-loading">
        <div class="spinner" />
        <span>Wiederholungs-Session wird gestartet…</span>
      </div>
      <div v-else-if="error" class="review-error">
        <p>{{ error }}</p>
        <button @click="router.push('/home')">Zurück</button>
      </div>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { IonPage } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { startReviewSession } from '../composables/useApi.js';

const router = useRouter();
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const { sessionId } = await startReviewSession(5);
    router.replace(`/session/${sessionId}`);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Fehler';
    loading.value = false;
  }
});
</script>

<style scoped>
.review-start { min-height: 100vh; background: var(--bg-base); display: flex; align-items: center; justify-content: center; }
.review-loading, .review-error { display: flex; flex-direction: column; align-items: center; gap: 16px; color: var(--text-muted); font-size: 15px; }
.spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--brand-text); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.review-error button { padding: 8px 20px; background: var(--brand-bg); border: 1px solid var(--brand-border); border-radius: var(--radius-sm); color: var(--brand-text); cursor: pointer; }
</style>
