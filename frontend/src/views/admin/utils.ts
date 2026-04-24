/**
 * views/admin/utils.ts — Shared helpers for the admin panel.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

/** Formatiert ISO-Datumsstring als "TT.MM.JJJJ" (deutsches Locale). */
export function fmtDate(s?: string): string {
  if (!s) return '';
  return new Date(s).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
