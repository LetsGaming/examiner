/**
 * db/assembly/slotFiller.ts — Slot-Befüllungs-Schleife für Prüfungen.
 *
 * Gemeinsame Logik für `canAssembleExam` (nur Machbarkeits-Check) und
 * `assembleExam` (tatsächliche Zusammenstellung). Unterschied ist nur, was
 * mit den gefundenen Tasks passiert — das kapseln wir in einem Callback.
 *
 * Ablauf je Slot:
 *   1. Bevorzugte Kinds (Liste) in Reihenfolge durchgehen, bei erstem Treffer
 *      stoppen.
 *   2. Text-Kappe: wenn MAX_TEXT_PER_EXAM schon erreicht, 'text' aus der
 *      preferredKinds-Liste filtern.
 *   3. Wenn keiner der bevorzugten Kinds einen Treffer liefert, Gesamt-
 *      Fallback ohne Kind-Filter.
 *   4. Schlägt auch der Fallback fehl → Slot ist nicht besetzbar → Abbruch.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { TaskKind } from '../../services/taskKind.js';
import { MAX_TEXT_PER_EXAM, SLOT_PROFILES, type SlotSpec } from '../poolConfig.js';
import { probeSlotTask, type TaskLite } from './slotMatcher.js';

export interface FillContext {
  part: string;
  specialty: string;
  usedIds: string[];
  usedTopics: Set<string>;
  kindCounts: Record<string, number>;
  textCap: number;
}

export type SlotTaskHandler<T extends TaskLite> = (task: T, slot: SlotSpec) => void;

/**
 * Befüllt alle Slots eines Prüfungsteils. Für jeden erfolgreich befüllten Slot
 * wird `onTaskFound(task, slot)` aufgerufen — Caller kümmert sich um Persistenz
 * oder bloßes Zählen.
 *
 * Rückgabe: `true` wenn alle Slots befüllt wurden, `false` wenn ein Slot leer
 * blieb.
 */
export function fillSlots<T extends TaskLite>(
  part: string,
  specialty: string,
  onTaskFound: SlotTaskHandler<T>,
): boolean {
  const profile = SLOT_PROFILES[part];
  if (!profile) return false;

  const ctx: FillContext = {
    part,
    specialty,
    usedIds: [],
    usedTopics: new Set(),
    kindCounts: {},
    textCap: MAX_TEXT_PER_EXAM[part] ?? 99,
  };

  for (const slot of profile) {
    const task = findTaskForSlot<T>(slot, ctx);
    if (!task) return false;

    ctx.usedIds.push(task.id);
    ctx.usedTopics.add(task.topic_area);
    const kind = task.task_kind ?? 'text';
    ctx.kindCounts[kind] = (ctx.kindCounts[kind] ?? 0) + 1;

    onTaskFound(task, slot);
  }
  return true;
}

function findTaskForSlot<T extends TaskLite>(slot: SlotSpec, ctx: FillContext): T | undefined {
  const kindsToTry = applyTextCap(slot.preferredKinds, ctx);

  // Bevorzugte Kinds der Reihe nach probieren
  for (const kind of kindsToTry) {
    const task = probeSlotTask<T>({
      part: ctx.part,
      specialty: ctx.specialty,
      minPoints: slot.minPoints,
      maxPoints: slot.maxPoints,
      kindFilter: kind,
      usedIds: ctx.usedIds,
      usedTopics: ctx.usedTopics,
    });
    if (task) return task;
  }

  // Letzter Ausweg: ohne Kind-Filter (damit die Prüfung überhaupt zustande kommt)
  return probeSlotTask<T>({
    part: ctx.part,
    specialty: ctx.specialty,
    minPoints: slot.minPoints,
    maxPoints: slot.maxPoints,
    kindFilter: null,
    usedIds: ctx.usedIds,
    usedTopics: ctx.usedTopics,
  });
}

function applyTextCap(
  preferredKinds: ReadonlyArray<TaskKind>,
  ctx: FillContext,
): TaskKind[] {
  const kinds = preferredKinds.slice();
  const textUsed = ctx.kindCounts['text'] ?? 0;
  if (textUsed >= ctx.textCap) {
    return kinds.filter((k) => k !== 'text');
  }
  return kinds;
}
