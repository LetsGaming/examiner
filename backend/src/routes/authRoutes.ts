/**
 * Auth routes — register, login, me
 *
 * POST /api/auth/register  { email, password, displayName }
 * POST /api/auth/login     { email, password }
 * GET  /api/auth/me        (requires Bearer token)
 */

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db/database.js";
import { signToken, authMiddleware } from "../middleware/auth.js";

export const authRouter = Router();

const BCRYPT_ROUNDS = 12;

// ─── POST /api/auth/register ─────────────────────────────────────────────────

authRouter.post("/register", async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body as {
    email?: string;
    password?: string;
    displayName?: string;
  };

  if (!email || !password || !displayName) {
    return res
      .status(400)
      .json({
        success: false,
        error: "E-Mail, Passwort und Name sind erforderlich.",
      });
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res
      .status(400)
      .json({ success: false, error: "Ungültige E-Mail-Adresse." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res
      .status(400)
      .json({
        success: false,
        error: "Passwort muss mindestens 8 Zeichen lang sein.",
      });
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email.toLowerCase());
  if (existing) {
    return res
      .status(409)
      .json({ success: false, error: "Diese E-Mail ist bereits registriert." });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = crypto.randomUUID().replace(/-/g, "");

  db.prepare(
    `
    INSERT INTO users (id, email, display_name, password_hash)
    VALUES (?, ?, ?, ?)
  `,
  ).run(id, email.toLowerCase(), displayName.trim(), passwordHash);

  const token = signToken(id, email.toLowerCase());
  res.status(201).json({
    success: true,
    data: {
      token,
      user: { id, email: email.toLowerCase(), displayName: displayName.trim() },
    },
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, error: "E-Mail und Passwort erforderlich." });
  }

  const user = db
    .prepare(
      "SELECT id, email, display_name, password_hash FROM users WHERE email = ?",
    )
    .get(email.toLowerCase()) as
    | { id: string; email: string; display_name: string; password_hash: string }
    | undefined;

  // Constant-time comparison — always run bcrypt even if user not found
  const hash =
    user?.password_hash ??
    "$2a$12$invalidhashtopreventtimingattack000000000000000000000000";
  const valid = await bcrypt.compare(password, hash);

  if (!user || !valid) {
    return res
      .status(401)
      .json({ success: false, error: "E-Mail oder Passwort falsch." });
  }

  const token = signToken(user.id, user.email);
  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, email: user.email, displayName: user.display_name },
    },
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

authRouter.get("/me", authMiddleware, (req: Request, res: Response) => {
  const userId = (req as import("../middleware/auth.js").AuthRequest).userId;
  const user = db
    .prepare("SELECT id, email, display_name FROM users WHERE id = ?")
    .get(userId) as
    | { id: string; email: string; display_name: string }
    | undefined;

  if (!user)
    return res
      .status(404)
      .json({ success: false, error: "Benutzer nicht gefunden." });
  res.json({
    success: true,
    data: { id: user.id, email: user.email, displayName: user.display_name },
  });
});

/** Idempotent DB init for auth — called from server.ts */
export function initAuthTable(): void {
  // users table already created in database.ts — nothing extra needed
  // Remove the insecure local-user seed in production-aware way
  const localUser = db
    .prepare("SELECT id FROM users WHERE id = 'local-user'")
    .get();
  if (localUser) {
    // Only remove if no real sessions depend on it (safe migration)
    const sessions = db
      .prepare(
        "SELECT COUNT(*) as cnt FROM exam_sessions WHERE user_id = 'local-user'",
      )
      .get() as { cnt: number };
    if (sessions.cnt === 0) {
      db.prepare("DELETE FROM users WHERE id = 'local-user'").run();
    }
  }
}
