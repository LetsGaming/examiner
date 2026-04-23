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
  const { data } = await api.post<
    ApiResponse<{ token: string; user: { id: string; email: string; displayName: string } }>
  >('/auth/login', { email, password });
  if (!data.success || !data.data) throw new Error(data.error ?? 'Anmeldung fehlgeschlagen');
  return data.data;
}

export async function apiRegister(
  email: string,
  password: string,
  displayName: string,
): Promise<{ token: string; user: { id: string; email: string; displayName: string } }> {
  const { data } = await api.post<
    ApiResponse<{ token: string; user: { id: string; email: string; displayName: string } }>
  >('/auth/register', { email, password, displayName });
  if (!data.success || !data.data) throw new Error(data.error ?? 'Registrierung fehlgeschlagen');
  return data.data;
}

// ─── Pool / Home ──────────────────────────────────────────────────────────────

// ─── Account management ───────────────────────────────────────────────────────

export async function updateProfile(body: {
  displayName?: string;
  email?: string;
}): Promise<{ id: string; email: string; displayName: string }> {
  const { data } = await api.put<ApiResponse<{ id: string; email: string; displayName: string }>>(
    '/auth/profile',
    body,
  );
  if (!data.success || !data.data)
    throw new Error(data.error ?? 'Profil konnte nicht gespeichert werden.');
  return data.data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.put('/auth/password', { currentPassword, newPassword });
}

export async function deleteAccount(password: string): Promise<void> {
  await api.delete('/auth/account', { data: { password } });
}

export async function fetchPracticeTopics(
  part: string,
  specialty: string,
): Promise<Array<{ topic: string; inferredKind: string; poolCount: number }>> {
  const { data } = await api.get<
    ApiResponse<Array<{ topic: string; inferredKind: string; poolCount: number }>>
  >(`/practice/topics?part=${part}&specialty=${specialty}`);
  return data.data ?? [];
}

export async function fetchPoolStatus(specialty: Specialty): Promise<PoolPartStatus[]> {
  const { data } = await api.get<ApiResponse<{ parts: PoolPartStatus[] }>>(
    `/exams/pool-status?specialty=${specialty}`,
  );
  if (!data.success || !data.data) throw new Error(data.error ?? 'Pool-Status Fehler');
  return data.data.parts;
}

export async function generatePool(
  part: ExamPart,
  count: number,
  specialty: Specialty,
): Promise<{ added: number; poolSize: number; warnings?: TaskWarning[] }> {
  const { data } = await api.post<
    ApiResponse<{ added: number; poolSize: number; warnings?: TaskWarning[] }>
  >('/exams/generate', { part, count, specialty });
  if (!data.success || !data.data) throw new Error(data.error ?? 'Generierung fehlgeschlagen');
  return data.data;
}

export async function startExam(
  part: ExamPart,
  specialty: Specialty,
): Promise<{ sessionId: string; needsGeneration?: boolean }> {
  const { data } = await api.post<ApiResponse<{ sessionId: string; needsGeneration?: boolean }>>(
    '/exams/start',
    { part, specialty },
  );
  if (!data.success)
    throw Object.assign(new Error(data.error ?? 'Start fehlgeschlagen'), {
      needsGeneration: (data as { needsGeneration?: boolean }).needsGeneration,
    });
  return data.data!;
}

// ─── AI Settings ─────────────────────────────────────────────────────────────

export async function fetchAiSettings(): Promise<AiSettings> {
  const { data } = await api.get<ApiResponse<AiSettings>>('/settings/ai');
  if (!data.success || !data.data) throw new Error(data.error ?? 'Einstellungen Fehler');
  return data.data;
}

export async function saveAiSettings(
  provider: string,
  apiKey?: string,
): Promise<{ keyStored: boolean }> {
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
  const { data } = await api.put<ApiResponse<{ answerId: string }>>(
    `/sessions/${sessionId}/answers/${subtaskId}`,
    payload,
  );
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
  const { data } = await api.post<ApiResponse<AiEvaluation>>(
    `/sessions/${sessionId}/answers/${answerId}/evaluate`,
  );
  if (!data.success || !data.data) throw new Error(data.error ?? 'Bewertung fehlgeschlagen');
  return data.data;
}

