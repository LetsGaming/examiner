/**
 * composables/api/aiSettingsApi.ts — AI-Provider-Einstellungen.
 *
 * Endpoints:
 *  - GET    /settings/ai
 *  - PUT    /settings/ai
 *  - DELETE /settings/ai
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { AiSettings, ApiResponse } from '../../types/index.js';
import { api } from './client.js';
import { expectSuccess, unwrap } from './httpHelpers.js';

export async function fetchAiSettings(): Promise<AiSettings> {
  const { data } = await api.get<ApiResponse<AiSettings>>('/settings/ai');
  return unwrap(data, 'Einstellungen Fehler');
}

export async function saveAiSettings(
  provider: string,
  apiKey?: string,
): Promise<{ keyStored: boolean }> {
  const body: Record<string, string> = { provider };
  if (apiKey?.trim()) body.apiKey = apiKey.trim();
  const { data } = await api.put<ApiResponse<{ keyStored: boolean }>>('/settings/ai', body);
  return unwrap(data, 'Speichern fehlgeschlagen');
}

export async function deleteAiKey(): Promise<void> {
  const { data } = await api.delete<ApiResponse<void>>('/settings/ai');
  expectSuccess(data, 'Löschen fehlgeschlagen');
}
