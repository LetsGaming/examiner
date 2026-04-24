/**
 * Auth composable — manages JWT token and user state in localStorage.
 * Token is attached as Bearer header to every API request via getAuthHeaders().
 */

import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

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

export function useAuth() {
  const router = useRouter();

  function logout() {
    clearToken();
    router.push('/login');
  }

  const isAdmin = computed(() => user.value?.isAdmin === true);

  return { token, user, logout, isLoggedIn, isAdmin };
}
