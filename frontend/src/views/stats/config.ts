/**
 * views/stats/config.ts — Statische Konfiguration + pure Helfer für die
 * Stats-View.
 *
 * `isReady` spiegelt die MD-Empfehlung wider, dass ein Prüfling ab ca. 67%
 * Durchschnitt (IHK-Grade "befriedigend") bei mindestens 3 Prüfungen als
 * prüfungsreif gilt (MD §6.1 Notenstaffel + §5.1 Wiederholbarkeits-Heuristik).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ExamPart, TaskKind } from '../../types/index.js';

export interface PartDef {
  readonly key: ExamPart;
  readonly label: string;
  readonly color: string;
}

export const PARTS: readonly PartDef[] = [
  { key: 'teil_1', label: 'Teil 1', color: '#818cf8' },
  { key: 'teil_2', label: 'Teil 2', color: '#34d399' },
  { key: 'teil_3', label: 'Teil 3', color: '#f472b6' },
] as const;

export const PART_LABELS: Record<ExamPart, string> = {
  teil_1: 'Teil 1 — Planen',
  teil_2: 'Teil 2 — Entwicklung',
  teil_3: 'Teil 3 — WiSo',
};

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  diagram: 'Diagramme',
  calc: 'Berechnungen',
  sql: 'SQL',
  code: 'Pseudocode',
  table: 'Tabellen',
  text: 'Freitext',
};

/** Ampel-Farbe für einen Prozent-Wert (gut/ok/schlecht). */
export function barColor(pct: number): string {
  if (pct >= 80) return '#22c55e';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

/** Prüfungsreife: ab ~67% Ø (befriedigend) + min. 3 Versuche. */
export function isReady(avg: number, count: number): boolean {
  return count >= 3 && avg >= 67;
}

export function partLabel(p: ExamPart): string {
  return PART_LABELS[p];
}
