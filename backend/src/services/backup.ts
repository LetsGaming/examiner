/**
 * backup.ts — Automatisches SQLite-Backup mit Pruning.
 *
 * Nutzt better-sqlite3's eingebauten backup()-Mechanismus (konsistent
 * auch während laufender Writes).
 */

import path from "path";
import fs from "fs";
import { db } from "../db/database.js";

const BACKUP_DIR = path.resolve(process.cwd(), "data", "backups");

export async function createBackup(): Promise<string> {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(BACKUP_DIR, `backup-${timestamp}.db`);
  await (db as any).backup(dest);
  console.log(`[backup] Erstellt: ${dest}`);
  return dest;
}

export async function pruneOldBackups(keepDays = 14): Promise<number> {
  if (!fs.existsSync(BACKUP_DIR)) return 0;
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith("backup-") && f.endsWith(".db"));
  let pruned = 0;
  for (const f of files) {
    const fullPath = path.join(BACKUP_DIR, f);
    const stat = fs.statSync(fullPath);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(fullPath);
      pruned++;
    }
  }
  if (pruned > 0) console.log(`[backup] ${pruned} alte Backups gelöscht.`);
  return pruned;
}

export function listBackups(): { filename: string; sizeMb: number; createdAt: string }[] {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("backup-") && f.endsWith(".db"))
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        filename: f,
        sizeMb: Math.round((stat.size / (1024 * 1024)) * 100) / 100,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function startBackupScheduler(intervalHours = 24): NodeJS.Timeout {
  // Sofort beim Start einmal ausführen
  (async () => {
    try {
      await createBackup();
      await pruneOldBackups(14);
    } catch (err) {
      console.warn("[backup] Fehler beim Start-Backup:", err);
    }
  })();

  return setInterval(
    async () => {
      try {
        await createBackup();
        await pruneOldBackups(14);
      } catch (err) {
        console.warn("[backup] Fehler beim geplanten Backup:", err);
      }
    },
    intervalHours * 60 * 60 * 1000,
  );
}
