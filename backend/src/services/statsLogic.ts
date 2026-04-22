/**
 * statsLogic.ts — Pure Hilfsfunktionen für das Statistik-Dashboard.
 *
 * Kein DB-Import — kann ohne better-sqlite3 in Tests genutzt werden.
 */

import type { ExamPart } from "../types/index.js";
import type { TaskKind } from "./taskKind.js";

/** Berechnet die aktuelle Streak (Tage in Folge mit mindestens 1 Session). */
export function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  // Deduplizieren und sortieren (neueste zuerst)
  const unique = [...new Set(dates.map((d) => d.substring(0, 10)))].sort(
    (a, b) => b.localeCompare(a),
  );

  const today = new Date().toISOString().substring(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().substring(0, 10);

  // Streak beginnt nur wenn heute oder gestern eine Session war
  if (unique[0] !== today && unique[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    const curr = new Date(unique[i]);
    const diffDays = Math.round(
      (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export interface TopicScore {
  topicArea: string;
  part: ExamPart;
  percentage: number;
  submittedAt: string;
}

export interface TopicPerformance {
  topicArea: string;
  part: ExamPart;
  attempts: number;
  avgPercentage: number;
  lastAttemptAt: string;
}

/** Aggregiert Topic-Scores. Ein Topic gilt als "schwach" bei avg < 50% und mind. 2 Versuchen. */
export function classifyTopicPerformance(
  scores: TopicScore[],
): TopicPerformance[] {
  const map = new Map<string, TopicScore[]>();
  for (const s of scores) {
    const key = `${s.part}::${s.topicArea}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }

  const result: TopicPerformance[] = [];
  for (const [, entries] of map) {
    const attempts = entries.length;
    const avgPercentage =
      entries.reduce((sum, e) => sum + e.percentage, 0) / attempts;
    const lastAttemptAt = entries
      .map((e) => e.submittedAt)
      .sort((a, b) => b.localeCompare(a))[0];

    result.push({
      topicArea: entries[0].topicArea,
      part: entries[0].part,
      attempts,
      avgPercentage: Math.round(avgPercentage),
      lastAttemptAt,
    });
  }

  // Schwächste zuerst
  return result.sort((a, b) => a.avgPercentage - b.avgPercentage);
}

export function isTopicWeak(tp: TopicPerformance): boolean {
  return tp.avgPercentage < 50 && tp.attempts >= 2;
}
