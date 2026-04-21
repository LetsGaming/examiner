<template>
  <div class="eval-panel" :class="`eval-panel--${evaluation.ihkGrade}`">

    <!-- Note-Header -->
    <div class="eval-header">
      <div class="eval-grade-block">
        <div class="eval-label">KI-Bewertung</div>
        <div class="eval-grade">{{ IHK_GRADE_LABELS[evaluation.ihkGrade] }}</div>
      </div>
      <div class="eval-score-block">
        <div class="eval-score-main">{{ evaluation.awardedPoints }}<span class="eval-score-max">/{{ maxPoints }}</span></div>
        <div class="eval-percent">{{ evaluation.percentageScore }}%</div>
      </div>
    </div>

    <!-- Fortschrittsbalken -->
    <div class="eval-progress-track">
      <div
        class="eval-progress-fill"
        :style="{ width: `${evaluation.percentageScore}%` }"
      />
    </div>

    <!-- Feedback-Text -->
    <div class="eval-feedback">{{ evaluation.feedbackText }}</div>

    <!-- Kriterienübersicht -->
    <div v-if="evaluation.criterionScores?.length" class="eval-section">
      <div class="eval-section-title">Kriterienübersicht</div>
      <div
        v-for="(cs, i) in evaluation.criterionScores"
        :key="i"
        class="criterion-row"
      >
        <div class="criterion-top">
          <span class="criterion-name">{{ cs.criterion }}</span>
          <span class="criterion-score" :style="{ color: criterionColor(cs.awarded, cs.max) }">
            {{ cs.awarded }}/{{ cs.max }}P
          </span>
        </div>
        <div class="criterion-bar-track">
          <div
            class="criterion-bar-fill"
            :style="{
              width: cs.max > 0 ? `${Math.round((cs.awarded / cs.max) * 100)}%` : '0%',
              background: criterionColor(cs.awarded, cs.max),
            }"
          />
        </div>
        <div class="criterion-comment">{{ cs.comment }}</div>
      </div>
    </div>

    <!-- Diagramm-spezifisch: Erkannte / Fehlende Elemente -->
    <div v-if="evaluation.detectedElements?.length || evaluation.missingElements?.length" class="eval-section">
      <div class="eval-section-title">Diagramm-Analyse</div>

      <div v-if="evaluation.detectedElements?.length" class="element-list element-list--ok">
        <div class="element-list-header">
          <ion-icon :icon="checkmarkCircleOutline" color="success" />
          Erkannte Elemente
        </div>
        <div v-for="el in evaluation.detectedElements" :key="el" class="element-tag element-tag--ok">
          {{ el }}
        </div>
      </div>

      <div v-if="evaluation.missingElements?.length" class="element-list element-list--missing">
        <div class="element-list-header">
          <ion-icon :icon="closeCircleOutline" color="danger" />
          Fehlende Elemente
        </div>
        <div v-for="el in evaluation.missingElements" :key="el" class="element-tag element-tag--missing">
          {{ el }}
        </div>
      </div>

      <div v-if="evaluation.notationErrors?.length" class="element-list element-list--error">
        <div class="element-list-header">
          <ion-icon :icon="warningOutline" color="warning" />
          Notationsfehler
        </div>
        <div v-for="err in evaluation.notationErrors" :key="err" class="element-tag element-tag--error">
          {{ err }}
        </div>
      </div>
    </div>

    <!-- Fehler & Verbesserungshinweise -->
    <div v-if="evaluation.keyMistakes?.length || evaluation.improvementHints?.length" class="eval-section">
      <div class="eval-two-col">
        <div v-if="evaluation.keyMistakes?.length" class="eval-col">
          <div class="eval-section-title eval-section-title--danger">Fehler</div>
          <ul class="hint-list hint-list--danger">
            <li v-for="m in evaluation.keyMistakes" :key="m">{{ m }}</li>
          </ul>
        </div>
        <div v-if="evaluation.improvementHints?.length" class="eval-col">
          <div class="eval-section-title eval-section-title--success">Verbesserungshinweise</div>
          <ul class="hint-list hint-list--success">
            <li v-for="h in evaluation.improvementHints" :key="h">{{ h }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Model-Info -->
    <div class="eval-model-info">Bewertet von {{ evaluation.modelUsed }}</div>

  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { checkmarkCircleOutline, closeCircleOutline, warningOutline } from 'ionicons/icons'
import type { AiEvaluation, IhkGrade } from '../types/index.js'

const IHK_GRADE_LABELS: Record<IhkGrade, string> = {
  sehr_gut:      'Sehr gut (1)',
  gut:           'Gut (2)',
  befriedigend:  'Befriedigend (3)',
  ausreichend:   'Ausreichend (4)',
  mangelhaft:    'Mangelhaft (5)',
  ungenuegend:   'Ungenügend (6)',
}

defineProps<{
  evaluation: AiEvaluation
  maxPoints: number
}>()

function criterionColor(awarded: number, max: number): string {
  const p = max > 0 ? awarded / max : 0
  if (p >= 0.8) return 'var(--ion-color-success)'
  if (p >= 0.5) return 'var(--ion-color-warning)'
  return 'var(--ion-color-danger)'
}
</script>

<style scoped>
.eval-panel {
  margin-top: 24px;
  border-radius: 14px;
  overflow: hidden;
  border: 2px solid transparent;
}

.eval-panel--sehr_gut     { border-color: var(--ion-color-success); }
.eval-panel--gut          { border-color: var(--ion-color-primary); }
.eval-panel--befriedigend { border-color: var(--ion-color-secondary); }
.eval-panel--ausreichend  { border-color: var(--ion-color-warning); }
.eval-panel--mangelhaft, .eval-panel--ungenuegend { border-color: var(--ion-color-danger); }

/* Header */
.eval-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--ion-color-light);
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.eval-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ion-color-medium); margin-bottom: 4px; }
.eval-grade { font-size: 22px; font-weight: 800; color: var(--ion-color-dark); }

