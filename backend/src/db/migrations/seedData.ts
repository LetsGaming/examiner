/**
 * db/migrations/seedData.ts — Seed-Daten beim App-Start.
 *
 * Minimaler lokaler User für die Standalone-Entwicklung (der frühere
 * "local-no-password"-Nutzer, den der Auth-Layer explizit als System-User
 * behandelt).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { db } from '../connection.js';

const LOCAL_USER_ID = 'local-user';

export function seedLocalUser(): void {
  db.prepare(
    `INSERT OR IGNORE INTO users (id, email, display_name, password_hash)
     VALUES (?, 'local@localhost', 'Lokaler Nutzer', 'local-no-password')`,
  ).run(LOCAL_USER_ID);
}
