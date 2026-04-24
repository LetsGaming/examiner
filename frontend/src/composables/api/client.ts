/**
 * composables/api/client.ts — Zentrale Axios-Instanz.
 *
 * Einziger Ort, an dem `axios.create` aufgerufen wird. Alle API-Domain-Module
 * (authApi, sessionApi, adminApi, ...) importieren `api` von hier.
 *
 * Interceptors:
 *  - Request:  fügt Authorization-Header aus useAuth hinzu.
 *  - Response: bei 401 Token löschen und zu /login redirecten.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import axios from 'axios';
import { API_BASE_URL } from '../../constants.js';
import { clearToken, getAuthHeaders } from '../useAuth.js';

const REQUEST_TIMEOUT_MS = 60_000;

export const api = axios.create({ baseURL: API_BASE_URL, timeout: REQUEST_TIMEOUT_MS });

api.interceptors.request.use((config) => {
  const { Authorization } = getAuthHeaders();
  if (Authorization) {
    config.headers.Authorization = Authorization;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
