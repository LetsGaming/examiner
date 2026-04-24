/**
 * views/admin/composables/useAdminMaintenance.ts — Backup- + Reklassifizierungs-State.
 *
 * Zwei getrennte Aktionen mit jeweils eigenem Running-Flag und Feedback, damit
 * ein laufendes Backup den Reklassifizierungs-Button nicht sperrt und umgekehrt.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { ref } from 'vue';
import {
  adminCreateBackup,
  adminFetchBackups,
  adminReclassify,
} from '../../../composables/api/index.js';

export function useAdminMaintenance() {
  // Backups
  const backups = ref<unknown[]>([]);
  const backupRunning = ref(false);
  const backupResult = ref<string | null>(null);

  // Reclassify
  const reclassRunning = ref(false);
  const reclassResult = ref<string | null>(null);
  const reclassError = ref<string | null>(null);

  async function loadBackups(): Promise<void> {
    // Fehler beim Backup-Listing ist non-fatal: leere Liste ist ein gültiger
    // Zustand (z.B. frische Installation ohne Backup-Ordner).
    backups.value = await adminFetchBackups().catch(() => []);
  }

  async function createBackup(): Promise<void> {
    backupRunning.value = true;
    backupResult.value = null;
    try {
      const r = await adminCreateBackup();
      backupResult.value = `Backup erstellt: ${r.path}`;
      await loadBackups();
    } finally {
      backupRunning.value = false;
    }
  }

  async function runReclassify(): Promise<void> {
    reclassRunning.value = true;
    reclassResult.value = null;
    reclassError.value = null;
    try {
      await adminReclassify();
      reclassResult.value = 'Reklassifizierung abgeschlossen ✓';
    } catch (e: unknown) {
      reclassError.value = e instanceof Error ? e.message : 'Fehler';
    } finally {
      reclassRunning.value = false;
    }
  }

  return {
    backups,
    backupRunning,
    backupResult,
    reclassRunning,
    reclassResult,
    reclassError,
    loadBackups,
    createBackup,
    runReclassify,
  };
}

export type UseAdminMaintenance = ReturnType<typeof useAdminMaintenance>;
