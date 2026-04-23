/**
 * concurrency.ts — Per-resource mutex utilities.
 *
 * Provides lightweight in-process locks to prevent duplicate concurrent
 * operations (e.g. two parallel exam-start requests for the same user,
 * or two pool-generation jobs for the same part+specialty pair).
 *
 * These are intentionally simple in-memory locks — they are sufficient
 * for a single-process Node.js server. If the app ever runs as a cluster
 * or multi-instance deployment, replace with a Redis-based distributed lock.
 */

/** Generic per-key mutex backed by a Set of active keys. */
class KeyMutex {
  private readonly active = new Set<string>();

  isLocked(key: string): boolean {
    return this.active.has(key);
  }

  acquire(key: string): boolean {
    if (this.active.has(key)) return false;
    this.active.add(key);
    return true;
  }

  release(key: string): void {
    this.active.delete(key);
  }

  /**
   * Wait until `key` is no longer locked, with a configurable timeout.
   * Resolves `true` when the lock is free, `false` on timeout.
   */
  async waitUntilFree(key: string, timeoutMs = 120_000, pollMs = 200): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (this.active.has(key) && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollMs));
    }
    return !this.active.has(key);
  }
}

/** Mutex for per-user exam-start requests (prevents double-starting). */
export const examStartMutex = new KeyMutex();

/** Mutex for per-part+specialty pool-generation jobs. */
export const poolGenerationMutex = new KeyMutex();

/** Mutex for per-answer re-evaluation requests (prevents UNIQUE race). */
export const evaluationMutex = new KeyMutex();
