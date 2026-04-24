/**
 * composables/api/sessionApi.ts — Laufende Prüfungs-Session.
 *
 * Endpoints:
 *  - GET   /sessions/:id
 *  - PUT   /sessions/:id/answers/:subtaskId
 *  - POST  /sessions/:id/answers/:subtaskId/upload
 *  - PATCH /sessions/:id/answers/:subtaskId     (Flag)
 *  - POST  /sessions/:id/answers/:answerId/evaluate
 *  - POST  /sessions/:id/answers/:answerId/re-evaluate   (Second Opinion)
 *  - POST  /sessions/:id/submit
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { AiEvaluation, ApiResponse, ExamSession } from '../../types/index.js';
import { api } from './client.js';
import { unwrap } from './httpHelpers.js';

export interface SaveAnswerPayload {
  textValue?: string;
  selectedMcOption?: string | null;
}

export interface SubmitSessionResult {
  totalScore: number;
  maxPoints: number;
  percentageScore: number;
  ihkGrade: string;
}

export interface DiagramUploadResult {
  answerId: string;
  imagePath: string;
}

// ─── Session abrufen ────────────────────────────────────────────────────────

export async function fetchSession(sessionId: string): Promise<ExamSession> {
  const { data } = await api.get<ApiResponse<ExamSession>>(`/sessions/${sessionId}`);
  return unwrap(data, 'Session nicht gefunden');
}

// ─── Antworten speichern ────────────────────────────────────────────────────

export async function saveAnswer(
  sessionId: string,
  subtaskId: string,
  payload: SaveAnswerPayload,
): Promise<string> {
  const { data } = await api.put<ApiResponse<{ answerId: string }>>(
    `/sessions/${sessionId}/answers/${subtaskId}`,
    payload,
  );
  return unwrap(data, 'Speichern fehlgeschlagen').answerId;
}

export async function uploadDiagramImage(
  sessionId: string,
  subtaskId: string,
  file: File,
): Promise<DiagramUploadResult> {
  const formData = new FormData();
  formData.append('diagram', file);
  const { data } = await api.post<ApiResponse<DiagramUploadResult>>(
    `/sessions/${sessionId}/answers/${subtaskId}/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return unwrap(data, 'Upload fehlgeschlagen');
}

// ─── Flagging (Feature 8) ───────────────────────────────────────────────────

export async function setAnswerFlag(
  sessionId: string,
  subtaskId: string,
  flagged: boolean,
): Promise<void> {
  await api.patch(`/sessions/${sessionId}/answers/${subtaskId}`, { flagged });
}

// ─── Bewertung ──────────────────────────────────────────────────────────────

export async function requestEvaluation(
  sessionId: string,
  answerId: string,
): Promise<AiEvaluation> {
  const { data } = await api.post<ApiResponse<AiEvaluation>>(
    `/sessions/${sessionId}/answers/${answerId}/evaluate`,
  );
  return unwrap(data, 'Bewertung fehlgeschlagen');
}

/** Second-Opinion-Bewertung (Feature 9): fordert eine zweite, unabhängige Bewertung an. */
export async function requestSecondOpinion(
  sessionId: string,
  answerId: string,
): Promise<AiEvaluation> {
  const { data } = await api.post<ApiResponse<AiEvaluation>>(
    `/sessions/${sessionId}/answers/${answerId}/re-evaluate`,
  );
  return unwrap(data, 'Second-Opinion-Bewertung fehlgeschlagen');
}

// ─── Abgabe ─────────────────────────────────────────────────────────────────

export async function submitSession(sessionId: string): Promise<SubmitSessionResult> {
  const { data } = await api.post<ApiResponse<SubmitSessionResult>>(
    `/sessions/${sessionId}/submit`,
  );
  return unwrap(data, 'Abgabe fehlgeschlagen');
}
