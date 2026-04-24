/**
 * composables/api/practiceApi.ts — Gezielte Übungs-Sessions (Feature 2).
 *
 * Endpoint: POST /practice/start
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ApiResponse, ExamPart, Specialty } from '../../types/index.js';
import { api } from './client.js';
import { unwrap } from './httpHelpers.js';

export interface StartPracticeBody {
  part: ExamPart;
  topic?: string;
  taskKind?: string;
  count: number;
  specialty: Specialty;
}

export async function startPractice(body: StartPracticeBody): Promise<{ sessionId: string }> {
  const { data } = await api.post<ApiResponse<{ sessionId: string }>>('/practice/start', body);
  return unwrap(data, 'Fehler beim Starten');
}
