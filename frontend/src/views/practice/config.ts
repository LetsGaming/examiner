/**
 * views/practice/config.ts — Anzeige-Labels für Task-Kinds im Practice-Setup.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { TaskKind } from '../../types/index.js';

export const KIND_LABELS: Record<TaskKind, string> = {
  diagram: 'Diagramm / Skizze',
  calc: 'Berechnung',
  sql: 'SQL',
  code: 'Pseudocode / Algorithmus',
  table: 'Tabelle',
  text: 'Freitext',
};
