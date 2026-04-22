/**
 * userSettings.ts — Generische Key-Value-Tabelle für pro-User-Einstellungen.
 *
 * Wird von Feature 11 (Dark/Light), Feature 7 (Timer-Coaching) und
 * weiteren Features genutzt.
 */

import { db } from "./database.js";

export function initUserSettingsTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id    TEXT NOT NULL,
      key        TEXT NOT NULL,
      value      TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, key)
    );
  `);
}

export function getUserSetting(
  userId: string,
  key: string,
  defaultValue: string = "",
): string {
  const row = db
    .prepare(`SELECT value FROM user_settings WHERE user_id = ? AND key = ?`)
    .get(userId, key) as { value: string } | undefined;
  return row?.value ?? defaultValue;
}

export function setUserSetting(
  userId: string,
  key: string,
  value: string,
): void {
  db.prepare(
    `INSERT INTO user_settings (user_id, key, value, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(userId, key, value);
}

export function deleteUserSetting(userId: string, key: string): void {
  db.prepare(`DELETE FROM user_settings WHERE user_id = ? AND key = ?`).run(
    userId,
    key,
  );
}
