/**
 * useKeyboardShortcuts.ts — Zentrale Tastaturkürzel für den Prüfungsmodus.
 */
import { onMounted, onUnmounted, ref } from 'vue'

export interface ShortcutDef {
  key: string
  ctrl?: boolean
  description: string
  action: () => void
}

const overlayVisible = ref(false)

function isInputFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'textarea' || tag === 'input' || tag === 'select' ||
    (el as HTMLElement).isContentEditable
}

export function useKeyboardShortcuts(shortcuts: ShortcutDef[]) {
  function handler(e: KeyboardEvent) {
    // Shortcut-Overlay immer togglen mit '?'
    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !isInputFocused()) {
      overlayVisible.value = !overlayVisible.value
      e.preventDefault()
      return
    }
    // Overlay schließen mit Escape
    if (e.key === 'Escape') {
      if (overlayVisible.value) { overlayVisible.value = false; return }
    }
    // Kein Feuern in Input-Feldern (außer Ctrl-Kombinationen)
    if (!e.ctrlKey && !e.metaKey && isInputFocused()) return

    for (const sc of shortcuts) {
      const keyMatch = e.key === sc.key
      const ctrlMatch = sc.ctrl ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey)
      if (keyMatch && ctrlMatch) {
        e.preventDefault()
        sc.action()
        return
      }
    }
  }

  onMounted(() => window.addEventListener('keydown', handler))
  onUnmounted(() => window.removeEventListener('keydown', handler))

  return { overlayVisible, allShortcuts: shortcuts }
}
