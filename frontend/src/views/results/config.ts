/**
 * views/results/config.ts — IHK-Notenschlüssel für die Ergebnis-Anzeige.
 *
 * Die Schwellen folgen den offiziellen IHK-Korrekturhinweisen (MD §6.1).
 * Diese Tabelle wird im Frontend nur für die Anzeige verwendet — die
 * tatsächliche Grade-Ableitung läuft zentral im Backend in
 * `backend/src/domain/taxonomy.ts`.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { IhkGrade } from '../../types/index.js';

export interface GradeRow {
  readonly key: IhkGrade;
  readonly min: number;
  readonly max: number;
  readonly label: string;
}

export const GRADES: readonly GradeRow[] = [
  { key: 'sehr_gut', min: 92, max: 100, label: 'Sehr gut (1)' },
  { key: 'gut', min: 81, max: 91, label: 'Gut (2)' },
  { key: 'befriedigend', min: 67, max: 80, label: 'Befriedigend (3)' },
  { key: 'ausreichend', min: 50, max: 66, label: 'Ausreichend (4)' },
  { key: 'mangelhaft', min: 30, max: 49, label: 'Mangelhaft (5)' },
  { key: 'ungenuegend', min: 0, max: 29, label: 'Ungenügend (6)' },
] as const;

/** Kurz-Label (Ziffer) für einen Grade, fallback auf den Rohwert. */
const GRADE_SHORT_MAP: Record<string, string> = {
  sehr_gut: '1',
  gut: '2',
  befriedigend: '3',
  ausreichend: '4',
  mangelhaft: '5',
  ungenuegend: '6',
};

export function gradeShort(g: string): string {
  return GRADE_SHORT_MAP[g] ?? g;
}
