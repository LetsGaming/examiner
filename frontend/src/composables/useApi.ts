/**
 * useApi — centralised HTTP client.
 *
 * All backend communication goes through here.  Axios handles auth headers and
 * 401 redirects via interceptors so call-sites stay clean.
 */
import axios from 'axios';
import { API_BASE_URL } from '../constants.js';
import { getAuthHeaders, clearToken } from './useAuth.js';
import type {
  ExamPart,
  Specialty,
  ExamSession,
  AiEvaluation,
  ApiResponse,
  AiSettings,
  PoolPartStatus,
  TaskWarning,
} from '../types/index.js';

const api = axios.create({ baseURL: API_BASE_URL, timeout: 60_000 });

api.interceptors.request.use((config) => {
  const { Authorization } = getAuthHeaders();
  if (Authorization) config.headers.Authorization = Authorization;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function apiLogin(
  email: string,
  password: string,
): Promise<{ token: string; user: { id: string; email: string; displayName: string } }> {
  const { data } = await api.post<ApiResponse<{ token: string; user: { id: string; email: string; displayName: string } }>>('/auth/login', { email, password });
  if (!data.success || !data.data) throw new Error(data.error ?? 'Anmeldung fehlgeschlagen');
  return data.data;
}

export async function apiRegister(
  email: string,
  password: string,
  displayName: string,
): Promise<{ token: string; user: { id: string; email: string; displayName: string } }> {
  const { data } = await api.post<ApiResponse<{ token: string; user: { id: string; email: string; displayName: string } }>>('/auth/register', { email, password, displayName });
  if (!data.success || !data.data) throw new Error(data.error ?? 'Registrierung fehlgeschlagen');
  return data.data;
}

// ─── Pool / Home ──────────────────────────────────────────────────────────────

export async function fetchPoolStatus(specialty: Specialty): Promise<PoolPartStatus[]> {
  const { data } = await api.get<ApiResponse<{ parts: PoolPartStatus[] }>>(`/exams/pool-status?specialty=${specialty}`);
  if (!data.success || !data.data) throw new Error(data.error ?? 'Pool-Status Fehler');
  return data.data.parts;
}

export async function generatePool(
  part: ExamPart,
  count: number,
  specialty: Specialty,
): Promise<{ added: number; poolSize: number; warnings?: TaskWarning[] }> {
  const { data } = await api.post<ApiResponse<{ added: number; poolSize: number; warnings?: TaskWarning[] }>>('/exams/generate', { part, count, specialty });
  if (!data.success || !data.data) throw new Error(data.error ?? 'Generierung fehlgeschlagen');
  return data.data;
}

export async function startExam(
  part: ExamPart,
  specialty: Specialty,
): Promise<{ sessionId: string; needsGeneration?: boolean }> {
  const { data } = await api.post<ApiResponse<{ sessionId: string; needsGeneration?: boolean }>>('/exams/start', { part, specialty });
  if (!data.success) throw Object.assign(new Error(data.error ?? 'Start fehlgeschlagen'), { needsGeneration: (data as { needsGeneration?: boolean }).needsGeneration });
  return data.data!;
}

// ─── AI Settings ─────────────────────────────────────────────────────────────

export async function fetchAiSettings(): Promise<AiSettings> {
  const { data } = await api.get<ApiResponse<AiSettings>>('/settings/ai');
  if (!data.success || !data.data) throw new Error(data.error ?? 'Einstellungen Fehler');
  return data.data;
}

export async function saveAiSettings(provider: string, apiKey?: string): Promise<{ keyStored: boolean }> {
  const body: Record<string, string> = { provider };
  if (apiKey?.trim()) body.apiKey = apiKey.trim();
  const { data } = await api.put<ApiResponse<{ keyStored: boolean }>>('/settings/ai', body);
  if (!data.success || !data.data) throw new Error(data.error ?? 'Speichern fehlgeschlagen');
  return data.data;
}

export async function deleteAiKey(): Promise<void> {
  const { data } = await api.delete<ApiResponse<void>>('/settings/ai');
  if (!data.success) throw new Error(data.error ?? 'Löschen fehlgeschlagen');
}

// ─── Session ──────────────────────────────────────────────────────────────────

export async function fetchSession(sessionId: string): Promise<ExamSession> {
  const { data } = await api.get<ApiResponse<ExamSession>>(`/sessions/${sessionId}`);
  if (!data.success || !data.data) throw new Error(data.error ?? 'Session nicht gefunden');
  return data.data;
}

export async function saveAnswer(
  sessionId: string,
  subtaskId: string,
  payload: { textValue?: string; selectedMcOption?: string | null },
): Promise<string> {
  const { data } = await api.put<ApiResponse<{ answerId: string }>>(`/sessions/${sessionId}/answers/${subtaskId}`, payload);
  if (!data.success || !data.data) throw new Error(data.error ?? 'Speichern fehlgeschlagen');
  return data.data.answerId;
}

export async function uploadDiagramImage(
  sessionId: string,
  subtaskId: string,
  file: File,
): Promise<{ answerId: string; imagePath: string }> {
  const formData = new FormData();
  formData.append('diagram', file);
  const { data } = await api.post<ApiResponse<{ answerId: string; imagePath: string }>>(
    `/sessions/${sessionId}/answers/${subtaskId}/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  if (!data.success || !data.data) throw new Error(data.error ?? 'Upload fehlgeschlagen');
  return data.data;
}

export async function requestEvaluation(
  sessionId: string,
  answerId: string,
): Promise<AiEvaluation> {
  const { data } = await api.post<ApiResponse<AiEvaluation>>(`/sessions/${sessionId}/answers/${answerId}/evaluate`);
  if (!data.success || !data.data) throw new Error(data.error ?? 'Bewertung fehlgeschlagen');
  return data.data;
}

export async function submitSession(sessionId: string): Promise<{
  totalScore: number;
  maxPoints: number;
  percentageScore: number;
  ihkGrade: string;
}> {
  const { data } = await api.post<ApiResponse<{ totalScore: number; maxPoints: number; percentageScore: number; ihkGrade: string }>>(`/sessions/${sessionId}/submit`);
  if (!data.success || !data.data) throw new Error(data.error ?? 'Abgabe fehlgeschlagen');
  return data.data;
}