.eval-score-block { text-align: right; }
.eval-score-main  { font-size: 28px; font-weight: 800; color: var(--ion-color-dark); }
.eval-score-max   { font-size: 18px; font-weight: 400; color: var(--ion-color-medium); }
.eval-percent     { font-size: 13px; color: var(--ion-color-medium); }

/* Progress */
.eval-progress-track {
  height: 5px;
  background: var(--ion-color-light-shade);
}
.eval-progress-fill {
  height: 100%;
  background: var(--ion-color-primary);
  transition: width 0.6s cubic-bezier(.4, 0, .2, 1);
}

.eval-panel--sehr_gut     .eval-progress-fill { background: var(--ion-color-success); }
.eval-panel--gut          .eval-progress-fill { background: var(--ion-color-primary); }
.eval-panel--ausreichend  .eval-progress-fill { background: var(--ion-color-warning); }
.eval-panel--mangelhaft   .eval-progress-fill { background: var(--ion-color-danger); }
.eval-panel--ungenuegend  .eval-progress-fill { background: var(--ion-color-danger); }

/* Feedback */
.eval-feedback {
  padding: 14px 20px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--ion-color-dark-shade);
  border-bottom: 1px solid var(--ion-color-light-shade);
}

/* Sections */
.eval-section {
  padding: 14px 20px;
  border-bottom: 1px solid var(--ion-color-light-shade);
}
.eval-section-title {
  font-size: 11px; font-weight: 700; letter-spacing: 0.07em;
  text-transform: uppercase; color: var(--ion-color-medium);
  margin-bottom: 12px;
}
.eval-section-title--danger  { color: var(--ion-color-danger-shade); }
.eval-section-title--success { color: var(--ion-color-success-shade); }

/* Criteria */
.criterion-row    { margin-bottom: 14px; }
.criterion-top    { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
.criterion-name   { font-size: 13px; font-weight: 500; color: var(--ion-color-dark); }
.criterion-score  { font-size: 12px; font-weight: 700; }
.criterion-bar-track {
  height: 6px;
  background: var(--ion-color-light-shade);
  border-radius: 3px;
  margin-bottom: 4px;
  overflow: hidden;
}
.criterion-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }
.criterion-comment { font-size: 12px; color: var(--ion-color-medium); }

/* Diagram Element Tags */
.element-list       { margin-bottom: 12px; }
.element-list-header {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600;
  color: var(--ion-color-medium-shade);
  margin-bottom: 8px;
}
.element-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  margin: 3px 4px 3px 0;
}
.element-tag--ok      { background: var(--ion-color-success-tint); color: var(--ion-color-success-shade); border: 1px solid var(--ion-color-success-tint); }
.element-tag--missing { background: var(--ion-color-danger-tint);  color: var(--ion-color-danger-shade);  border: 1px solid var(--ion-color-danger-tint); }
.element-tag--error   { background: var(--ion-color-warning-tint); color: var(--ion-color-warning-shade); border: 1px solid var(--ion-color-warning-tint); }

/* Hints */
.eval-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 600px) { .eval-two-col { grid-template-columns: 1fr; } }

.hint-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.hint-list li {
  font-size: 13px; line-height: 1.5;
  padding: 8px 12px;
  border-radius: 8px;
}
.hint-list--danger  li { background: var(--ion-color-danger-tint);  color: var(--ion-color-danger-shade); }
.hint-list--success li { background: var(--ion-color-success-tint); color: var(--ion-color-success-shade); }

/* Model Info */
.eval-model-info {
  padding: 8px 20px;
  font-size: 11px;
  color: var(--ion-color-medium);
  text-align: right;
}
</style>
