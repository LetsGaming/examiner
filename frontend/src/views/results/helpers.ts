/**
 * views/results/helpers.ts — Darstellungs-Helper für Prüfungsergebnisse.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

/** CSS-Klasse für die Punkt-Farbkodierung (gut/ok/schlecht) anhand Prozent. */
export function pointsClass(earned?: number, max?: number): string {
  if (earned == null || max == null) return '';
  const pct = earned / max;
  if (pct >= 0.8) return 'pts-good';
  if (pct >= 0.5) return 'pts-ok';
  return 'pts-bad';
}

/** Schneidet Text bei n Zeichen ab und hängt "…" an. */
export function truncate(text: string, n: number): string {
  return text.length > n ? text.slice(0, n) + '…' : text;
}

/** Prüft, ob ein String ein JSON-Array repräsentiert (für Tabellen-Antworten). */
export function isJsonArray(s: string): boolean {
  try {
    return Array.isArray(JSON.parse(s));
  } catch {
    return false;
  }
}

/** Parst eine Tabellen-Antwort zu einer 2D-String-Matrix. Silent fallback zu []. */
export function parseTableAnswer(s: string): string[][] {
  try {
    const parsed: unknown = JSON.parse(s);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) =>
      Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : [],
    );
  } catch {
    return [];
  }
}
