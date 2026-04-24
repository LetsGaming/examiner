/**
 * Auth composable — manages JWT token and user state in localStorage.
 * Token is attached as Bearer header to every API request via getAuthHeaders().
 *
 * refreshUser() pulls the current user shape from /auth/me — wichtig damit
 * nachgezogene Backend-Felder (z.B. `isAdmin` nach einem Admin-Toggle) ohne
 * Neu-Login im UI sichtbar werden. Wird beim App-Mount aufgerufen.
 */

import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api } from './api/client.js';
import type { ApiResponse } from '../types/index.js';
import { unwrap } from './api/httpHelpers.js';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  isAdmin?: boolean;
}

const TOKEN_KEY = 'ap2_auth_token';
const USER_KEY = 'ap2_auth_user';

// Reactive state — shared across all composable instances
const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
const user = ref<AuthUser | null>(
  (() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
    } catch {
      return null;
    }
  })(),
);

export function setToken(newToken: string, newUser: AuthUser) {
  token.value = newToken;
  user.value = newUser;
  localStorage.setItem(TOKEN_KEY, newToken);
  localStorage.setItem(USER_KEY, JSON.stringify(newUser));
}

export function clearToken() {
  token.value = null;
  user.value = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  if (!token.value) return {};
  return { Authorization: `Bearer ${token.value}` };
}

export function isLoggedIn(): boolean {
  return !!token.value;
}

/**
 * Lädt den aktuellen User vom Backend und aktualisiert localStorage.
 * No-op wenn kein Token — sonst ziehen wir das Objekt frisch inkl. isAdmin-Flag,
 * weil das beim Login gespeicherte User-Objekt veraltet sein kann (z.B. wenn
 * isAdmin später gesetzt wurde).
 */
export async function refreshUser(): Promise<void> {
  if (!token.value) return;
  try {
    const { data } = await api.get<ApiResponse<AuthUser>>('/auth/me');
    const fresh = unwrap(data, 'Profil konnte nicht geladen werden.');
    user.value = fresh;
    localStorage.setItem(USER_KEY, JSON.stringify(fresh));
  } catch {
    // Non-kritisch: alter Stand bleibt, User wird beim nächsten Login korrigiert.
  }
}

// Bei App-Start/Reload einmal den User frisch ziehen, damit Backend-Felder wie
// `isAdmin` ohne erneuten Login im UI ankommen. Feuert nur, wenn ein Token da
// ist — ansonsten routet die App ohnehin zum Login.
if (token.value) {
  void refreshUser();
}

export function useAuth() {
  const router = useRouter();

  function logout() {
    clearToken();
    router.push('/login');
  }

  const isAdmin = computed(() => user.value?.isAdmin === true);

  return { token, user, logout, isLoggedIn, isAdmin, refreshUser };
}
