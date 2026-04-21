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
        </div>

        <div class="parts-list">
          <div v-for="p in PARTS" :key="p.value" class="part-row">

            <div class="part-info">
              <div class="part-number">{{ p.number }}</div>
              <div class="part-details">
                <div class="part-name">{{ p.label }}</div>
                <div class="part-meta">{{ p.duration }} Min &middot; {{ p.points }} Punkte &middot; {{ p.taskCount }} Aufgaben</div>
              </div>
              <div class="part-pool" :class="(poolStatus[p.value] ?? 0) >= POOL_MIN ? 'pool-ok' : 'pool-low'">
                <span class="pool-dot" />
                <span>{{ poolStatus[p.value] ?? '…' }} im Pool</span>
                <button
                  v-if="generating !== p.value + '_gen'"
                  class="pool-add"
                  :disabled="generating !== null"
                  @click.stop="addToPool(p.value)"
                  title="Neue Aufgaben generieren"
                >+</button>
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
                :class="[`btn-${p.color}`, { 'btn-disabled': generating !== null }]"
                :disabled="generating !== null"
                @click="startExam(p.value)"
              >
                <span v-if="generating !== null" class="btn-wait-spinner" />
                <template v-else>
                  Prüfung starten
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
                </template>
              </button>
            </template>

            <p v-if="errors[p.value]" class="part-error">{{ errors[p.value] }}</p>
          </div>
        </div>

      </div>
    </main>
  </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage } from '@ionic/vue'
import { API_BASE_URL } from '../constants.js'

const router = useRouter()
const API = API_BASE_URL

const generating   = ref<string | null>(null)
const statusMessage = ref('')
const poolStatus   = ref<Record<string, number>>({})
const errors       = ref<Record<string, string>>({})
const POOL_MIN = 5

const PARTS = [
  { value: 'teil_1', number: '1', label: 'Planen eines Softwareproduktes',           color: 'blue',   duration: 90, points: 100, taskCount: 4 },
  { value: 'teil_2', number: '2', label: 'Entwicklung und Umsetzung von Algorithmen', color: 'purple', duration: 90, points: 100, taskCount: 4 },
  { value: 'teil_3', number: '3', label: 'Wirtschafts- und Sozialkunde',              color: 'teal',   duration: 60, points: 100, taskCount: 8 },
]

async function loadPoolStatus() {
  try {
    const res = await fetch(`${API}/exams/pool-status`)
    const data = await res.json()
    if (data.success) {
      const s: Record<string, number> = {}
      for (const p of data.data.parts) s[p.part] = p.total
      poolStatus.value = s
    }
  } catch { /* ignore */ }
}

async function addToPool(part: string) {
  generating.value = part + '_gen'
  errors.value[part] = ''
  try {
    const res = await fetch(`${API}/exams/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ part, count: 4 }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    await loadPoolStatus()
  } catch (err) {
    errors.value[part] = err instanceof Error ? err.message : 'Fehler'
  } finally {
    generating.value = null
  }
}

async function startExam(part: string) {
  generating.value = part
  statusMessage.value = 'Prüfung wird zusammengestellt…'
  errors.value[part] = ''
  try {
    let res = await fetch(`${API}/exams/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ part }),
    })
    let data = await res.json()

    if (!data.success && data.needsGeneration) {
      statusMessage.value = 'Pool leer — generiere Aufgaben…'
      const gen = await fetch(`${API}/exams/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part, count: 6 }),
      })
      const genData = await gen.json()
      if (!genData.success) throw new Error(genData.error)
      await loadPoolStatus()
      statusMessage.value = 'Prüfung wird zusammengestellt…'
      res  = await fetch(`${API}/exams/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part }),
      })
      data = await res.json()
    }
    if (!data.success) throw new Error(data.error)
    router.push(`/session/${data.data.sessionId}`)
  } catch (err) {
    errors.value[part] = err instanceof Error ? err.message : 'Fehler'
  } finally {
    generating.value = null
  }
}

