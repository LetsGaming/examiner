/**
 * useTheme.ts — Dark/Light-Mode mit Persistenz via user_settings.
 */
import { ref } from 'vue'
import { fetchUserSetting, saveUserSetting } from './useApi.js'

type Theme = 'dark' | 'light'

const theme = ref<Theme>('dark')
let initialized = false

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
  theme.value = t
}

export function useTheme() {
  async function init() {
    if (initialized) return
    initialized = true
    // 1. Aus Backend laden
    const stored = await fetchUserSetting('theme')
    if (stored === 'light' || stored === 'dark') {
      applyTheme(stored)
      return
    }
    // 2. Browser-Präferenz
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(prefersDark ? 'dark' : 'light')
  }

  async function toggle() {
    const next: Theme = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    try { await saveUserSetting('theme', next) } catch { /* non-critical */ }
  }

  return { theme, init, toggle }
}
