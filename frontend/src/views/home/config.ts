/**
 * views/home/config.ts — Statische Konfiguration für die HomeView.
 *
 * `PARTS` ist die Master-Liste der AP2-Teile mit Default-Labels (FIAE).
 * Für FISI werden Teil 1 und 2 via `PARTS_FISI_LABELS` überschrieben —
 * Teil 3 (WiSo) ist fachrichtungsübergreifend identisch.
 *
 * Die Default-Labels entsprechen den offiziellen IHK-Prüfungsbezeichnungen
 * gemäß Verordnung FIAE (MD §2/§4).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ExamPart } from '../../types/index.js';

export interface HomePart {
  readonly value: ExamPart;
  readonly number: string;
  readonly label: string;
  readonly color: 'blue' | 'purple' | 'teal';
  readonly duration: number;
  readonly points: number;
  readonly taskCount: number;
}

export const PARTS: readonly HomePart[] = [
  {
    value: 'teil_1',
    number: '1',
    label: 'Planen eines Softwareproduktes',
    color: 'blue',
    duration: 90,
    points: 100,
    taskCount: 4,
  },
  {
    value: 'teil_2',
    number: '2',
    label: 'Entwicklung und Umsetzung von Algorithmen',
    color: 'purple',
    duration: 90,
    points: 100,
    taskCount: 4,
  },
  {
    value: 'teil_3',
    number: '3',
    label: 'Wirtschafts- und Sozialkunde',
    color: 'teal',
    duration: 60,
    points: 100,
    taskCount: 8,
  },
] as const;

export const PARTS_FISI_LABELS: Record<string, string> = {
  teil_1: 'Konzeption und Administration von IT-Systemen',
  teil_2: 'Betrieb und Verwaltung von Netzwerken',
};

/** Gibt das fachrichtungsspezifische Label für einen Prüfungsteil zurück. */
export function labelForPart(part: ExamPart, specialty: string): string {
  if (specialty === 'fisi' && PARTS_FISI_LABELS[part]) return PARTS_FISI_LABELS[part];
  return PARTS.find((p) => p.value === part)?.label ?? part;
}
