// Zentrale Konfigurationskonstanten
// Einziger Ort für die API-Basis-URL — nie hardcoded in Komponenten wiederholen

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8031/api'
