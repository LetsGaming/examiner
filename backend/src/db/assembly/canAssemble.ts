/**
 * db/assembly/canAssemble.ts — Prüft, ob der Pool für eine Prüfung reicht.
 *
 * Nutzt denselben Slot-Füll-Algorithmus wie `assembleExam`, aber ohne
 * Rückgabe der Tasks — nur Machbarkeits-Check. Drift-frei: wenn diese Funktion
 * `true` liefert, wird auch `assembleExam` garantiert erfolgreich sein.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { fillSlots } from './slotFiller.js';
import type { TaskLite } from './slotMatcher.js';

export function canAssembleExam(part: string, specialty = 'fiae'): boolean {
  return fillSlots<TaskLite>(part, specialty, () => {
    // Probe-Mode: Slot wurde besetzt, aber wir speichern nichts.
  });
}
