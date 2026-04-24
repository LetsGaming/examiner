/**
 * composables/useApi.ts — Backward-Compatibility-Shim.
 *
 * Die eigentliche API-Layer-Implementation wohnt seit Runde 6 in
 * `src/composables/api/`, aufgeteilt in Domain-Module (auth, pool, session,
 * admin, ...). Dieser File re-exportiert alle bekannten Symbole, damit
 * bestehende Imports in den Views (HomeView, AdminView, ResultsView, ...)
 * ohne Sofort-Anpassung weiter funktionieren.
 *
 * Neuer Code sollte direkt von `@/composables/api` importieren.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

export * from './api/index.js';
