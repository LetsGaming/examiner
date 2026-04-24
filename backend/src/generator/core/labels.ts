/**
 * core/labels.ts — Pure Helper für Label-Vergabe und Punkte-Würfeln.
 *
 * Keine Abhängigkeiten zu LLM/DB — reine Funktionen, leicht testbar.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { SubtaskSpec } from '../types.js';

/**
 * Löst einen Punkte-Wert auf: bei Einzelwert direkte Rückgabe, bei Range
 * [min, max] wird ein zufälliger ganzzahliger Wert in dem Bereich gewählt.
 * Spiegelt die IHK-Punktvarianz (MD §2, Punkte je Aufgabe 20–30).
 */
export function resolvePoints(p: number | [number, number]): number {
  if (typeof p === 'number') return p;
  const [min, max] = p;
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Vergibt Labels an Subtasks. Kaskadierte Blöcke (cascade: true, ≥2 aufeinander-
 * folgende) bekommen zusammengesetzte Labels wie "aa", "ab", "ac" unter einem
 * gemeinsamen Hauptbuchstaben. Alle anderen Subtasks erhalten einfache
 * fortlaufende Labels "a", "b", "c", …
 *
 * Beispiel (MD §5.1 W23/24 Aufg.2): User-Stories mit 3 kaskadierten Subtasks
 * gefolgt von 1 normalen → Labels ["aa","ab","ac","b"].
 */
export function assignLabels(specs: SubtaskSpec[]): string[] {
  const labels: string[] = [];
  let mainIdx = 0;
  let i = 0;

  while (i < specs.length) {
    if (specs[i].cascade) {
      const groupEnd = findCascadeGroupEnd(specs, i);
      const groupSize = groupEnd - i + 1;

      if (groupSize > 1) {
        for (let k = 0; k < groupSize; k++) {
          labels.push(mainLetter(mainIdx) + mainLetter(k));
        }
      } else {
        labels.push(mainLetter(mainIdx));
      }
      mainIdx++;
      i = groupEnd + 1;
    } else {
      labels.push(mainLetter(mainIdx));
      mainIdx++;
      i++;
    }
  }
  return labels;
}

function findCascadeGroupEnd(specs: SubtaskSpec[], start: number): number {
  let end = start;
  while (end + 1 < specs.length && specs[end + 1].cascade) end++;
  return end;
}

function mainLetter(idx: number): string {
  return String.fromCharCode(97 + idx);
}
