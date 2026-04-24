/**
 * composables/api/httpHelpers.ts — Shared helpers für ApiResponse-Unwrapping.
 *
 * Das Backend liefert immer `{ success: boolean; data?: T; error?: string }`.
 * Die Helfer hier eliminieren den Boilerplate in jeder API-Funktion:
 *   unwrap(data, 'Fallback-Fehlermeldung')
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ApiResponse } from '../../types/index.js';

/**
 * Packt ein ApiResponse<T> aus. Wirft einen Error mit dem Server-Fehler
 * oder der übergebenen Fallback-Nachricht, falls `data` fehlt.
 */
export function unwrap<T>(response: ApiResponse<T>, fallbackError: string): T {
  if (!response.success || response.data === undefined || response.data === null) {
    throw new Error(response.error ?? fallbackError);
  }
  return response.data;
}

/**
 * Variante für Endpoints ohne Rückgabewert: prüft nur `success` und wirft bei Fehler.
 * `void`-Responses haben kein `data`-Feld zum Auspacken.
 */
export function expectSuccess(response: ApiResponse<unknown>, fallbackError: string): void {
  if (!response.success) {
    throw new Error(response.error ?? fallbackError);
  }
}
