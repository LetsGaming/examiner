import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAnswerState } from '../composables/useAnswerState'
import type { Task } from '../types/index'

// ─── Mock useApi so no real HTTP calls happen ─────────────────────────────────
vi.mock('../composables/useApi.js', () => ({
  saveAnswer: vi.fn().mockResolvedValue('mock-answer-id'),
  uploadDiagramImage: vi.fn().mockResolvedValue({ answerId: 'mock-upload-id', imagePath: '/path' }),
}))

const MOCK_TASKS: Task[] = [
  {
    id: 'task-1',
    position: 1,
    topicArea: 'Datenbanken',
    maxPoints: 10,
    subtasks: [
      { id: 'st-1a', label: 'a', taskType: 'freitext',   questionText: 'Frage a', points: 5 },
      { id: 'st-1b', label: 'b', taskType: 'mc',         questionText: 'Frage b', points: 5,
        mcOptions: [{ id: 'A', text: 'Option A' }, { id: 'B', text: 'Option B' }] },
    ],
  },
  {
    id: 'task-2',
    position: 2,
    topicArea: 'Algorithmen',
    maxPoints: 15,
    subtasks: [
      { id: 'st-2a', label: 'a', taskType: 'pseudocode',     questionText: 'Code', points: 8 },
      { id: 'st-2b', label: 'b', taskType: 'diagram_upload', questionText: 'Diagramm', points: 7 },
    ],
  },
]

describe('useAnswerState', () => {
  describe('Initialisierung', () => {
    it('erstellt AnswerState für alle Subtasks', () => {
      const { answerStates } = useAnswerState('session-1', MOCK_TASKS)
      expect(answerStates.value.size).toBe(4)
      expect(answerStates.value.has('st-1a')).toBe(true)
      expect(answerStates.value.has('st-1b')).toBe(true)
      expect(answerStates.value.has('st-2a')).toBe(true)
      expect(answerStates.value.has('st-2b')).toBe(true)
    })

    it('startet mit leeren Werten', () => {
      const { answerStates } = useAnswerState('session-1', MOCK_TASKS)
      const state = answerStates.value.get('st-1a')!
      expect(state.textValue).toBe('')
      expect(state.selectedMcOption).toBeNull()
      expect(state.uploadedFile).toBeNull()
      expect(state.answerId).toBeNull()
    })

    it('flatSubtasks hat 4 Einträge in richtiger Reihenfolge', () => {
      const { flatSubtasks } = useAnswerState('session-1', MOCK_TASKS)
      expect(flatSubtasks.value).toHaveLength(4)
      expect(flatSubtasks.value[0].subtask.id).toBe('st-1a')
      expect(flatSubtasks.value[1].subtask.id).toBe('st-1b')
      expect(flatSubtasks.value[2].subtask.id).toBe('st-2a')
      expect(flatSubtasks.value[3].subtask.id).toBe('st-2b')
    })
  })

  describe('answeredCount', () => {
    it('0 am Anfang', () => {
      const { answeredCount } = useAnswerState('session-1', MOCK_TASKS)
      expect(answeredCount.value).toBe(0)
    })

    it('steigt wenn textValue gesetzt wird', () => {
      const { answerStates, answeredCount } = useAnswerState('session-1', MOCK_TASKS)
      answerStates.value.get('st-1a')!.textValue = 'Meine Antwort'
      expect(answeredCount.value).toBe(1)
    })

    it('steigt wenn MC-Option ausgewählt wird', () => {
      const { answerStates, answeredCount } = useAnswerState('session-1', MOCK_TASKS)
      answerStates.value.get('st-1b')!.selectedMcOption = 'A'
      expect(answeredCount.value).toBe(1)
    })

    it('zählt Whitespace-only nicht als beantwortet', () => {
      const { answerStates, answeredCount } = useAnswerState('session-1', MOCK_TASKS)
      answerStates.value.get('st-1a')!.textValue = '   '
      expect(answeredCount.value).toBe(0)
    })

    it('zählt mehrere beantwortete Subtasks korrekt', () => {
      const { answerStates, answeredCount } = useAnswerState('session-1', MOCK_TASKS)
      answerStates.value.get('st-1a')!.textValue = 'Antwort'
      answerStates.value.get('st-1b')!.selectedMcOption = 'B'
      answerStates.value.get('st-2a')!.textValue = 'BEGIN\nEND'
      expect(answeredCount.value).toBe(3)
    })
  })

  describe('isAnswered', () => {
    it('gibt false zurück für unbeantwortete Subtask', () => {
      const { isAnswered } = useAnswerState('session-1', MOCK_TASKS)
      expect(isAnswered(0, 0)).toBe(false)
    })

    it('gibt true zurück nach textValue-Eingabe', () => {
      const { answerStates, isAnswered } = useAnswerState('session-1', MOCK_TASKS)
      answerStates.value.get('st-1a')!.textValue = 'Antwort'
      expect(isAnswered(0, 0)).toBe(true)
    })

    it('gibt true zurück nach MC-Selektion', () => {
      const { answerStates, isAnswered } = useAnswerState('session-1', MOCK_TASKS)
      answerStates.value.get('st-1b')!.selectedMcOption = 'A'
      expect(isAnswered(0, 1)).toBe(true)
    })

    it('gibt false zurück für ungültigen Index', () => {
      const { isAnswered } = useAnswerState('session-1', MOCK_TASKS)
      expect(isAnswered(99, 99)).toBe(false)
    })
  })

  describe('getState', () => {
    it('gibt State für bekannte subtaskId zurück', () => {
      const { getState } = useAnswerState('session-1', MOCK_TASKS)
      expect(getState('st-2a')).toBeDefined()
    })

    it('gibt undefined für unbekannte subtaskId zurück', () => {
      const { getState } = useAnswerState('session-1', MOCK_TASKS)
      expect(getState('nicht-vorhanden')).toBeUndefined()
    })
  })

  describe('F-009: persistAll läuft parallel', () => {
    it('ruft saveAnswer für alle nicht-upload Subtasks auf', async () => {
      const { saveAnswer } = await import('../composables/useApi.js')
      vi.clearAllMocks()

      const { answerStates, persistAll } = useAnswerState('session-1', MOCK_TASKS)
      answerStates.value.get('st-1a')!.textValue = 'Antwort A'
      answerStates.value.get('st-2a')!.textValue = 'BEGIN END'

      await persistAll()

      // persistAll versucht alle 4 Subtasks zu speichern.
      // st-2b (diagram_upload) hat kein uploadedFile → fällt durch auf saveAnswer.
      // Daher: 4 saveAnswer-Calls total (alle Subtasks, da kein uploadedFile gesetzt ist).
      expect(saveAnswer).toHaveBeenCalledTimes(4)
    })
  })
})
