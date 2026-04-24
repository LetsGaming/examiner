/**
 * views/stats/composables/useStatsDerivations.ts — Abgeleitete Computeds
 * aus den rohen Stats-Daten.
 *
 * - `overallAvg`: gewichtungs-freier Durchschnitt über alle nicht-leeren Teile
 *   (Teile ohne Prüfungen ignoriert, damit eine einzelne Teil-3-Prüfung den
 *   Gesamt-Ø nicht künstlich runterzieht).
 * - `weakTopics`: Top-5 schwächste Themen mit ≥2 Versuchen unter 50%.
 * - `sortedKindPerf`: Aufgaben-Typen aufsteigend nach Performance sortiert —
 *   User soll sofort sehen wo er schwach ist.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { computed } from 'vue';
import type { DeepReadonly, Ref } from 'vue';
import type { KindPerformance, MyStats, TopicPerformance } from '../../../types/index.js';

export function useStatsDerivations(stats: DeepReadonly<Ref<MyStats | null>>) {
  const overallAvg = computed<number | '—'>(() => {
    const s = stats.value;
    if (!s || s.totalExams === 0) return '—';
    const vals = Object.values(s.averageScoreByPart).filter((v) => v > 0);
    if (!vals.length) return '—';
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  });

  const weakTopics = computed<TopicPerformance[]>(() => {
    const s = stats.value;
    if (!s) return [];
    return s.topicPerformance
      .filter((tp) => tp.avgPercentage < 50 && tp.attempts >= 2)
      .slice(0, 5) as TopicPerformance[];
  });

  const sortedKindPerf = computed<KindPerformance[]>(() => {
    const s = stats.value;
    if (!s) return [];
    return ([...s.kindPerformance] as KindPerformance[]).sort(
      (a, b) => a.avgPercentage - b.avgPercentage,
    );
  });

  return { overallAvg, weakTopics, sortedKindPerf };
}
