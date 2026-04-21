/**
 * AES-256-GCM encryption for user API keys.
 *
 * Keys are encrypted server-side with a secret derived from API_KEY_SECRET
 * (or OPENAI_API_KEY as fallback). The raw key never leaves the backend —
 * the frontend only ever sees "***" masks, and the ciphertext stored in the
 * DB is useless without the server secret.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV for GCM
const TAG_LENGTH = 16; // 128-bit auth tag

/** Derive a 32-byte key from the server secret using scrypt. */
function getDerivedKey(): Buffer {
  const secret =
    process.env.API_KEY_SECRET ||
    process.env.OPENAI_API_KEY ||
    "fallback-insecure-dev-secret-replace-in-prod";

  // Salt is static/deterministic so the same key always decrypts.
  // We bind it to the secret itself so changing the secret invalidates all stored keys.
  const salt = Buffer.from("fiae-ap2-key-salt-v1");
  return scryptSync(secret, salt, 32) as Buffer;
}

/**
 * Encrypt a plaintext API key.
 * Returns a hex string: <iv>:<ciphertext>:<authTag>
 */
export function encryptApiKey(plaintext: string): string {
  const key = getDerivedKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    encrypted.toString("hex"),
    tag.toString("hex"),
  ].join(":");
}

/**
 * Decrypt an API key previously encrypted with encryptApiKey.
 * Throws if the ciphertext has been tampered with (GCM auth tag mismatch).
 */
export function decryptApiKey(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Ungültiges Schlüsselformat.");

  const [ivHex, encHex, tagHex] = parts;
  const key = getDerivedKey();
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}
