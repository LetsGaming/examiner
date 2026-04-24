/**
 * db/connection.ts — SQLite-Verbindung + Pragmas.
 *
 * Einziger Ort, an dem eine DatabaseConstructor-Instanz erzeugt wird.
 * Alle anderen Module importieren `db` aus diesem File — nie direkt aus
 * better-sqlite3.
 *
 * Pragmas:
 *  - journal_mode = WAL    — schnellere concurrent reads, crash-safe
 *  - foreign_keys = ON     — referenzielle Integrität aktiv
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import DatabaseConstructor from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, process.env.DB_FILENAME ?? 'ap2_trainer.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db: DatabaseType = new DatabaseConstructor(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export type { DatabaseType };
export { DB_DIR, DB_PATH };