onMounted(loadPoolStatus)
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.home-page {
  min-height: 100vh;
  background: #0f1117;
  color: #e8eaf0;
  font-family: 'Inter', system-ui, sans-serif;
  display: flex; flex-direction: column;
}

/* ─── Header ─── */
.home-header {
  padding: 20px 32px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  display: flex; align-items: center;
}
.home-logo { display: flex; align-items: center; gap: 12px; }
.logo-badge {
  width: 40px; height: 40px; border-radius: 10px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800; color: white; letter-spacing: .05em;
}
.logo-title { font-size: 16px; font-weight: 700; color: #f0f1f8; }
.logo-sub   { font-size: 11px; color: #6b7280; margin-top: 1px; }

/* ─── Main ─── */
.home-main { flex: 1; padding: 40px 32px; max-width: 960px; margin: 0 auto; width: 100%; }

.home-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 48px; align-items: start; }

/* ─── Intro ─── */
.intro-headline {
  font-size: 32px; font-weight: 800; line-height: 1.2;
  color: #f0f1f8; margin-bottom: 14px;
}
.intro-text { font-size: 14px; line-height: 1.7; color: #9ca3af; margin-bottom: 20px; }
.intro-badges { display: flex; flex-wrap: wrap; gap: 8px; }
.badge {
  padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;
  background: rgba(79,70,229,.15); color: #818cf8;
  border: 1px solid rgba(79,70,229,.3);
}

/* ─── Parts ─── */
.parts-list { display: flex; flex-direction: column; gap: 12px; }

.part-row {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 14px;
  padding: 18px 20px;
  transition: border-color .2s;
}
.part-row:hover { border-color: rgba(255,255,255,.14); }

.part-info { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.part-number {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 800; color: #9ca3af; flex-shrink: 0;
}
.part-details { flex: 1; min-width: 0; }
.part-name { font-size: 14px; font-weight: 600; color: #e8eaf0; }
.part-meta { font-size: 12px; color: #6b7280; margin-top: 2px; }

.part-pool {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 500; white-space: nowrap;
  padding: 4px 10px; border-radius: 20px;
  background: rgba(255,255,255,.04);
}
.pool-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.pool-ok  .pool-dot { background: #22c55e; }
.pool-low .pool-dot { background: #f59e0b; }
.pool-ok  { color: #86efac; }
.pool-low { color: #fcd34d; }
.pool-add {
  background: none; border: none; cursor: pointer;
  color: inherit; font-size: 15px; font-weight: 700;
  padding: 0 2px; line-height: 1; opacity: 0.7;
  transition: opacity .15s;
}
.pool-add:hover { opacity: 1; }
.pool-spinner { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

.part-generating {
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: #9ca3af; padding: 4px 0 6px;
}
.generating-spinner {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.1); border-top-color: #4f46e5;
  animation: spin 0.8s linear infinite; flex-shrink: 0;
}

.part-start-btn {
  width: 100%; padding: 11px 20px; border-radius: 10px; border: none;
  font-size: 14px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: opacity .15s, transform .1s;
}
.part-start-btn:hover:not(:disabled)  { opacity: .9; }
.part-start-btn:active:not(:disabled) { transform: scale(.98); }
.part-start-btn:disabled { cursor: not-allowed; }
.part-start-btn.btn-disabled { opacity: .45; filter: grayscale(0.3); }
.btn-wait-spinner {
  width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,.35); border-top-color: white;
  animation: spin .8s linear infinite;
}
.btn-blue   { background: linear-gradient(135deg, #4f46e5, #4338ca); color: white; }
.btn-purple { background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; }
.btn-teal   { background: linear-gradient(135deg, #0d9488, #0f766e); color: white; }

.part-error { font-size: 12px; color: #f87171; margin-top: 8px; }

@media (max-width: 700px) {
  .home-main   { padding: 24px 16px; }
  .home-header { padding: 16px; }
  .home-grid   { grid-template-columns: 1fr; gap: 32px; }
}
</style>
