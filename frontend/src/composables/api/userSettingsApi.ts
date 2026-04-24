/**
 * composables/api/userSettingsApi.ts — Nutzer-spezifische Key-Value-Einstellungen
 * (Feature 11).
 *
 * Endpoints:
 *  - GET /settings/user/:key
 *  - PUT /settings/user/:key
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ApiResponse } from '../../types/index.js';
import { api } from './client.js';

/**
 * Liest einen Setting-Wert aus. Wenn der Schlüssel nicht existiert, liefert
 * der Server 404 → wir fangen das und geben `null` zurück (Absicht: UI
 * bekommt einen klaren "nicht gesetzt"-Wert ohne try/catch am Call-Site).
 */
export async function fetchUserSetting(key: string): Promise<string | null> {
  try {
    const { data } = await api.get<ApiResponse<{ value: string }>>(`/settings/user/${key}`);
    return data.data?.value ?? null;
  } catch {
    return null;
  }
}

export async function saveUserSetting(key: string, value: string): Promise<void> {
  await api.put(`/settings/user/${key}`, { value });
}
