<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
        <ion-title>Prüfungsdetails</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="loading" class="center-container">
        <ion-spinner name="crescent" color="primary" />
      </div>

      <div v-else-if="exam" class="start-layout">
        <ion-card class="info-card">
          <ion-card-header>
            <ion-chip :color="partColor(exam.part)" outline>{{ PART_LABELS[exam.part] }}</ion-chip>
            <ion-card-title class="exam-title">{{ exam.title }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="stat-grid">
              <div class="stat-item">
                <ion-icon :icon="timeOutline" color="primary" />
                <div class="stat-value">{{ exam.durationMinutes }}</div>
                <div class="stat-label">Minuten</div>
              </div>
              <div class="stat-item">
                <ion-icon :icon="trophyOutline" color="warning" />
                <div class="stat-value">{{ exam.maxPoints }}</div>
                <div class="stat-label">Punkte</div>
              </div>
              <div class="stat-item">
                <ion-icon :icon="listOutline" color="secondary" />
                <div class="stat-value">{{ exam.tasks?.length ?? '—' }}</div>
                <div class="stat-label">Aufgaben</div>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-card class="hints-card">
          <ion-card-header>
            <ion-card-title>Hinweise</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list lines="none">
              <ion-item v-for="hint in hints" :key="hint">
                <ion-icon :icon="checkmarkCircleOutline" color="success" slot="start" />
                <ion-label class="ion-text-wrap">{{ hint }}</ion-label>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <ion-button
          expand="block"
          size="large"
          color="primary"
          class="start-button"
          :disabled="starting"
          @click="startExam"
        >
          <ion-spinner v-if="starting" name="crescent" slot="start" />
          <ion-icon v-else :icon="playOutline" slot="start" />
          {{ starting ? 'Wird gestartet...' : 'Prüfung starten' }}
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonChip, IonButton,
  IonButtons, IonBackButton, IonSpinner, IonIcon, IonList, IonItem, IonLabel,
} from '@ionic/vue'
import { timeOutline, trophyOutline, listOutline, checkmarkCircleOutline, playOutline } from 'ionicons/icons'
import { fetchExamTemplate, startSession } from '../composables/useApi.js'
import type { ExamTemplate, ExamPart } from '../types/index.js'

const route  = useRoute()
const router = useRouter()
const exam     = ref<ExamTemplate | null>(null)
const loading  = ref(true)
const starting = ref(false)

const PART_LABELS: Record<ExamPart, string> = {
  teil_1: 'Teil 1 — Planen',
  teil_2: 'Teil 2 — Entwicklung',
  teil_3: 'Teil 3 — WiSo',
}
const hints = [
  'Du kannst jederzeit zur Übersicht wechseln und Aufgaben überspringen.',
  'Deine Antworten werden automatisch zwischengespeichert.',
  'Die KI-Bewertung kann nach jeder Aufgabe manuell angefordert werden.',
  'Bei Zeitablauf wird die Prüfung automatisch abgegeben.',
]

function partColor(part: ExamPart): string {
  return { teil_1: 'primary', teil_2: 'secondary', teil_3: 'tertiary' }[part] ?? 'medium'
}

async function startExam() {
  if (!exam.value) return
  starting.value = true
  try {
    const sessionId = await startSession(exam.value.id)
    router.push(`/session/${sessionId}`)
  } catch (err) {
    console.error(err)
    starting.value = false
  }
}

onMounted(async () => {
  try {
    exam.value = await fetchExamTemplate(route.params.examId as string)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.center-container { display: flex; justify-content: center; padding: 60px 0; }
.start-layout     { max-width: 600px; margin: 0 auto; }
.info-card, .hints-card { border-radius: 14px; margin-bottom: 16px; }
.exam-title { font-size: 20px; font-weight: 700; margin-top: 10px; }
.stat-grid  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
.stat-item  { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 0; }
.stat-value { font-size: 24px; font-weight: 800; color: var(--ion-color-dark); }
.stat-label { font-size: 12px; color: var(--ion-color-medium); }
.start-button { margin-top: 8px; --border-radius: 12px; height: 54px; font-size: 16px; font-weight: 700; }
</style>
