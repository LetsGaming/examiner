/**
 * Settings routes — AI provider & API key management
 *
 * GET    /api/settings/ai  → provider + masked key status (never plaintext)
 * PUT    /api/settings/ai  → stores provider + AES-256-GCM encrypted key
 * DELETE /api/settings/ai  → removes stored user key (falls back to env var)
 */

import { Router, Request, Response } from "express";
import { db } from "../db/database.js";
import { encryptApiKey, decryptApiKey } from "../utils/encryption.js";
import { getUserSetting, setUserSetting } from "../db/userSettings.js";

export const settingsRouter = Router();

// ─── Supported providers ──────────────────────────────────────────────────────

export type AiProvider =
  | "openai" // OpenAI — gpt-4o-mini / gpt-4o
  | "anthropic" // Anthropic — Claude family
  | "google" // Google — Gemini family
  | "mistral"; // Mistral AI

export interface ProviderMeta {
  id: AiProvider;
  label: string;
  keyPrefix: string; // Expected key prefix for basic validation
  keyHint: string; // Placeholder shown in the input field
  docsUrl: string;
  textModel: string; // Model used for text grading
  visionModel: string; // Model used for diagram/image grading
  apiBase: string; // Base URL for API calls
  /** Which env var to fall back to when no user key is stored */
  envVar: string;
}

export const PROVIDERS: Record<AiProvider, ProviderMeta> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    keyPrefix: "sk-",
    keyHint: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
    textModel: "gpt-4o-mini",
    visionModel: "gpt-4o-mini",
    apiBase: "https://api.openai.com/v1/chat/completions",
    envVar: "OPENAI_API_KEY",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    keyPrefix: "sk-ant-",
    keyHint: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
    textModel: "claude-haiku-4-5-20251001",
    visionModel: "claude-haiku-4-5-20251001",
    apiBase: "https://api.anthropic.com/v1/messages",
    envVar: "ANTHROPIC_API_KEY",
  },
  google: {
    id: "google",
    label: "Google (Gemini)",
    keyPrefix: "AI",
    keyHint: "AIza...",
    docsUrl: "https://aistudio.google.com/apikey",
    textModel: "gemini-3.1-flash-lite-preview",
    visionModel: "gemini-3.1-flash-lite-preview",
    apiBase: "https://generativelanguage.googleapis.com/v1beta/models",
    envVar: "GOOGLE_API_KEY",
  },
  mistral: {
    id: "mistral",
    label: "Mistral AI",
    keyPrefix: "",
    keyHint: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    docsUrl: "https://console.mistral.ai/api-keys",
    textModel: "mistral-small-latest",
    visionModel: "pixtral-12b-2409",
    apiBase: "https://api.mistral.ai/v1/chat/completions",
    envVar: "MISTRAL_API_KEY",
  },
};

