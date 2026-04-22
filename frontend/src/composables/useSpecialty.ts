/**
 * useSpecialty — persists the active specialty (FIAE / FISI) across sessions.
 *
 * Module-level ref ensures the same reactive state is shared across all
 * composable instances without a Pinia store.
 */
import { ref, watch } from 'vue';
import type { Specialty } from '../types/index.js';

const STORAGE_KEY = 'ap2_specialty';

function readStored(): Specialty {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'fisi' ? 'fisi' : 'fiae';
}

const specialty = ref<Specialty>(readStored());

watch(specialty, (v) => localStorage.setItem(STORAGE_KEY, v));

export function useSpecialty() {
  function setSpecialty(s: Specialty) {
    specialty.value = s;
  }

  return { specialty, setSpecialty };
}
