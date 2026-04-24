/**
 * views/admin/composables/useAdminDashboard.ts — Dashboard-State (Pool-Stats).
 *
 * Das Dashboard braucht parallel auch die Health-Daten (für den Score-Pill),
 * darum nimmt es `useAdminHealth` als Abhängigkeit per Parameter (DI).
 * So kann der Shell EINE health-Instanz halten und sowohl an Dashboard als
 * auch an den Health-Tab geben, ohne dass sie unabhängig voneinander laden.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { ref } from 'vue';
import type { AdminPoolStats } from '../../../types/index.js';
import { adminFetchStats, adminFetchHealth } from '../../../composables/api/index.js';
import type { UseAdminHealth } from './useAdminHealth.js';

export function useAdminDashboard(health: UseAdminHealth) {
  const stats = ref<AdminPoolStats | null>(null);
  const loading = ref(false);

  /**
   * Lädt Stats und Health parallel. Schreibt `health.health` direkt, ohne den
   * `loading`-Flag von `useAdminHealth` zu toggeln — Dashboard ownt seinen
   * eigenen Spinner. Sonst würde Dashboard-Load den Health-Tab-Spinner
   * aktivieren, obwohl der User noch auf dem Dashboard ist.
   */
  async function load(): Promise<void> {
    loading.value = true;
    try {
      const [s, h] = await Promise.all([adminFetchStats(), adminFetchHealth()]);
      stats.value = s;
      health.health.value = h;
    } finally {
      loading.value = false;
    }
  }

  return { stats, loading, load };
}
