/**
 * Auth routes — register, login, me
 *
 * POST /api/auth/register  { email, password, displayName }
 * POST /api/auth/login     { email, password }
 * GET  /api/auth/me        (requires Bearer token)
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { signToken, authMiddleware } from '../middleware/auth.js';

export const authRouter = Router();

const BCRYPT_ROUNDS = 12;

// ─── POST /api/auth/register ─────────────────────────────────────────────────

authRouter.post('/register', async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body as {
    email?: string;
    password?: string;
    displayName?: string;
  };

  if (!email || !password || !displayName) {
    return res.status(400).json({
      success: false,
      error: 'E-Mail, Passwort und Name sind erforderlich.',
    });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Ungültige E-Mail-Adresse.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Passwort muss mindestens 8 Zeichen lang sein.',
    });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ success: false, error: 'Diese E-Mail ist bereits registriert.' });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = crypto.randomUUID().replace(/-/g, '');

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

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'E-Mail und Passwort erforderlich.' });
  }

  const user = db
    .prepare('SELECT id, email, display_name, password_hash, is_admin FROM users WHERE email = ?')
    .get(email.toLowerCase()) as
    | { id: string; email: string; display_name: string; password_hash: string; is_admin: boolean }
    | undefined;

  // Constant-time comparison — always run bcrypt even if user not found
  const hash =
    user?.password_hash ?? '$2a$12$invalidhashtopreventtimingattack000000000000000000000000';
  const valid = await bcrypt.compare(password, hash);

  if (!user || !valid) {
    return res.status(401).json({ success: false, error: 'E-Mail oder Passwort falsch.' });
  }

  const token = signToken(user.id, user.email);
  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, email: user.email, displayName: user.display_name, isAdmin: user.is_admin },
    },
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

authRouter.get('/me', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as import('../middleware/auth.js').AuthRequest).userId;
  const user = db.prepare('SELECT id, email, display_name, is_admin FROM users WHERE id = ?').get(userId) as
    | { id: string; email: string; display_name: string; is_admin: boolean }
    | undefined;

  if (!user) return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden.' });
  res.json({
    success: true,
    data: { id: user.id, email: user.email, displayName: user.display_name, isAdmin: user.is_admin },
  });
});

/** Idempotent DB init for auth — called from server.ts */
export function initAuthTable(): void {
  // users table already created in database.ts — nothing extra needed
  // Remove the insecure local-user seed in production-aware way
  const localUser = db.prepare("SELECT id FROM users WHERE id = 'local-user'").get();
  if (localUser) {
    // Only remove if no real sessions depend on it (safe migration)
    const sessions = db
      .prepare("SELECT COUNT(*) as cnt FROM exam_sessions WHERE user_id = 'local-user'")
      .get() as { cnt: number };
    if (sessions.cnt === 0) {
      db.prepare("DELETE FROM users WHERE id = 'local-user'").run();
    }
  }
}

// ─── PUT /api/auth/profile ────────────────────────────────────────────────────
// Change display name and/or email.

authRouter.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as import('../middleware/auth.js').AuthRequest).userId;
  const { displayName, email } = req.body as { displayName?: string; email?: string };

  if (!displayName && !email) {
    return res.status(400).json({ success: false, error: 'Mindestens ein Feld erforderlich.' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Ungültige E-Mail-Adresse.' });
  }
  if (email) {
    const existing = db
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .get(email.toLowerCase(), userId);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Diese E-Mail ist bereits vergeben.' });
    }
  }

  // Build update statement dynamically — avoids spread type issues with better-sqlite3.
  if (displayName && email) {
    db.prepare('UPDATE users SET display_name = ?, email = ? WHERE id = ?').run(
      displayName.trim(),
      email.toLowerCase(),
      userId,
    );
  } else if (displayName) {
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(displayName.trim(), userId);
  } else if (email) {
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email.toLowerCase(), userId);
  }

  const updated = db
    .prepare('SELECT id, email, display_name FROM users WHERE id = ?')
    .get(userId) as { id: string; email: string; display_name: string };

  res.json({
    success: true,
    data: { id: updated.id, email: updated.email, displayName: updated.display_name },
  });
});

// ─── PUT /api/auth/password ───────────────────────────────────────────────────
// Change password — requires current password for verification.

authRouter.put('/password', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as import('../middleware/auth.js').AuthRequest).userId;
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ success: false, error: 'Aktuelles und neues Passwort erforderlich.' });
  }
  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ success: false, error: 'Neues Passwort muss mindestens 8 Zeichen lang sein.' });
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as
    | { password_hash: string }
    | undefined;
  if (!user) return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden.' });

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) return res.status(401).json({ success: false, error: 'Aktuelles Passwort falsch.' });

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);

  res.json({ success: true });
});

// ─── DELETE /api/auth/account ─────────────────────────────────────────────────
// Delete own account — requires password confirmation.

authRouter.delete('/account', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as import('../middleware/auth.js').AuthRequest).userId;
  const { password } = req.body as { password?: string };

  if (!password) {
    return res
      .status(400)
      .json({ success: false, error: 'Passwort zur Bestätigung erforderlich.' });
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as
    | { password_hash: string }
    | undefined;
  if (!user) return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden.' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ success: false, error: 'Passwort falsch.' });

  // CASCADE deletes handle all related data (sessions, answers, settings, etc.)
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  res.json({ success: true });
});
