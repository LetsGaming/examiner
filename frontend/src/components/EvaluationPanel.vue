<template>
  <div class="eval-panel" :class="`eval-panel--${evaluation.ihkGrade}`">

    <!-- Grade header -->
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

    <!-- Progress bar -->
    <div class="eval-progress-track">
      <div class="eval-progress-fill" :style="{ width: `${evaluation.percentageScore}%` }" />
    </div>

    <!-- Feedback text -->
    <div class="eval-feedback">{{ evaluation.feedbackText }}</div>

    <!-- Criteria breakdown -->
    <div v-if="evaluation.criterionScores?.length" class="eval-section">
      <div class="eval-section-title">Kriterienübersicht</div>
      <div v-for="(cs, i) in evaluation.criterionScores" :key="i" class="criterion-row">
        <div class="criterion-top">
          <span class="criterion-name">{{ cs.criterion }}</span>
          <span class="criterion-score" :style="{ color: criterionColor(cs.awarded, cs.max) }">
            {{ cs.awarded }}/{{ cs.max }}P
          </span>
        </div>
        <div class="criterion-bar-track">
          <div class="criterion-bar-fill" :style="{ width: cs.max > 0 ? `${Math.round((cs.awarded / cs.max) * 100)}%` : '0%', background: criterionColor(cs.awarded, cs.max) }" />
        </div>
        <div class="criterion-comment">{{ cs.comment }}</div>
      </div>
    </div>

    <!-- Diagram element analysis -->
    <div v-if="evaluation.detectedElements?.length || evaluation.missingElements?.length || evaluation.notationErrors?.length" class="eval-section">
      <div class="eval-section-title">Diagramm-Analyse</div>
      <div v-if="evaluation.detectedElements?.length" class="element-list element-list--ok">
        <div class="element-list-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
          Erkannte Elemente
        </div>
        <span v-for="el in evaluation.detectedElements" :key="el" class="element-tag element-tag--ok">{{ el }}</span>
      </div>
      <div v-if="evaluation.missingElements?.length" class="element-list element-list--missing">
        <div class="element-list-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
          Fehlende Elemente
        </div>
        <span v-for="el in evaluation.missingElements" :key="el" class="element-tag element-tag--missing">{{ el }}</span>
      </div>
      <div v-if="evaluation.notationErrors?.length" class="element-list element-list--error">
        <div class="element-list-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Notationsfehler
        </div>
        <span v-for="err in evaluation.notationErrors" :key="err" class="element-tag element-tag--error">{{ err }}</span>
      </div>
    </div>

    <!-- Mistakes and hints -->
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

    <div class="eval-model-info">Bewertet von {{ evaluation.modelUsed }}</div>
  </div>
</template>

<script setup lang="ts">
import type { AiEvaluation, IhkGrade } from '../types/index.js';

const IHK_GRADE_LABELS: Record<IhkGrade, string> = {
  sehr_gut:     'Sehr gut (1)',
  gut:          'Gut (2)',
  befriedigend: 'Befriedigend (3)',
  ausreichend:  'Ausreichend (4)',
  mangelhaft:   'Mangelhaft (5)',
  ungenuegend:  'Ungenügend (6)',
};

defineProps<{ evaluation: AiEvaluation; maxPoints: number }>();

function criterionColor(awarded: number, max: number): string {
  const p = max > 0 ? awarded / max : 0;
  if (p >= 0.8) return '#22c55e';
  if (p >= 0.5) return '#f59e0b';
  return '#ef4444';
}
</script>

<style scoped>
.eval-panel { margin-top: 24px; border-radius: 14px; overflow: hidden; border: 2px solid transparent; background: #16181f; }
.eval-panel--sehr_gut     { border-color: #22c55e; }
.eval-panel--gut          { border-color: #4f46e5; }
.eval-panel--befriedigend { border-color: #7c3aed; }
.eval-panel--ausreichend  { border-color: #f59e0b; }
.eval-panel--mangelhaft, .eval-panel--ungenuegend { border-color: #ef4444; }
.eval-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.07); }
.eval-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
.eval-grade { font-size: 22px; font-weight: 800; color: #f0f1f8; }
.eval-score-block { text-align: right; }
.eval-score-main { font-size: 28px; font-weight: 800; color: #f0f1f8; }
.eval-score-max  { font-size: 18px; font-weight: 400; color: #6b7280; }
.eval-percent    { font-size: 13px; color: #9ca3af; }
.eval-progress-track { height: 5px; background: rgba(255,255,255,0.06); }
.eval-progress-fill  { height: 100%; background: #4f46e5; transition: width 0.6s cubic-bezier(.4,0,.2,1); }
.eval-panel--sehr_gut .eval-progress-fill { background: #22c55e; }
.eval-panel--ausreichend .eval-progress-fill { background: #f59e0b; }
.eval-panel--mangelhaft .eval-progress-fill, .eval-panel--ungenuegend .eval-progress-fill { background: #ef4444; }
.eval-feedback { padding: 14px 20px; font-size: 14px; line-height: 1.65; color: #d1d5db; border-bottom: 1px solid rgba(255,255,255,0.07); }
.eval-section { padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.07); }
.eval-section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: #6b7280; margin-bottom: 12px; }
.eval-section-title--danger  { color: #f87171; }
.eval-section-title--success { color: #86efac; }
.criterion-row { margin-bottom: 14px; }
.criterion-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
.criterion-name  { font-size: 13px; font-weight: 500; color: #e8eaf0; }
.criterion-score { font-size: 12px; font-weight: 700; }
.criterion-bar-track { height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; margin-bottom: 4px; overflow: hidden; }
.criterion-bar-fill  { height: 100%; border-radius: 3px; transition: width 0.4s; }
.criterion-comment   { font-size: 12px; color: #6b7280; }
.element-list { margin-bottom: 12px; }
.element-list-header { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #9ca3af; margin-bottom: 8px; }
.element-tag { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; margin: 3px 4px 3px 0; }
.element-tag--ok      { background: rgba(34,197,94,0.15);  color: #86efac; border: 1px solid rgba(34,197,94,0.25); }
.element-tag--missing { background: rgba(239,68,68,0.15);  color: #fca5a5; border: 1px solid rgba(239,68,68,0.25); }
.element-tag--error   { background: rgba(245,158,11,0.15); color: #fcd34d; border: 1px solid rgba(245,158,11,0.25); }
.eval-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 600px) { .eval-two-col { grid-template-columns: 1fr; } }
.hint-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.hint-list li { font-size: 13px; line-height: 1.5; padding: 8px 12px; border-radius: 8px; }
.hint-list--danger  li { background: rgba(239,68,68,0.1);  color: #fca5a5; }
.hint-list--success li { background: rgba(34,197,94,0.1);  color: #86efac; }
.eval-model-info { padding: 8px 20px; font-size: 11px; color: #4b5563; text-align: right; }
</style>
