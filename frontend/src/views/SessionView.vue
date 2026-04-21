<template>
  <ion-page>
  <div v-if="loading" class="session-loading">
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
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonPage } from '@ionic/vue'
import ExamView from '../components/ExamView.vue'
import { fetchSession } from '../composables/useApi.js'
import type { ExamSession } from '../types/index.js'

const route   = useRoute()
const router  = useRouter()
const session = ref<ExamSession | null>(null)
const loading = ref(true)

async function onSubmitted(result: { totalScore: number; maxPoints: number; percentageScore: number; ihkGrade: string }) {
  router.push({
    name: 'Results',
    params: { sessionId: route.params.sessionId },
    query: { ...result },
  })
}

onMounted(async () => {
  try {
    session.value = await fetchSession(route.params.sessionId as string)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.session-loading {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 100vh; gap: 16px;
  background: #0f1117; color: #9ca3af;
}
.loading-spinner {
  width: 36px; height: 36px; border-radius: 50%;
  border: 3px solid rgba(255,255,255,.1); border-top-color: #4f46e5;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
