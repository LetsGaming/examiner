import { ref, computed, onBeforeUnmount } from 'vue'
import type { ExamPart } from '../types/index.js'

const DURATIONS: Record<ExamPart, number> = {
  teil_1: 90,
  teil_2: 90,
  teil_3: 60,
}

export function useExamTimer(examPart: ExamPart, onExpired: () => void) {
  const remainingSeconds = ref(DURATIONS[examPart] * 60)
  const timerRef = ref<ReturnType<typeof setInterval> | null>(null)

  const formattedTime = computed(() => {
    const s = remainingSeconds.value
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  })

  const timerClass = computed(() => {
    if (remainingSeconds.value < 60)  return 'timer-critical'
    if (remainingSeconds.value < 300) return 'timer-warning'
    return ''
  })

  function startTimer() {
    remainingSeconds.value = DURATIONS[examPart] * 60
    timerRef.value = setInterval(() => {
      remainingSeconds.value--
      if (remainingSeconds.value <= 0) {
        clearInterval(timerRef.value!)
        onExpired()
      }
    }, 1000)
  }

  function stopTimer() {
    if (timerRef.value) clearInterval(timerRef.value)
  }

  onBeforeUnmount(stopTimer)

  return { remainingSeconds, formattedTime, timerClass, startTimer, stopTimer }
}
