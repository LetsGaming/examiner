import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useExamTimer } from '../composables/useExamTimer'

// Composables direkt testen ohne Vue-Komponenten-Overhead
// useExamTimer braucht kein DOM — onBeforeUnmount wird nie ausgeführt,
// aber das ist für diese Unit-Tests irrelevant (stopTimer wird manuell aufgerufen).

describe('useExamTimer', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  describe('Startzeit je Prüfungsteil', () => {
    it('teil_1 startet mit 90:00', () => {
      const { startTimer, formattedTime } = useExamTimer('teil_1', vi.fn())
      startTimer()
      expect(formattedTime.value).toBe('90:00')
    })

    it('teil_2 startet mit 90:00', () => {
      const { startTimer, formattedTime } = useExamTimer('teil_2', vi.fn())
      startTimer()
      expect(formattedTime.value).toBe('90:00')
    })

    it('teil_3 startet mit 60:00', () => {
      const { startTimer, formattedTime } = useExamTimer('teil_3', vi.fn())
      startTimer()
      expect(formattedTime.value).toBe('60:00')
    })
  })

  describe('Countdown', () => {
    it('zählt nach 1 Sekunde auf 89:59 herunter', () => {
      const { startTimer, formattedTime } = useExamTimer('teil_1', vi.fn())
      startTimer()
      vi.advanceTimersByTime(1000)
      expect(formattedTime.value).toBe('89:59')
    })

    it('zählt nach 60 Sekunden auf 89:00 herunter', () => {
      const { startTimer, formattedTime } = useExamTimer('teil_1', vi.fn())
      startTimer()
      vi.advanceTimersByTime(60_000)
      expect(formattedTime.value).toBe('89:00')
    })
  })

  describe('timerClass', () => {
    it('kein Class bei > 5 Minuten', () => {
      const { startTimer, timerClass } = useExamTimer('teil_1', vi.fn())
      startTimer()
      expect(timerClass.value).toBe('')
    })

    it('timer-warning bei 299 verbleibenden Sekunden', () => {
      const { startTimer, timerClass } = useExamTimer('teil_1', vi.fn())
      startTimer()
      // Advance so 299 seconds remain: 90*60 - 299 = 5101 sec elapsed
      vi.advanceTimersByTime((90 * 60 - 299) * 1000)
      expect(timerClass.value).toBe('timer-warning')
    })

    it('timer-critical bei 59 verbleibenden Sekunden', () => {
      const { startTimer, timerClass } = useExamTimer('teil_1', vi.fn())
      startTimer()
      // Advance so 59 seconds remain: 90*60 - 59 = 5341 sec elapsed
      vi.advanceTimersByTime((90 * 60 - 59) * 1000)
      expect(timerClass.value).toBe('timer-critical')
    })
  })

  describe('Ablauf-Callback', () => {
    it('ruft onExpired auf wenn Zeit abläuft', () => {
      const onExpired = vi.fn()
      const { startTimer } = useExamTimer('teil_3', onExpired)
      startTimer()
      vi.advanceTimersByTime(60 * 60 * 1000)
      expect(onExpired).toHaveBeenCalledOnce()
    })

    it('ruft onExpired NICHT auf wenn stopTimer vorher aufgerufen wird', () => {
      const onExpired = vi.fn()
      const { startTimer, stopTimer } = useExamTimer('teil_1', onExpired)
      startTimer()
      vi.advanceTimersByTime(30_000)
      stopTimer()
      vi.advanceTimersByTime(90 * 60 * 1000)
      expect(onExpired).not.toHaveBeenCalled()
    })
  })

  describe('F-002: Cancel stoppt Timer', () => {
    it('stopTimer verhindert weitere Dekrementierung', () => {
      const { startTimer, stopTimer, formattedTime } = useExamTimer('teil_1', vi.fn())
      startTimer()
      vi.advanceTimersByTime(5_000)
      const timeAtStop = formattedTime.value
      stopTimer()
      vi.advanceTimersByTime(10_000)
      expect(formattedTime.value).toBe(timeAtStop)
    })
  })
})

// Hinweis: Die Vue-Warnung "onBeforeUnmount is called when there is no active
// component instance" ist in diesen Tests erwartet. Sie tritt auf, weil der
// Composable direkt (außerhalb von setup()) aufgerufen wird. Das stopTimer()
// im Test übernimmt die Cleanup-Aufgabe. Für vollständige Lifecycle-Tests
// kann withSetup() aus @vue/test-utils verwendet werden.
