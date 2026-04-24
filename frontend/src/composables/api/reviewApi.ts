/**
 * composables/api/reviewApi.ts — Spaced-Repetition-Review (Feature 3).
 *
 * Endpoints:
 *  - GET  /review/due
 *  - POST /review/start
 *  - POST /review/:id/skip
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ApiResponse } from '../../types/index.js';
import { api } from './client.js';
import { unwrap } from './httpHelpers.js';

export interface ReviewDue {
  count: number;
  items: unknown[];
}

export async function fetchReviewDue(): Promise<ReviewDue> {
  const { data } = await api.get<ApiResponse<ReviewDue>>('/review/due');
  return unwrap(data, 'Review-Fehler');
}

export async function startReviewSession(count: number): Promise<{ sessionId: string }> {
  const { data } = await api.post<ApiResponse<{ sessionId: string }>>('/review/start', { count });
  return unwrap(data, 'Review-Start fehlgeschlagen');
}

export async function skipReview(id: string): Promise<void> {
  await api.post(`/review/${id}/skip`);
}
