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

    <!-- Feature 4: Musterlösung -->
    <div v-if="expectedAnswer" class="eval-section eval-solution">
      <button class="solution-toggle" @click="solutionOpen = !solutionOpen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        Musterlösung anzeigen
        <svg class="solution-chevron" :class="{ 'solution-chevron--open': solutionOpen }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div v-if="solutionOpen" class="solution-body">
        <!-- MC / MC-Multi -->
        <template v-if="taskType === 'mc' || taskType === 'mc_multi'">
          <div v-if="expectedAnswer.correctOption" class="solution-item">
            <span class="solution-label">Richtige Antwort:</span>
            <span class="solution-option-badge">{{ expectedAnswer.correctOption }}</span>
          </div>
          <div v-if="expectedAnswer.correctOptions?.length" class="solution-item">
            <span class="solution-label">Richtige Antworten:</span>
            <span v-for="opt in expectedAnswer.correctOptions" :key="opt" class="solution-option-badge">{{ opt }}</span>
          </div>
          <p v-if="expectedAnswer.explanation" class="solution-explanation">{{ expectedAnswer.explanation }}</p>
        </template>

        <!-- SQL -->
        <template v-else-if="taskType === 'sql'">
          <pre v-if="expectedAnswer.solutionSql" class="solution-code">{{ expectedAnswer.solutionSql }}</pre>
          <ul v-if="expectedAnswer.keyPoints?.length" class="solution-list">
            <li v-for="(pt, i) in expectedAnswer.keyPoints" :key="i">{{ pt }}</li>
          </ul>
        </template>

        <!-- PlantUML / Diagram -->
        <template v-else-if="taskType === 'plantuml' || taskType === 'diagram_upload'">
          <ul v-if="expectedAnswer.expectedElements?.length" class="solution-checklist">
            <li v-for="(el, i) in expectedAnswer.expectedElements" :key="i">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#86efac" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              {{ el }}
            </li>
          </ul>
          <ul v-if="expectedAnswer.keyPoints?.length" class="solution-list">
            <li v-for="(pt, i) in expectedAnswer.keyPoints" :key="i">{{ pt }}</li>
          </ul>
        </template>

        <!-- Default: Freitext / Pseudocode / Table -->
        <template v-else>
          <!-- Table: exampleRow als ausgefüllte Tabelle -->
          <div v-if="taskType === 'table' && expectedAnswer.exampleRow?.length" class="solution-table-wrap">
            <div class="solution-label" style="margin-bottom:6px">Beispiel-Zeile:</div>
            <table class="solution-table">
              <tr>
                <td v-for="(cell, i) in expectedAnswer.exampleRow" :key="i" class="solution-table-cell">{{ cell }}</td>
              </tr>
            </table>
          </div>
          <div v-if="!expectedAnswer.keyPoints?.length && taskType !== 'table'" class="solution-empty">
            Für diese Aufgabe ist keine strukturierte Musterlösung hinterlegt.
          </div>
          <ul v-if="expectedAnswer.keyPoints?.length" class="solution-list">
            <li v-for="(pt, i) in expectedAnswer.keyPoints" :key="i">{{ pt }}</li>
          </ul>
          <p v-if="expectedAnswer.explanation" class="solution-explanation">{{ expectedAnswer.explanation }}</p>
        </template>
      </div>
    </div>

    <!-- Feature 9: Zweitbewertung -->
    <div v-if="allowSecondOpinion" class="eval-section second-opinion-section">
      <div v-if="!secondOpinionResult && !secondOpinionLoading">
        <button class="second-opinion-btn" @click="fetchSecondOpinion">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.95"/></svg>
          Zweitbewertung anfordern
        </button>
        <div v-if="secondOpinionError" class="second-opinion-error">{{ secondOpinionError }}</div>
      </div>
      <div v-if="secondOpinionLoading" class="second-opinion-loading">
        <span class="mini-spinner" /> KI bewertet erneut…
      </div>
      <div v-if="secondOpinionResult" class="second-opinion-result">
        <div class="second-opinion-label">Zweitbewertung</div>
        <div class="second-comparison">
          <div class="comparison-col">
            <div class="comparison-head">Erstbewertung</div>
            <div class="comparison-score" :style="{ color: criterionColor(evaluation.awardedPoints, maxPoints) }">
              {{ evaluation.awardedPoints }}/{{ maxPoints }}P ({{ evaluation.percentageScore }}%)
            </div>
            <div class="comparison-grade">{{ IHK_GRADE_LABELS[evaluation.ihkGrade] }}</div>
          </div>
          <div class="comparison-divider">vs</div>
          <div class="comparison-col">
            <div class="comparison-head">Zweitbewertung</div>
            <div class="comparison-score" :style="{ color: criterionColor(secondOpinionResult.awardedPoints, maxPoints) }">
              {{ secondOpinionResult.awardedPoints }}/{{ maxPoints }}P ({{ secondOpinionResult.percentageScore }}%)
            </div>
            <div class="comparison-grade">{{ IHK_GRADE_LABELS[secondOpinionResult.ihkGrade] }}</div>
          </div>
        </div>
        <div class="second-feedback">{{ secondOpinionResult.feedbackText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { AiEvaluation, IhkGrade, ExpectedAnswer } from '../types/index.js';
import { requestSecondOpinion } from '../composables/useApi.js';

const IHK_GRADE_LABELS: Record<IhkGrade, string> = {
  sehr_gut:     'Sehr gut (1)',
  gut:          'Gut (2)',
  befriedigend: 'Befriedigend (3)',
  ausreichend:  'Ausreichend (4)',
  mangelhaft:   'Mangelhaft (5)',
  ungenuegend:  'Ungenügend (6)',
};

const props = defineProps<{
  evaluation: AiEvaluation;
  maxPoints: number;
  expectedAnswer?: ExpectedAnswer;
  taskType?: string;
  sessionId?: string;
  answerId?: string;
  allowSecondOpinion?: boolean;
}>();

const solutionOpen = ref(false);
const secondOpinionLoading = ref(false);
const secondOpinionResult = ref<AiEvaluation | null>(null);
const secondOpinionError = ref<string | null>(null);

async function fetchSecondOpinion() {
  if (!props.sessionId || !props.answerId) return;
  secondOpinionLoading.value = true;
  secondOpinionError.value = null;
  try {
    secondOpinionResult.value = await requestSecondOpinion(props.sessionId, props.answerId);
  } catch (e: unknown) {
    secondOpinionError.value = e instanceof Error ? e.message : 'Fehler';
  } finally {
    secondOpinionLoading.value = false;
  }
}

function criterionColor(awarded: number, max: number): string {
  const p = max > 0 ? awarded / max : 0;
  if (p >= 0.8) return '#22c55e';
  if (p >= 0.5) return '#f59e0b';
  return '#ef4444';
}
</script>

<style scoped>
.eval-panel { margin-top: 24px; border-radius: var(--radius-lg); overflow: hidden; border: 2px solid transparent; background: var(--bg-raised); }
.eval-panel--sehr_gut     { border-color: var(--success); }
.eval-panel--gut          { border-color: var(--brand); }
.eval-panel--befriedigend { border-color: var(--brand-2); }
.eval-panel--ausreichend  { border-color: var(--warning); }
.eval-panel--mangelhaft, .eval-panel--ungenuegend { border-color: var(--danger); }
.eval-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: var(--control-bg); border-bottom: 1px solid var(--border-light); }
.eval-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-subtle); margin-bottom: 4px; }
.eval-grade { font-size: 22px; font-weight: 800; color: var(--text-primary); }
.eval-score-block { text-align: right; }
.eval-score-main { font-size: 28px; font-weight: 800; color: var(--text-primary); }
.eval-score-max  { font-size: 18px; font-weight: 400; color: var(--text-subtle); }
.eval-percent    { font-size: 13px; color: var(--text-muted); }
.eval-progress-track { height: 5px; background: var(--border-light); }
.eval-progress-fill  { height: 100%; background: var(--brand); transition: width 0.6s cubic-bezier(.4,0,.2,1); }
.eval-panel--sehr_gut .eval-progress-fill { background: var(--success); }
.eval-panel--ausreichend .eval-progress-fill { background: var(--warning); }
.eval-panel--mangelhaft .eval-progress-fill, .eval-panel--ungenuegend .eval-progress-fill { background: var(--danger); }
.eval-feedback { padding: 14px 20px; font-size: 14px; line-height: 1.65; color: var(--text-secondary); border-bottom: 1px solid var(--border-light); }
.eval-section { padding: 14px 20px; border-bottom: 1px solid var(--border-light); }
.eval-section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--text-subtle); margin-bottom: 12px; }
.eval-section-title--danger  { color: var(--danger-text); }
.eval-section-title--success { color: var(--success-text); }
.criterion-row { margin-bottom: 14px; }
.criterion-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
.criterion-name  { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.criterion-score { font-size: 12px; font-weight: 700; }
.criterion-bar-track { height: 6px; background: var(--border); border-radius: 3px; margin-bottom: 4px; overflow: hidden; }
.criterion-bar-fill  { height: 100%; border-radius: 3px; transition: width 0.4s; }
.criterion-comment   { font-size: 12px; color: var(--text-subtle); }
.element-list { margin-bottom: 12px; }
.element-list-header { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; }
.element-tag { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; margin: 3px 4px 3px 0; }
.element-tag--ok      { background: var(--success-bg);  color: var(--success-text); border: 1px solid var(--success-border); }
.element-tag--missing { background: var(--danger-bg);   color: var(--danger-text);  border: 1px solid var(--danger-border); }
.element-tag--error   { background: var(--warning-bg);  color: var(--warning-text); border: 1px solid var(--warning-border); }
.eval-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 600px) { .eval-two-col { grid-template-columns: 1fr; } }
.hint-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.hint-list li { font-size: 13px; line-height: 1.5; padding: 8px 12px; border-radius: var(--radius-sm); }
.hint-list--danger  li { background: var(--danger-bg);  color: var(--danger-text); }
.hint-list--success li { background: var(--success-bg); color: var(--success-text); }
.eval-model-info { padding: 8px 20px; font-size: 11px; color: var(--text-faint); text-align: right; }
.eval-solution { padding: 0 !important; border-top: 1px solid var(--border-light); }
.solution-toggle { width: 100%; display: flex; align-items: center; gap: 8px; padding: 13px 20px; background: none; border: none; cursor: pointer; font-size: 13px; font-weight: 600; color: #a78bfa; /* lavender: solution reveal accent */ text-align: left; transition: background var(--transition); }
.solution-toggle:hover { background: rgba(167,139,250,0.06); }
.solution-chevron { margin-left: auto; transition: transform 0.2s; color: var(--text-subtle); }
.solution-chevron--open { transform: rotate(180deg); }
.solution-body { padding: 4px 20px 16px; }
.solution-item { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.solution-label { font-size: 12px; color: var(--text-muted); font-weight: 600; }
.solution-option-badge { display: inline-block; padding: 3px 12px; background: rgba(167,139,250,0.15); color: #c4b5fd; /* lavender: solution badge */ border-radius: 20px; font-size: 13px; font-weight: 700; margin-right: 4px; }
.solution-explanation { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin: 8px 0 0; }
.solution-code { background: rgba(0,0,0,0.35); border-radius: var(--radius-sm); padding: 12px 14px; font-family: var(--font-mono); font-size: 12px; color: var(--success-text); overflow-x: auto; white-space: pre-wrap; margin: 0 0 8px; }
.solution-list { padding-left: 18px; margin: 0; display: flex; flex-direction: column; gap: 5px; }
.solution-list li { font-size: 13px; color: var(--text-secondary); line-height: 1.55; }
.solution-checklist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.solution-checklist li { display: flex; align-items: flex-start; gap: 7px; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
.solution-table-wrap { margin-bottom: 10px; overflow-x: auto; }
.solution-table { border-collapse: collapse; font-size: 13px; }
.solution-table-cell { padding: 5px 10px; border: 1px solid var(--border); color: var(--text-secondary); background: var(--control-bg); }
.solution-empty { font-size: 13px; color: var(--text-faint); font-style: italic; }

.second-opinion-section { padding: 14px 20px; border-top: 1px solid var(--border-light); }
.second-opinion-btn { display: flex; align-items: center; gap: 7px; padding: 7px 14px; background: var(--brand-bg); border: 1px solid var(--brand-border); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; color: var(--brand-text); }
.second-opinion-btn:hover { filter: brightness(1.15); }
.second-opinion-error { margin-top: 8px; font-size: 12px; color: var(--danger-text); }
.second-opinion-loading { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-subtle); }
.mini-spinner { width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--brand-text); border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
.second-opinion-result { }
.second-opinion-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-subtle); margin-bottom: 12px; }
.second-comparison { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
.comparison-col { flex: 1; background: var(--control-bg); border-radius: var(--radius-sm); padding: 10px 14px; }
.comparison-head { font-size: 11px; color: var(--text-subtle); margin-bottom: 4px; }
.comparison-score { font-size: 16px; font-weight: 800; }
.comparison-grade { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.comparison-divider { font-size: 12px; font-weight: 700; color: var(--text-faint); flex-shrink: 0; }
.second-feedback { font-size: 13px; color: var(--text-muted); line-height: 1.6; }
</style>
