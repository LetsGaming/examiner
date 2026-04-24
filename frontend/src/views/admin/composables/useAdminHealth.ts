/**
 * views/admin/composables/useAdminHealth.ts — Pool-Health-State + Derived Values.
 *
 * Wird sowohl vom Dashboard-Tab (nur Score) als auch vom Health-Tab (volle
 * Issue-Liste) konsumiert. Die State-Instanz lebt im Admin-Shell und wird per
 * DI an beide Sections gegeben — kein Singleton, damit Testbarkeit erhalten bleibt.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { computed, ref } from 'vue';
import type { AdminHealth } from '../../../types/index.js';
import { adminFetchHealth } from '../../../composables/api/index.js';

export type UseAdminHealth = ReturnType<typeof useAdminHealth>;

export function useAdminHealth() {
  const health = ref<AdminHealth | null>(null);
  const loading = ref(false);

  const score = computed(() => health.value?.score ?? null);

  const errorCount = computed(
    () => health.value?.issues.filter((i) => i.severity === 'error').length ?? 0,
  );
  const warningCount = computed(
    () => health.value?.issues.filter((i) => i.severity === 'warning').length ?? 0,
  );
  const infoCount = computed(
    () => health.value?.issues.filter((i) => i.severity === 'info').length ?? 0,
  );

  /** Tailwind-freier CSS-Class-Modifier für den Health-Score-Pill. */
  const pillClass = computed(() => {
    const s = score.value;
    if (s === null) return '';
    if (s >= 75) return 'health-good';
    if (s >= 50) return 'health-ok';
    return 'health-bad';
  });

  async function load(): Promise<void> {
    loading.value = true;
    try {
      health.value = await adminFetchHealth();
    } finally {
      loading.value = false;
    }
  }

  return {
    health,
    loading,
    score,
    errorCount,
    warningCount,
    infoCount,
    pillClass,
    load,
  };
}
