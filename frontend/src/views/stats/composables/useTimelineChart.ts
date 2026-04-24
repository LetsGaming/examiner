/**
 * views/stats/composables/useTimelineChart.ts — Koordinaten-Helpers für das
 * SVG-Trend-Diagramm.
 *
 * Die Chart-Geometrie ist bewusst als Konstanten im Modul, damit das Template
 * die gleichen Werte für `viewBox` und Gitter-Linien nutzen kann. Alle
 * Funktionen sind rein — keine Side-Effects, trivial testbar.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { DeepReadonly, Ref } from 'vue';
import type { ExamPart, MyStats } from '../../../types/index.js';

export const SVG_W = 600;
export const SVG_H = 200;
export const PAD_L = 36;
export const PAD_R = 16;
export const PAD_T = 14;
export const PAD_B = 20;

export interface PlotPoint {
  x: number;
  y: number;
  date: string;
  pct: number;
  sessionId: string;
}

/** Mappt einen Prozentwert (0-100) auf die SVG-Y-Koordinate (invertiert). */
export function toY(pct: number): number {
  return PAD_T + (1 - pct / 100) * (SVG_H - PAD_T - PAD_B);
}

export function useTimelineChart(stats: DeepReadonly<Ref<MyStats | null>>) {
  function pointsRaw(part: ExamPart): PlotPoint[] {
    const s = stats.value;
    if (!s) return [];
    const entries = s.averageScoreTimeline.filter((e) => e.part === part);
    if (!entries.length) return [];
    const n = entries.length;
    const xStep = (SVG_W - PAD_L - PAD_R) / Math.max(n - 1, 1);
    return entries.map((e, i) => ({
      x: PAD_L + i * xStep,
      y: toY(e.percentage),
      date: e.date,
      pct: e.percentage,
      sessionId: e.sessionId,
    }));
  }

  /** Als Space-separierter String für `<polyline points="...">`. */
  function pointsString(part: ExamPart): string {
    return pointsRaw(part)
      .map((p) => `${p.x},${p.y}`)
      .join(' ');
  }

  return { pointsRaw, pointsString };
}
