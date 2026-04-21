import axios from 'axios'
import { API_BASE_URL } from '../constants.js'
import type {
  ExamTemplate,
  ExamSession,
  AiEvaluation,
  ApiResponse,
} from '../types/index.js'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
})

export async function fetchExamList(): Promise<ExamTemplate[]> {
  const { data } = await api.get<ApiResponse<ExamTemplate[]>>('/exams')
  if (!data.success || !data.data) throw new Error(data.error ?? 'Fehler beim Laden')
  return data.data
}

export async function fetchExamTemplate(examId: string): Promise<ExamTemplate> {
  const { data } = await api.get<ApiResponse<ExamTemplate>>(`/exams/${examId}`)
  if (!data.success || !data.data) throw new Error(data.error ?? 'Prüfung nicht gefunden')
  return data.data
}

export async function startSession(examId: string): Promise<string> {
  const { data } = await api.post<ApiResponse<{ sessionId: string }>>(`/exams/${examId}/sessions`)
  if (!data.success || !data.data) throw new Error(data.error ?? 'Session-Start fehlgeschlagen')
  return data.data.sessionId
}

export async function fetchSession(sessionId: string): Promise<ExamSession> {
  const { data } = await api.get<ApiResponse<ExamSession>>(`/sessions/${sessionId}`)
  if (!data.success || !data.data) throw new Error(data.error ?? 'Session nicht gefunden')
  return data.data
}

export async function saveAnswer(
  sessionId: string,
  subtaskId: string,
  payload: { textValue?: string; selectedMcOption?: string | null }
): Promise<string> {
  const { data } = await api.put<ApiResponse<{ answerId: string }>>(
    `/sessions/${sessionId}/answers/${subtaskId}`,
    payload
  )
  if (!data.success || !data.data) throw new Error(data.error ?? 'Speichern fehlgeschlagen')
  return data.data.answerId
}

export async function uploadDiagramImage(
  sessionId: string,
  subtaskId: string,
  file: File
): Promise<{ answerId: string; imagePath: string }> {
  const formData = new FormData()
  formData.append('diagram', file)

  const { data } = await api.post<ApiResponse<{ answerId: string; imagePath: string }>>(
    `/sessions/${sessionId}/answers/${subtaskId}/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  if (!data.success || !data.data) throw new Error(data.error ?? 'Upload fehlgeschlagen')
  return data.data
}

export async function requestEvaluation(
  sessionId: string,
  answerId: string
): Promise<AiEvaluation> {
  const { data } = await api.post<ApiResponse<AiEvaluation>>(
    `/sessions/${sessionId}/answers/${answerId}/evaluate`
  )
  if (!data.success || !data.data) throw new Error(data.error ?? 'Bewertung fehlgeschlagen')
  return data.data
}

export async function submitSession(
  sessionId: string
): Promise<{ totalScore: number; maxPoints: number; percentageScore: number; ihkGrade: string }> {
  const { data } = await api.post<ApiResponse<{ totalScore: number; maxPoints: number; percentageScore: number; ihkGrade: string }>>(
    `/sessions/${sessionId}/submit`
  )
  if (!data.success || !data.data) throw new Error(data.error ?? 'Abgabe fehlgeschlagen')
  return data.data
}
