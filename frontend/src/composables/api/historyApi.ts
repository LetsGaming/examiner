/**
 * composables/api/historyApi.ts — Session-Historie (Feature 6).
 *
 * Endpoints:
 *  - GET /sessions        — Liste der vergangenen Sessions
 *  - GET /sessions/:id/detail — Vollständige Session mit Bewertungen
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ApiResponse, ExamSession, SessionListItem } from '../../types/index.js';
import { api } from './client.js';
import { unwrap } from './httpHelpers.js';

export async function fetchSessionList(): Promise<SessionListItem[]> {
  const { data } = await api.get<ApiResponse<SessionListItem[]>>('/sessions');
  return unwrap(data, 'History-Fehler');
}

export async function fetchSessionDetail(sessionId: string): Promise<ExamSession> {
  const { data } = await api.get<ApiResponse<ExamSession>>(`/sessions/${sessionId}/detail`);
  return unwrap(data, 'Session-Detail-Fehler');
}
