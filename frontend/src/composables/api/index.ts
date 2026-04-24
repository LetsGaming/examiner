/**
 * composables/api/index.ts — Barrel für alle API-Domain-Module.
 *
 * Erlaubt einen zentralen Import wie:
 *   import { apiLogin, fetchSession, adminFetchPool } from '@/composables/api';
 *
 * Interne Struktur:
 *   client.ts           → Axios-Instanz + Interceptors
 *   httpHelpers.ts      → unwrap, expectSuccess
 *   authApi.ts          → Login, Registrierung, Profil, Passwort
 *   poolApi.ts          → Pool-Status, Generierung, Prüfungsstart
 *   aiSettingsApi.ts    → KI-Provider-Einstellungen
 *   sessionApi.ts       → Laufende Session, Answers, Evaluation, Submit
 *   statsApi.ts         → Persönliche Statistiken
 *   historyApi.ts       → Vergangene Sessions
 *   practiceApi.ts      → Gezielte Übungs-Sessions
 *   reviewApi.ts        → Spaced-Repetition-Review
 *   userSettingsApi.ts  → Nutzer-Key-Value-Settings
 *   adminApi.ts         → Admin-Endpoints
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

export * from './authApi.js';
export * from './poolApi.js';
export * from './aiSettingsApi.js';
export * from './sessionApi.js';
export * from './statsApi.js';
export * from './historyApi.js';
export * from './practiceApi.js';
export * from './reviewApi.js';
export * from './userSettingsApi.js';
export * from './adminApi.js';
