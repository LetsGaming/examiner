<template>
  <ion-page>
  <div class="results-page">

    <header class="results-header">
      <button class="back-btn" @click="router.push('/')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
        Übersicht
      </button>
      <div class="header-title">Prüfungsergebnis</div>
      <div />
    </header>

    <div v-if="loading" class="results-loading">
      <div class="loading-spinner" />
      <p>Bewertungen werden geladen…</p>
    </div>

    <main v-else class="results-main">

      <!-- ─── Score Hero ─── -->
      <div class="score-hero" :class="`grade-${ihkGrade}`">
        <div class="score-label">Gesamtergebnis</div>
        <div class="score-grade">{{ IHK_GRADE_LABELS[ihkGrade as IhkGrade] ?? ihkGrade }}</div>
        <div class="score-pts">{{ totalScore }} / {{ maxPoints }} Punkte</div>
        <div class="score-bar-wrap">
          <div class="score-bar" :style="{ width: percentageScore + '%' }" />
        </div>
        <div class="score-pct">{{ percentageScore }}%</div>
      </div>

      <!-- ─── Aufgaben Detail ─── -->
      <section v-if="taskResults.length" class="detail-section">
        <h2 class="section-heading">Aufgaben im Detail</h2>

        <div v-for="(task, ti) in taskResults" :key="task.id" class="task-block">
          <div class="task-block-header">
            <span class="task-block-num">{{ ti + 1 }}</span>
            <span class="task-block-topic">{{ task.topicArea }}</span>
            <span class="task-block-pts" :class="pointsClass(task.earnedPoints, task.maxPoints)">
              {{ task.earnedPoints ?? '–' }} / {{ task.maxPoints }} P
            </span>
          </div>

          <div v-for="st in task.subtasks" :key="st.id" class="subtask-result">
            <div class="str-header">
              <span class="str-label">{{ st.label }})</span>
              <span class="str-type">{{ st.taskType }}</span>
              <span class="str-pts" :class="st.evaluation ? pointsClass(st.evaluation.awardedPoints, st.points) : ''">
                {{ st.evaluation?.awardedPoints ?? '–' }} / {{ st.points }} P
              </span>
              <span v-if="st.evaluation" class="str-grade" :class="`grade-chip-${st.evaluation.ihkGrade}`">
                {{ gradeShort(st.evaluation.ihkGrade) }}
              </span>
            </div>

            <p class="str-question">{{ truncate(st.questionText, 140) }}</p>

            <div v-if="st.answer" class="str-answer">
              <div class="str-answer-label">Deine Antwort</div>
              <p>{{ truncate(st.answer, 200) }}</p>
            </div>

            <div v-if="st.evaluation" class="str-eval">
              <div class="str-eval-bar">
                <div class="str-eval-fill" :style="{ width: st.evaluation.percentageScore + '%' }" :class="`fill-${st.evaluation.ihkGrade}`" />
              </div>
              <p class="str-feedback">{{ st.evaluation.feedbackText }}</p>
              <div v-if="st.evaluation.keyMistakes?.length" class="str-list str-list-danger">
                <div class="str-list-label">Fehler</div>
                <ul><li v-for="m in st.evaluation.keyMistakes" :key="m">{{ m }}</li></ul>
              </div>
              <div v-if="st.evaluation.improvementHints?.length" class="str-list str-list-hint">
                <div class="str-list-label">Tipps</div>
                <ul><li v-for="h in st.evaluation.improvementHints" :key="h">{{ h }}</li></ul>
              </div>
            </div>
            <div v-else class="str-no-eval">Keine Bewertung verfügbar</div>
          </div>
        </div>
      </section>

      <!-- ─── Notenspiegel ─── -->
      <section class="grade-table-section">
        <h2 class="section-heading">IHK-Notenschlüssel</h2>
        <table class="grade-table">
          <tbody>
            <tr v-for="g in GRADES" :key="g.key" :class="{ active: g.key === ihkGrade }">
              <td class="gt-range">{{ g.min }}–{{ g.max }} %</td>
              <td class="gt-label">{{ g.label }}</td>
              <td class="gt-check">{{ g.key === ihkGrade ? '✓' : '' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <button class="new-exam-btn" @click="router.push('/')">Neue Prüfung starten</button>

    </main>
  </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchSession } from '../composables/useApi.js'
import { IonPage } from '@ionic/vue'
import { IHK_GRADE_LABELS } from '../types/index.js'
import type { IhkGrade } from '../types/index.js'

const route  = useRoute()
const router = useRouter()

const totalScore      = Number(route.query.totalScore)
const maxPoints       = Number(route.query.maxPoints)
const percentageScore = Number(route.query.percentageScore)
const ihkGrade        = route.query.ihkGrade as string
const sessionId       = route.params.sessionId as string
const loading = ref(true)

interface SubtaskResult {
  id: string; label: string; taskType: string; questionText: string; points: number
  answer?: string
  evaluation?: { awardedPoints: number; percentageScore: number; ihkGrade: string; feedbackText: string; keyMistakes: string[]; improvementHints: string[] }
}
interface TaskResult { id: string; topicArea?: string; maxPoints: number; earnedPoints?: number; subtasks: SubtaskResult[] }
const taskResults = ref<TaskResult[]>([])

const GRADES = [
  { key: 'sehr_gut',     min: 92, max: 100, label: 'Sehr gut (1)'      },
  { key: 'gut',          min: 81, max: 91,  label: 'Gut (2)'           },
  { key: 'befriedigend', min: 67, max: 80,  label: 'Befriedigend (3)'  },
  { key: 'ausreichend',  min: 50, max: 66,  label: 'Ausreichend (4)'   },
  { key: 'mangelhaft',   min: 30, max: 49,  label: 'Mangelhaft (5)'    },
  { key: 'ungenuegend',  min: 0,  max: 29,  label: 'Ungenügend (6)'    },
]

function gradeShort(g: string) {
  return ({ sehr_gut: '1', gut: '2', befriedigend: '3', ausreichend: '4', mangelhaft: '5', ungenuegend: '6' })[g] ?? g
}
function pointsClass(earned?: number, max?: number) {
  if (earned == null || max == null) return ''
  const pct = earned / max
  if (pct >= 0.8) return 'pts-good'
  if (pct >= 0.5) return 'pts-ok'
  return 'pts-bad'
}
function truncate(text: string, n: number) { return text.length > n ? text.slice(0, n) + '…' : text }

onMounted(async () => {
  try {
    const session = await fetchSession(sessionId)
    if (!session.examTemplate) return
    taskResults.value = session.examTemplate.tasks.map(task => {
      const subtasks = task.subtasks.map(st => {
        const ans = session.answers?.find(a => a.subtaskId === st.id)
        return {
          id: st.id, label: st.label, taskType: st.taskType,
          questionText: st.questionText, points: st.points,
          answer: ans?.textValue || ans?.selectedMcOption || undefined,
          evaluation: ans?.evaluation ?? undefined,
        }
      })
      const earned = subtasks.reduce((s, st) => s + (st.evaluation?.awardedPoints ?? 0), 0)
      return { id: task.id, topicArea: task.topicArea, maxPoints: task.maxPoints, earnedPoints: earned, subtasks }
    })
  } finally { loading.value = false }
})
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.results-page { min-height: 100vh; background: #0f1117; color: #e8eaf0; font-family: 'Inter', system-ui, sans-serif; }

.results-header {
  display: grid; grid-template-columns: 1fr auto 1fr;
  align-items: center; padding: 16px 24px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  position: sticky; top: 0; background: #0f1117; z-index: 10;
}
.back-btn {
  display: flex; align-items: center; gap: 6px;
  background: none; border: 1px solid rgba(255,255,255,.12); border-radius: 8px;
  padding: 7px 14px; font-size: 13px; font-weight: 500; color: #9ca3af; cursor: pointer;
  transition: all .15s; width: fit-content;
}
.back-btn:hover { color: #e8eaf0; border-color: rgba(255,255,255,.25); }
.header-title { font-size: 15px; font-weight: 700; color: #f0f1f8; text-align: center; }

.results-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; gap: 16px; color: #6b7280; }
.loading-spinner { width: 32px; height: 32px; border-radius: 50%; border: 3px solid rgba(255,255,255,.1); border-top-color: #4f46e5; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.results-main { max-width: 740px; margin: 0 auto; padding: 32px 20px 60px; }

/* ─── Score Hero ─── */
.score-hero {
  border-radius: 16px; padding: 28px 24px 20px; margin-bottom: 32px;
  text-align: center; border: 1px solid rgba(255,255,255,.08);
}
.grade-sehr_gut     { background: rgba(34,197,94,.12);  border-color: rgba(34,197,94,.3); }
.grade-gut          { background: rgba(79,70,229,.12);  border-color: rgba(79,70,229,.3); }
.grade-befriedigend { background: rgba(124,58,237,.12); border-color: rgba(124,58,237,.3); }
.grade-ausreichend  { background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.3); }
.grade-mangelhaft, .grade-ungenuegend { background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.3); }

.score-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; margin-bottom: 6px; }
.score-grade { font-size: 28px; font-weight: 800; color: #f0f1f8; margin-bottom: 4px; }
.score-pts   { font-size: 15px; color: #9ca3af; margin-bottom: 14px; }
.score-bar-wrap { height: 6px; background: rgba(255,255,255,.1); border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
.score-bar   { height: 100%; background: #4f46e5; border-radius: 3px; transition: width .6s ease; }
.score-pct   { font-size: 13px; color: #6b7280; }

/* ─── Sections ─── */
.section-heading { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #6b7280; margin-bottom: 14px; }
.detail-section { margin-bottom: 36px; }

/* ─── Task Block ─── */
.task-block { margin-bottom: 20px; }
.task-block-header {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 10px 10px 0 0;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08);
  border-bottom: none;
}
.task-block-num {
  width: 24px; height: 24px; border-radius: 6px;
  background: rgba(255,255,255,.1); display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #9ca3af; flex-shrink: 0;
}
.task-block-topic { flex: 1; font-size: 13px; font-weight: 600; color: #d1d5db; }
.task-block-pts   { font-size: 13px; font-weight: 700; }

.pts-good { color: #86efac; }
.pts-ok   { color: #fcd34d; }
.pts-bad  { color: #fca5a5; }

/* ─── Subtask Result ─── */
.subtask-result {
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07);
  border-top: none; padding: 14px 16px;
}
.subtask-result:last-child { border-radius: 0 0 10px 10px; }

.str-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.str-label  { font-size: 13px; font-weight: 700; color: #818cf8; min-width: 20px; }
.str-type   { font-size: 11px; color: #6b7280; flex: 1; }
.str-pts    { font-size: 12px; font-weight: 600; }
.str-grade  { padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.grade-chip-sehr_gut     { background: rgba(34,197,94,.2);  color: #86efac; }
.grade-chip-gut          { background: rgba(79,70,229,.2);  color: #a5b4fc; }
.grade-chip-befriedigend { background: rgba(124,58,237,.2); color: #c4b5fd; }
.grade-chip-ausreichend  { background: rgba(245,158,11,.2); color: #fcd34d; }
.grade-chip-mangelhaft, .grade-chip-ungenuegend { background: rgba(239,68,68,.2); color: #fca5a5; }

.str-question { font-size: 12px; color: #6b7280; margin-bottom: 8px; line-height: 1.5; }
.str-answer { background: rgba(255,255,255,.04); border-radius: 6px; padding: 8px 10px; margin-bottom: 10px; }
.str-answer-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #4b5563; margin-bottom: 4px; }
.str-answer p { font-size: 12px; color: #9ca3af; line-height: 1.5; }

.str-eval-bar { height: 3px; background: rgba(255,255,255,.08); border-radius: 2px; overflow: hidden; margin-bottom: 8px; }
.str-eval-fill { height: 100%; border-radius: 2px; }
.fill-sehr_gut { background: #22c55e; }
.fill-gut { background: #4f46e5; }
.fill-befriedigend { background: #7c3aed; }
.fill-ausreichend { background: #f59e0b; }
.fill-mangelhaft, .fill-ungenuegend { background: #ef4444; }

.str-feedback { font-size: 13px; color: #d1d5db; line-height: 1.6; margin-bottom: 8px; }
.str-list { margin-top: 6px; }
.str-list-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 4px; }
.str-list-danger .str-list-label { color: #f87171; }
.str-list-hint   .str-list-label { color: #fbbf24; }
.str-list ul { padding-left: 16px; }
.str-list li  { font-size: 12px; color: #9ca3af; line-height: 1.6; }
.str-no-eval { font-size: 12px; color: #4b5563; font-style: italic; }

/* ─── Grade Table ─── */
.grade-table-section { margin-bottom: 32px; }
.grade-table { width: 100%; border-collapse: collapse; }
.grade-table td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,.05); }
.grade-table tr:last-child td { border-bottom: none; }
.grade-table tr.active td { color: #f0f1f8; background: rgba(79,70,229,.15); }
.gt-range { font-family: monospace; font-size: 12px; color: #6b7280; width: 80px; }
.gt-label { color: #9ca3af; }
.grade-table tr.active .gt-label { color: #a5b4fc; font-weight: 600; }
.gt-check { color: #22c55e; font-weight: 700; text-align: right; }

.new-exam-btn {
  width: 100%; padding: 13px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white;
  font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity .15s;
}
.new-exam-btn:hover { opacity: .9; }
</style>
