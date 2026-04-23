<template>
  <ion-page>
    <div v-if="loading" class="page-loading">
      <div class="loading-spinner" />
      <p>Prüfung wird geladen…</p>
    </div>

    <ExamView
      v-else-if="session?.examTemplate"
      :session-id="session.id"
      :exam-part="session.examTemplate.part"
      :tasks="session.examTemplate.tasks"
      :scenario-name="session.examTemplate.scenarioName"
      :scenario-description="session.examTemplate.scenarioDescription"
      :exam-title="session.examTemplate.title"
      @submitted="onSubmitted"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonPage } from '@ionic/vue';
import ExamView from '../components/exam/ExamView.vue';
import { fetchSession } from '../composables/useApi.js';
import type { ExamSession } from '../types/index.js';

const route   = useRoute();
const router  = useRouter();
const session = ref<ExamSession | null>(null);
const loading = ref(true);

async function onSubmitted(result: { totalScore: number; maxPoints: number; percentageScore: number; ihkGrade: string }) {
  router.push({ name: 'Results', params: { sessionId: route.params.sessionId }, query: { ...result } });
}

onMounted(async () => {
  try {
    session.value = await fetchSession(route.params.sessionId as string);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page-loading {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 100vh; gap: 16px;
  background: var(--bg-base); color: var(--text-muted);
}
.loading-spinner {
  width: 36px; height: 36px; border-radius: 50%;
  border: 3px solid var(--border); border-top-color: var(--brand);
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
