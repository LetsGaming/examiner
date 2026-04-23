#!/usr/bin/env tsx
/**
 * make-admin.ts — Promote or demote a user to/from admin.
 *
 * Usage:
 *   npx tsx scripts/make-admin.ts <email>           # promote
 *   npx tsx scripts/make-admin.ts <email> --revoke  # demote
 *
 * Run from the backend project root so the DB path resolves correctly.
 */
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve DB path the same way database.ts does.
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, process.env.DB_FILENAME ?? 'ap2_trainer.db');

// Dynamic import keeps this script independent of the compiled build.
const { default: DatabaseConstructor } = await import('better-sqlite3');
const db = new DatabaseConstructor(DB_PATH);

const [, , email, flag] = process.argv;
const revoke = flag === '--revoke';

if (!email || !email.includes('@')) {
  console.error('Usage: npx tsx scripts/make-admin.ts <email> [--revoke]');
  process.exit(1);
}

const user = db
  .prepare('SELECT id, email, display_name, is_admin FROM users WHERE email = ?')
  .get(email.toLowerCase()) as
  | { id: string; email: string; display_name: string; is_admin: number }
  | undefined;

if (!user) {
  console.error(`✗ Kein Benutzer mit der E-Mail "${email}" gefunden.`);
  console.error('  Tipp: Benutzer muss sich zuerst registrieren.');
  process.exit(1);
}

const newValue = revoke ? 0 : 1;
if (user.is_admin === newValue) {
  const status = newValue ? 'bereits Admin' : 'kein Admin';
  console.log(`ℹ  ${user.display_name} <${user.email}> ist ${status} — keine Änderung.`);
  process.exit(0);
}

db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(newValue, user.id);

const action = newValue ? 'zu Admin befördert' : 'Admin-Rechte entzogen';
console.log(`✓ ${user.display_name} <${user.email}> — ${action}.`);
