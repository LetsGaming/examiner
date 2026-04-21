// Zentrale API-Basis-URL
// - Development (npm run dev): http://localhost:3001/api  — Vite-Proxy leitet weiter
// - Production (serve.js):     /api  — serve.js proxied transparent zum Backend
//
// VITE_API_URL kann in .env.production überschrieben werden, muss aber leer
// bleiben damit der Reverse-Proxy von serve.js greift.

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api')
