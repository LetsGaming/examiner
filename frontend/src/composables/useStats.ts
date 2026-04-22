/**
 * useStats.ts — Lädt und cached die Lernstatistiken für 1 Minute.
 */
import { ref, readonly } from 'vue'
import { fetchMyStats } from './useApi.js'
import type { MyStats } from '../types/index.js'

const stats = ref<MyStats | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let lastFetch = 0
const CACHE_MS = 60_000

export function useStats() {
  async function load(force = false) {
    if (!force && stats.value && Date.now() - lastFetch < CACHE_MS) return
    loading.value = true
    error.value = null
    try {
      stats.value = await fetchMyStats()
      lastFetch = Date.now()
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Fehler beim Laden'
    } finally {
      loading.value = false
    }
  }

  function invalidate() {
    lastFetch = 0
  }

  return { stats: readonly(stats), loading: readonly(loading), error: readonly(error), load, invalidate }
}