export async function submitSession(sessionId: string): Promise<{
  totalScore: number;
  maxPoints: number;
  percentageScore: number;
  ihkGrade: string;
}> {
  const { data } = await api.post<
    ApiResponse<{
      totalScore: number;
      maxPoints: number;
      percentageScore: number;
      ihkGrade: string;
    }>
  >(`/sessions/${sessionId}/submit`);
  if (!data.success || !data.data) throw new Error(data.error ?? 'Abgabe fehlgeschlagen');
  return data.data;
}

// ─── Stats (Feature 1) ────────────────────────────────────────────────────────

export async function fetchMyStats(): Promise<import('../types/index.js').MyStats> {
  const { data } =
    await api.get<import('../types/index.js').ApiResponse<import('../types/index.js').MyStats>>(
      '/stats/me',
    );
  if (!data.success || !data.data) throw new Error(data.error ?? 'Statistik-Fehler');
  return data.data;
}

// ─── History (Feature 6) ─────────────────────────────────────────────────────

export async function fetchSessionList(): Promise<import('../types/index.js').SessionListItem[]> {
  const { data } =
    await api.get<
      import('../types/index.js').ApiResponse<import('../types/index.js').SessionListItem[]>
    >('/sessions');
  if (!data.success || !data.data) throw new Error(data.error ?? 'History-Fehler');
  return data.data;
}

export async function fetchSessionDetail(sessionId: string): Promise<ExamSession> {
  const { data } = await api.get<import('../types/index.js').ApiResponse<ExamSession>>(
    `/sessions/${sessionId}/detail`,
  );
  if (!data.success || !data.data) throw new Error(data.error ?? 'Session-Detail-Fehler');
  return data.data;
}

// ─── Practice (Feature 2) ─────────────────────────────────────────────────────
export async function startPractice(body: {
  part: import('../types/index.js').ExamPart;
  topic?: string;
  taskKind?: string;
  count: number;
  specialty: import('../types/index.js').Specialty;
}): Promise<{ sessionId: string }> {
  const { data } = await api.post<import('../types/index.js').ApiResponse<{ sessionId: string }>>(
    '/practice/start',
    body,
  );
  if (!data.success || !data.data) throw new Error(data.error ?? 'Fehler beim Starten');
  return data.data;
}

// ─── Review (Feature 3) ───────────────────────────────────────────────────────
export async function fetchReviewDue(): Promise<{ count: number; items: unknown[] }> {
  const { data } =
    await api.get<import('../types/index.js').ApiResponse<{ count: number; items: unknown[] }>>(
      '/review/due',
    );
  if (!data.success || !data.data) throw new Error(data.error ?? 'Fehler');
  return data.data;
}
export async function startReviewSession(count: number): Promise<{ sessionId: string }> {
  const { data } = await api.post<import('../types/index.js').ApiResponse<{ sessionId: string }>>(
    '/review/start',
    { count },
  );
  if (!data.success || !data.data) throw new Error(data.error ?? 'Fehler');
  return data.data;
}
export async function skipReview(id: string): Promise<void> {
  await api.post(`/review/${id}/skip`);
}

// ─── Flagging (Feature 8) ─────────────────────────────────────────────────────
export async function setAnswerFlag(
  sessionId: string,
  subtaskId: string,
  flagged: boolean,
): Promise<void> {
  await api.patch(`/sessions/${sessionId}/answers/${subtaskId}`, { flagged });
}

// ─── Second Opinion (Feature 9) ───────────────────────────────────────────────
export async function requestSecondOpinion(
  sessionId: string,
  answerId: string,
): Promise<AiEvaluation> {
  const { data } = await api.post<import('../types/index.js').ApiResponse<AiEvaluation>>(
    `/sessions/${sessionId}/answers/${answerId}/re-evaluate`,
  );
  if (!data.success || !data.data) throw new Error(data.error ?? 'Fehler');
  return data.data;
}

// ─── User Settings (Feature 11) ───────────────────────────────────────────────
export async function fetchUserSetting(key: string): Promise<string | null> {
  try {
    const { data } = await api.get<import('../types/index.js').ApiResponse<{ value: string }>>(
      `/settings/user/${key}`,
    );
    return data.data?.value ?? null;
  } catch {
    return null;
  }
}
export async function saveUserSetting(key: string, value: string): Promise<void> {
  await api.put(`/settings/user/${key}`, { value });
}
