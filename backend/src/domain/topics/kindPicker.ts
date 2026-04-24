/**
 * domain/topics/kindPicker.ts — Auswahl von Topics nach gewünschtem TaskKind.
 *
 * Wird vom Pool-Refill genutzt, um gezielt Lücken zu füllen: z.B. "gib mir 3
 * Topics, die Diagramm-Aufgaben generieren", wenn der Pool zu wenige Diagramme
 * hat. Wenn nicht genug Topics der gewünschten Kinds verfügbar sind, wird mit
 * beliebigen anderen Topics aufgefüllt.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ExamPart, Specialty } from '../../types/index.js';
import { getTopics } from './catalog.js';
import { inferKindForTopic, type TopicKind } from './kindInference.js';

/** Fisher-Yates-Shuffle, in-place für Testbarkeit via seed wäre ein Add-on. */
function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Liefert bis zu `count` Topics, die bevorzugt aus den gewünschten Kinds stammen.
 * Wenn weniger passende Topics existieren als `count`, wird mit beliebigen
 * anderen Topics aufgefüllt.
 */
export function pickTopicsByKinds(
  part: ExamPart,
  kinds: TopicKind[],
  count: number,
  specialty: Specialty = 'fiae',
): string[] {
  const all = getTopics(part, specialty).slice();
  shuffleInPlace(all);

  const wanted = new Set(kinds);
  const matching = all.filter((topic) => wanted.has(inferKindForTopic(topic)));
  const rest = all.filter((topic) => !matching.includes(topic));

  return [...matching, ...rest].slice(0, count);
}
