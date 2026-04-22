/**
 * adminRoutes.ts — Admin-Oberfläche für Pool-Qualität und Backups.
 *
 * GET  /api/admin/pool-stats
 * GET  /api/admin/pool/:part/:specialty
 * DELETE /api/admin/tasks/:id
 * POST /api/admin/reclassify
 * POST /api/admin/backup
 * GET  /api/admin/backup
 */

import { Router, Request, Response } from "express";
import { db } from "../db/database.js";
import { getUserId } from "./routeHelpers.js";
import { createBackup, listBackups } from "../services/backup.js";

export const adminRouter = Router();

// ─── Migrations — müssen NACH initDatabase() aufgerufen werden ───────────────
export function initAdminMigrations(): void {
  try {
    db.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0");
  } catch { /* bereits vorhanden */ }
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN source TEXT DEFAULT 'user_ai'");
  } catch { /* bereits vorhanden */ }
}

// ─── requireAdmin Middleware ──────────────────────────────────────────────────

export function requireAdmin(req: Request, res: Response, next: () => void): void {
  const userId = getUserId(req);
  const user = db.prepare(`SELECT is_admin FROM users WHERE id = ?`).get(userId) as { is_admin: number } | undefined;
  if (!user?.is_admin) {
    res.status(403).json({ success: false, error: "Kein Admin-Zugriff." });
    return;
  }
  next();
}

adminRouter.use(requireAdmin as any);

// ─── GET /api/admin/pool-stats ────────────────────────────────────────────────

adminRouter.get("/pool-stats", (_req: Request, res: Response) => {
  const parts = ["teil_1", "teil_2", "teil_3"];
  const stats = parts.map((part) => {
    const total = (db.prepare(`SELECT COUNT(*) as n FROM tasks WHERE part = ?`).get(part) as { n: number }).n;
    const kindDist = db
      .prepare(`SELECT task_kind, COUNT(*) as n FROM tasks WHERE part = ? GROUP BY task_kind`)
      .all(part) as { task_kind: string; n: number }[];
    const mostUsed = db
      .prepare(`SELECT id, topic_area, times_used FROM tasks WHERE part = ? ORDER BY times_used DESC LIMIT 5`)
      .all(part) as Record<string, unknown>[];
    const neverUsed = (
      db.prepare(`SELECT COUNT(*) as n FROM tasks WHERE part = ? AND times_used = 0`).get(part) as { n: number }
    ).n;
    return { part, total, kindDistribution: kindDist, mostUsedTasks: mostUsed, neverUsedCount: neverUsed };
  });
  res.json({ success: true, data: stats });
});

// ─── GET /api/admin/pool/:part/:specialty ─────────────────────────────────────

adminRouter.get("/pool/:part/:specialty", (req: Request, res: Response) => {
  const { part, specialty } = req.params;
  const tasks = db
    .prepare(
      `SELECT id, topic_area, task_kind, points_value, times_used, created_at, source
       FROM tasks WHERE part = ? AND specialty = ?
       ORDER BY created_at DESC`,
    )
    .all(part, specialty) as Record<string, unknown>[];
  res.json({ success: true, data: tasks });
});

// ─── DELETE /api/admin/tasks/:id ─────────────────────────────────────────────

adminRouter.delete("/tasks/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  // Prüfe ob Task in Session-Tasks referenziert wird
  const inUse = db
    .prepare(`SELECT COUNT(*) as n FROM session_tasks WHERE task_id = ?`)
    .get(id) as { n: number };
  if (inUse.n > 0) {
    return res.status(409).json({
      success: false,
      error: `Diese Aufgabe ist in ${inUse.n} Session(s) referenziert und kann nicht gelöscht werden.`,
    });
  }
  const result = db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
  if (result.changes === 0) return res.status(404).json({ success: false, error: "Aufgabe nicht gefunden." });
  res.json({ success: true });
});

// ─── POST /api/admin/reclassify ───────────────────────────────────────────────

adminRouter.post("/reclassify", (_req: Request, res: Response) => {
  try {
    const { reclassifyExistingTasks } = require("../db/database.js");
    reclassifyExistingTasks();
    res.json({ success: true, message: "Reklassifizierung abgeschlossen." });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── POST /api/admin/backup ───────────────────────────────────────────────────

adminRouter.post("/backup", async (_req: Request, res: Response) => {
  try {
    const dest = await createBackup();
    res.json({ success: true, data: { path: dest } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/admin/backup ────────────────────────────────────────────────────

adminRouter.get("/backup", (_req: Request, res: Response) => {
  res.json({ success: true, data: listBackups() });
});
