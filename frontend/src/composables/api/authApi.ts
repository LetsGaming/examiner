/**
 * composables/api/authApi.ts — Authentifizierung und Account-Verwaltung.
 *
 * Endpoints:
 *  - POST /auth/login
 *  - POST /auth/register
 *  - PUT  /auth/profile
 *  - PUT  /auth/password
 *  - DELETE /auth/account
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ApiResponse } from '../../types/index.js';
import { api } from './client.js';
import { unwrap } from './httpHelpers.js';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/login', { email, password });
  return unwrap(data, 'Anmeldung fehlgeschlagen');
}

export async function apiRegister(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResponse> {
  const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/register', {
    email,
    password,
    displayName,
  });
  return unwrap(data, 'Registrierung fehlgeschlagen');
}

export async function updateProfile(body: {
  displayName?: string;
  email?: string;
}): Promise<AuthUser> {
  const { data } = await api.put<ApiResponse<AuthUser>>('/auth/profile', body);
  return unwrap(data, 'Profil konnte nicht gespeichert werden.');
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.put('/auth/password', { currentPassword, newPassword });
}

export async function deleteAccount(password: string): Promise<void> {
  await api.delete('/auth/account', { data: { password } });
}
