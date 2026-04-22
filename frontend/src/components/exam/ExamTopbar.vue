<template>
  <div class="topbar">
    <div class="topbar-left">
      <button class="topbar-btn" @click="$emit('leave')" title="Prüfung beenden">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <span class="topbar-part">{{ partLabel }}</span>
    </div>
    <div class="topbar-center">
      <span v-if="scenarioName" class="topbar-scenario" @click="$emit('show-scenario')" title="Ausgangssituation lesen">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        {{ scenarioName }}
      </span>
    </div>
    <div class="topbar-right">
      <button v-if="examPart !== 'teil_3'" class="topbar-btn topbar-btn-ref" @click="$emit('show-belegsatz')" title="Belegsatz öffnen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>
        </svg>
        Belegsatz
      </button>
      <div class="timer" :class="timerClass">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        {{ formattedTime }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ExamPart } from '../../types/index.js';
import { PART_LABELS } from '../../types/index.js';

const props = defineProps<{
  examPart: ExamPart;
  scenarioName?: string;
  formattedTime: string;
  timerClass: string;
}>();

defineEmits<{ leave: []; 'show-scenario': []; 'show-belegsatz': [] }>();

const partLabel = PART_LABELS[props.examPart];
</script>

<style scoped>
.topbar {
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  padding: 0 12px; height: 48px; flex-shrink: 0;
  background: #131620; border-bottom: 1px solid rgba(255, 255, 255, 0.07); gap: 8px;
}
.topbar-left, .topbar-right { display: flex; align-items: center; gap: 8px; }
.topbar-right { justify-content: flex-end; }
.topbar-center { display: flex; justify-content: center; }
.topbar-btn {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1);
  color: #9ca3af; cursor: pointer; transition: all 0.15s; flex-shrink: 0;
}
.topbar-btn:hover { background: rgba(255, 255, 255, 0.1); color: #e8eaf0; }
.topbar-btn-ref { width: auto; padding: 0 10px; font-size: 12px; font-weight: 500; gap: 6px; }
.topbar-part { font-size: 13px; font-weight: 600; color: #9ca3af; }
.topbar-scenario {
  display: flex; align-items: center; gap: 5px; font-size: 12px; color: #818cf8;
  cursor: pointer; padding: 4px 10px; border-radius: 20px;
  background: rgba(79, 70, 229, 0.12); border: 1px solid rgba(79, 70, 229, 0.25);
  transition: all 0.15s; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.topbar-scenario:hover { background: rgba(79, 70, 229, 0.2); }
.timer {
  display: flex; align-items: center; gap: 5px;
  font-size: 13px; font-weight: 700; font-family: 'SF Mono', monospace;
  color: #d1d5db; padding: 5px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.05);
}
.timer-warning { color: #fbbf24; background: rgba(251, 191, 36, 0.1); }
.timer-critical { color: #f87171; background: rgba(248, 113, 113, 0.1); animation: blink 1s ease-in-out infinite; }
@keyframes blink { 50% { opacity: 0.5; } }
@media (max-width: 768px) { .topbar-part { display: none; } }
</style>