export const VALID_PROVIDERS = Object.keys(PROVIDERS) as AiProvider[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserId(req: Request): string {
  return (req as unknown as { userId?: string }).userId ?? "local-user";
}

/** Ensure the settings table exists (idempotent). */
export function initSettingsTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_ai_settings (
      user_id           TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      ai_provider       TEXT NOT NULL DEFAULT 'openai',
      api_key_encrypted TEXT,
      updated_at        TEXT DEFAULT (datetime('now'))
    );
  `);
}

/**
 * Resolve the effective API key + provider for a user.
 *
 * Priority (strict):
 *   1. User-stored encrypted key  — always wins, regardless of env vars
 *   2. Any configured env var     — first match among all providers wins
 *
 * Returns null only if no key is available anywhere.
 */
export function resolveAiConfig(userId: string): {
  apiKey: string;
  provider: AiProvider;
  meta: ProviderMeta;
  source: "user" | "env";
} | null {
  const row = db
    .prepare(
      "SELECT ai_provider, api_key_encrypted FROM user_ai_settings WHERE user_id = ?",
    )
    .get(userId) as
    | { ai_provider: string; api_key_encrypted: string | null }
    | undefined;

  const storedProvider: AiProvider = VALID_PROVIDERS.includes(
    row?.ai_provider as AiProvider,
  )
    ? (row!.ai_provider as AiProvider)
    : "openai";

  // ── 1. User-stored encrypted key always takes priority ──────────────────
  if (row?.api_key_encrypted) {
    try {
      const apiKey = decryptApiKey(row.api_key_encrypted);
      const meta = PROVIDERS[storedProvider];
      return { apiKey, provider: storedProvider, meta, source: "user" };
    } catch {
      // Decryption failure (rotated API_KEY_SECRET) — fall through to env
      console.warn(
        "[resolveAiConfig] Entschlüsselung fehlgeschlagen — nutze Env-Fallback.",
      );
    }
  }

  // ── 2. Env-var fallback — check stored provider first, then any other ───
  // This means: if the user picked "anthropic" but only OPENAI_API_KEY is
  // set in the env, we still serve them rather than returning null.
  const providersToCheck: AiProvider[] = [
    storedProvider,
    ...VALID_PROVIDERS.filter((p) => p !== storedProvider),
  ];

  for (const provider of providersToCheck) {
    const meta = PROVIDERS[provider];
    const envKey = process.env[meta.envVar];
    if (envKey) {
      return { apiKey: envKey, provider, meta, source: "env" };
    }
  }

  return null;
}

/**
 * Resolve ONLY the server-side env-var AI config (ignores user-stored keys).
 * Used as a fallback when the user's own key fails.
 * Returns null if no env var is configured at all.
 */
export function resolveServerAiConfig(): {
  apiKey: string;
  provider: AiProvider;
  meta: ProviderMeta;
} | null {
  for (const provider of VALID_PROVIDERS) {
    const meta = PROVIDERS[provider];
    const envKey = process.env[meta.envVar];
    if (envKey) {
      return { apiKey: envKey, provider, meta };
    }
  }
  return null;
}

// ─── GET /api/settings/ai ────────────────────────────────────────────────────

settingsRouter.get("/ai", (req: Request, res: Response) => {
  const userId = getUserId(req);

  const row = db
    .prepare(
      "SELECT ai_provider, api_key_encrypted, updated_at FROM user_ai_settings WHERE user_id = ?",
    )
    .get(userId) as
    | {
        ai_provider: string;
        api_key_encrypted: string | null;
        updated_at: string;
      }
    | undefined;

  const provider: AiProvider = VALID_PROVIDERS.includes(
    row?.ai_provider as AiProvider,
  )
    ? (row!.ai_provider as AiProvider)
    : "openai";

  const meta = PROVIDERS[provider];
  const hasUserKey = !!row?.api_key_encrypted;
  const hasEnvKey = !!process.env[meta.envVar];

  res.json({
    success: true,
    data: {
      provider,
      providers: Object.values(PROVIDERS).map((p) => ({
        id: p.id,
        label: p.label,
        keyHint: p.keyHint,
        docsUrl: p.docsUrl,
        textModel: p.textModel,
        visionModel: p.visionModel,
      })),
      hasKey: hasUserKey || hasEnvKey,
      keySource: hasUserKey ? "user" : hasEnvKey ? "env" : "none",
      keyMasked: hasUserKey ? "••••••••••••••••••••••••••••••••" : null,
      updatedAt: row?.updated_at ?? null,
    },
  });
});

// ─── PUT /api/settings/ai ────────────────────────────────────────────────────

settingsRouter.put("/ai", (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { provider, apiKey } = req.body as {
    provider?: string;
    apiKey?: string;
  };

  if (provider && !VALID_PROVIDERS.includes(provider as AiProvider)) {
    return res.status(400).json({
      success: false,
      error: `Ungültiger Provider. Erlaubt: ${VALID_PROVIDERS.join(", ")}`,
    });
  }

  const effectiveProvider: AiProvider = (provider as AiProvider) ?? "openai";
  const hasNewKey = typeof apiKey === "string" && apiKey.trim().length > 0;

  if (hasNewKey && apiKey!.trim().length < 16) {
    return res.status(400).json({
      success: false,
      error: "API-Key scheint ungültig (zu kurz).",
    });
  }

  if (hasNewKey) {
    const encrypted = encryptApiKey(apiKey!.trim());
    db.prepare(
      `
      INSERT INTO user_ai_settings (user_id, ai_provider, api_key_encrypted, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        ai_provider       = excluded.ai_provider,
        api_key_encrypted = excluded.api_key_encrypted,
        updated_at        = datetime('now')
    `,
    ).run(userId, effectiveProvider, encrypted);
  } else {
    // Provider-only update — keep existing encrypted key
    const existing = db
      .prepare(
        "SELECT api_key_encrypted FROM user_ai_settings WHERE user_id = ?",
      )
      .get(userId) as { api_key_encrypted: string | null } | undefined;

    db.prepare(
      `
      INSERT INTO user_ai_settings (user_id, ai_provider, api_key_encrypted, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        ai_provider = excluded.ai_provider,
        updated_at  = datetime('now')
    `,
    ).run(userId, effectiveProvider, existing?.api_key_encrypted ?? null);
  }

  res.json({
    success: true,
    data: { provider: effectiveProvider, keyStored: hasNewKey },
  });
});

// ─── DELETE /api/settings/ai ─────────────────────────────────────────────────

settingsRouter.delete("/ai", (req: Request, res: Response) => {
  const userId = getUserId(req);

  db.prepare(
    `
    UPDATE user_ai_settings
    SET api_key_encrypted = NULL, updated_at = datetime('now')
    WHERE user_id = ?
  `,
  ).run(userId);

  res.json({
    success: true,
    data: { message: "Gespeicherter API-Key wurde entfernt." },
  });
});

// ─── Feature 11: User-Settings (Key-Value) ────────────────────────────────────

settingsRouter.get("/user/:key", (req: Request, res: Response) => {
  const userId = getUserId(req);
  try {
    const value = getUserSetting(userId, req.params.key as string, "");
    res.json({ success: true, data: { value } });
  } catch {
    // User existiert möglicherweise nicht (alter Token nach DB-Reset) → Defaultwert zurückgeben
    res.json({ success: true, data: { value: "" } });
  }
});

settingsRouter.put("/user/:key", (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { value } = req.body;
  if (typeof value !== "string") return res.status(400).json({ success: false, error: "value muss ein String sein." });
  try {
    setUserSetting(userId, req.params.key as string, value);
    res.json({ success: true });
  } catch (err) {
    // Non-critical: Settings-Speichern darf die App nicht crashen
    console.warn("[settings] setUserSetting fehlgeschlagen:", err instanceof Error ? err.message : err);
    res.json({ success: true }); // Frontend muss nicht davon erfahren
  }
});
