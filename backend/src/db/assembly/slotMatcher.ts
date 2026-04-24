/**
 * db/assembly/slotMatcher.ts — Task-Probing für Slot-Befüllung.
 *
 * Vereint die zuvor in `canAssembleExam` und `assembleExam` duplizierte
 * Task-Such-Logik. Beide Funktionen hatten denselben Two-Pass-Algorithmus:
 *   1. Primär-Pass: ID noch nicht genutzt UND topic_area noch nicht genutzt
 *                   UND optional kind-Filter.
 *   2. Sekundär-Pass: Topic-Eindeutigkeit aufweichen (falls Pool klein).
 *
 * Parametrisierung via `TaskShape` erlaubt beiden Callern, nur die Felder
 * auszulesen, die sie brauchen (canAssemble: nur id/topic/kind, assemble:
 * das komplette row-Objekt).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { db } from '../connection.js';
import type { TaskKind } from '../../services/taskKind.js';

export interface ProbeQuery {
  part: string;
  specialty: string;
  minPoints: number;
  maxPoints: number;
  kindFilter: TaskKind | null;
  /** IDs, die bereits in der aktuellen Prüfung verwendet wurden (nicht nochmal ziehen). */
  usedIds: ReadonlyArray<string>;
  /** Topics, die bereits verwendet wurden (Primär-Pass filtert sie raus). */
  usedTopics: ReadonlySet<string>;
}

export interface TaskLite {
  id: string;
  topic_area: string;
  task_kind: string;
}

/**
 * Baut das Exclusion-Fragment für "id NOT IN (...)".
 * IDs werden per `toSqlList` escaped — sie stammen aus der DB und sind keine
 * User-Eingaben, aber defensive Quoting ist billig.
 */
function buildIdExclusion(ids: ReadonlyArray<string>): string {
  if (ids.length === 0) return "''";
  return ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(',');
}

/** SQL-escaped comma-separated list für "topic_area NOT IN (...)"-Klausel. */
function buildTopicExclusion(topics: ReadonlySet<string>): string {
  if (topics.size === 0) return '';
  const escaped = [...topics].map((t) => `'${t.replace(/'/g, "''")}'`).join(',');
  return `AND topic_area NOT IN (${escaped})`;
}

function buildKindFilter(kind: TaskKind | null): string {
  return kind ? `AND task_kind = '${kind}'` : '';
}

/**
 * Probt eine Task für den gegebenen Slot. Liefert das komplette Row-Objekt
 * (shape-agnostic — Caller castet auf TaskLite für lightweight-Usage oder auf
 * Record<string, unknown> für full-row).
 */
export function probeSlotTask<T extends TaskLite = TaskLite>(query: ProbeQuery): T | undefined {
  const usedIdList = buildIdExclusion(query.usedIds);
  const topicEx = buildTopicExclusion(query.usedTopics);
  const kindEx = buildKindFilter(query.kindFilter);

  const primary = db
    .prepare(
      `SELECT * FROM tasks
       WHERE part = ? AND specialty = ? AND points_value BETWEEN ? AND ?
         AND id NOT IN (${usedIdList}) ${topicEx} ${kindEx}
       ORDER BY times_used ASC, RANDOM() LIMIT 1`,
    )
    .get(query.part, query.specialty, query.minPoints, query.maxPoints) as T | undefined;
  if (primary) return primary;

  // Sekundär: Topic-Eindeutigkeit aufweichen
  return db
    .prepare(
      `SELECT * FROM tasks
       WHERE part = ? AND specialty = ? AND points_value BETWEEN ? AND ?
         AND id NOT IN (${usedIdList}) ${kindEx}
       ORDER BY times_used ASC, RANDOM() LIMIT 1`,
    )
    .get(query.part, query.specialty, query.minPoints, query.maxPoints) as T | undefined;
}
