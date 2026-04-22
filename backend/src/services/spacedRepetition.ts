/**
 * spacedRepetition.ts — SM-2-Light Algorithmus für die Wiederholungs-Queue.
 *
 * Pure Logik ohne DB-Abhängigkeit — vollständig unit-testbar.
 */

export interface ReviewEntry {
  intervalDays: number;
  ease: number;          // SM-2 ease factor, min 1.3
  repetitions: number;
}

export interface ReviewResult extends ReviewEntry {
  dueAt: string;  // YYYY-MM-DD
}

const MIN_EASE = 1.3;

/** Berechnet neuen Interval + Ease nach einem Review. */
export function computeNextReview(
  entry: ReviewEntry,
  percentageScore: number,
  today: string = new Date().toISOString().substring(0, 10),
): ReviewResult {
  let { intervalDays, ease, repetitions } = entry;

  if (percentageScore < 50) {
    // Vergessen → zurück auf 1 Tag, Ease sinkt
    intervalDays = 1;
    ease = Math.max(MIN_EASE, ease - 0.2);
    repetitions = 0;
  } else if (percentageScore <= 80) {
    // Gut genug → Interval wächst normal
    intervalDays = Math.max(1, Math.round(intervalDays * ease));
    repetitions += 1;
  } else {
    // Sehr gut → Interval wächst mit Bonus
    intervalDays = Math.max(1, Math.round(intervalDays * ease * 1.3));
    ease = Math.min(ease + 0.1, 4.0); // Ease kann leicht steigen
    repetitions += 1;
  }

  const dueAt = addDays(today, intervalDays);
  return { intervalDays, ease, repetitions, dueAt };
}

/** Gibt das Datum today + n Tage zurück (YYYY-MM-DD). */
export function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().substring(0, 10);
}

/** Default-Eintrag für eine neue Subtask in der Queue. */
export function defaultReviewEntry(): ReviewEntry {
  return { intervalDays: 1, ease: 2.5, repetitions: 0 };
}
