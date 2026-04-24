<template>
  <section v-if="timeline.length > 0" class="section">
    <h2 class="section-title">Trend</h2>
    <div class="timeline-chart">
      <svg :viewBox="`0 0 ${SVG_W} ${SVG_H}`" class="trend-svg" preserveAspectRatio="none">
        <!-- Grid lines -->
        <line
          v-for="y in [0, 25, 50, 75, 100]"
          :key="y"
          :x1="PAD_L"
          :y1="toY(y)"
          :x2="SVG_W - PAD_R"
          :y2="toY(y)"
          stroke="rgba(255,255,255,0.05)"
          stroke-width="1"
        />
        <!-- Y-axis labels -->
        <text
          v-for="y in [0, 50, 100]"
          :key="'l' + y"
          :x="PAD_L - 6"
          :y="toY(y) + 4"
          text-anchor="end"
          fill="#4b5563"
          font-size="10"
        >
          {{ y }}%
        </text>
        <!-- Per-part lines -->
        <g v-for="part in PARTS" :key="part.key">
          <polyline
            :points="pointsString(part.key)"
            fill="none"
            :stroke="part.color"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.85"
          />
          <circle
            v-for="(pt, i) in pointsRaw(part.key)"
            :key="i"
            :cx="pt.x"
            :cy="pt.y"
            r="4"
            :fill="part.color"
            @click="$emit('pointClick', pt.sessionId)"
            style="cursor: pointer"
          >
            <title>{{ pt.date }} — {{ pt.pct }}%</title>
          </circle>
        </g>
      </svg>
      <!-- Legend -->
      <div class="timeline-legend">
        <span v-for="part in PARTS" :key="part.key" class="legend-item">
          <span class="legend-dot" :style="{ background: part.color }" />
          {{ part.label }}
        </span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * TimelineChartSection — SVG-Linien-Diagramm der Prozent-Werte pro Prüfungsteil
 * über die Zeit. Punkte sind klickbar → Session-Detail-Seite (Event an Shell).
 *
 * Die Shell liefert die fertig gemappten Punkte-Listen (per part) als Props.
 * Damit bleibt diese Komponente purer Presentational — keine Composable-
 * Instanziierung innerhalb.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ExamPart, TimelineEntry } from '../../../types/index.js';
import { PARTS } from '../config.js';
import {
  PAD_L,
  PAD_R,
  SVG_H,
  SVG_W,
  toY,
  type PlotPoint,
} from '../composables/useTimelineChart.js';

defineProps<{
  timeline: readonly TimelineEntry[];
  pointsRaw: (part: ExamPart) => PlotPoint[];
  pointsString: (part: ExamPart) => string;
}>();

defineEmits<{
  pointClick: [sessionId: string];
}>();
</script>
