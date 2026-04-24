/**
 * composables/api/statsApi.ts — Persönliche Statistiken (Feature 1).
 *
 * Endpoint: GET /stats/me
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ApiResponse, MyStats } from '../../types/index.js';
import { api } from './client.js';
import { unwrap } from './httpHelpers.js';

export async function fetchMyStats(): Promise<MyStats> {
  const { data } = await api.get<ApiResponse<MyStats>>('/stats/me');
  return unwrap(data, 'Statistik-Fehler');
}
