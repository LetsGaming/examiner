/**
 * views/admin/composables/useAdminPool.ts — Pool-Browser-State für Teil 1/2/3.
 *
 * Kapselt: Aufgaben-Liste, Such-/Filter-/Sort-State, Debounce für die
 * Tipp-Suche, explizite Reloads bei Filter-Änderung.
 *
 * Die Part-Ableitung kommt von außen (Shell weiß aus dem aktiven Tab, welcher
 * Teil gerade gezeigt wird) — damit bleibt das Composable frei von Tab-Logik.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { onBeforeUnmount, ref } from 'vue';
import type { Ref } from 'vue';
import type { AdminPoolTask, ExamPart, Specialty } from '../../../types/index.js';
import { adminFetchPool } from '../../../composables/api/index.js';

export interface UseAdminPoolOptions {
  /** Aktuell angezeigter Prüfungsteil — Shell liefert das aus dem Tab-State. */
  currentPart: Ref<ExamPart>;
  /** Fachrichtung — aktuell hart FIAE, Signatur erlaubt späteren Switch. */
  specialty?: Specialty;
  /** Debounce-Dauer für die Tipp-Suche in ms. */
  searchDebounceMs?: number;
}

export function useAdminPool(opts: UseAdminPoolOptions) {
  const tasks = ref<AdminPoolTask[]>([]);
  const loading = ref(false);
  const search = ref('');
  const kind = ref('');
  const sort = ref('newest');

  const specialty: Specialty = opts.specialty ?? 'fiae';
  const debounceMs = opts.searchDebounceMs ?? 300;

  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  async function load(): Promise<void> {
    const part = opts.currentPart.value;
    // Wenn Shell uns mit einem Nicht-Pool-Tab triggert, still no-op.
    if (!part?.startsWith('teil_')) return;

    loading.value = true;
    try {
      tasks.value = await adminFetchPool(part, specialty, {
        search: search.value || undefined,
        kind: kind.value || undefined,
        sort: sort.value,
      });
    } finally {
      loading.value = false;
    }
  }

  function debouncedLoad(): void {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(load, debounceMs);
  }

  // Debounce-Timer beim Unmount aufräumen — sonst feuert er evtl. noch nach
  // dem Verlassen des Tabs und triggert einen Request auf einen disposeden Ref.
  onBeforeUnmount(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
  });

  return {
    tasks,
    loading,
    search,
    kind,
    sort,
    load,
    debouncedLoad,
  };
}
