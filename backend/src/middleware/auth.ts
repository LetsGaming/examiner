import type { Request, Response, NextFunction } from 'express'

export interface AuthRequest extends Request {
  userId: string
}

/**
 * Vereinfachte Auth-Middleware für lokalen Einzelnutzer-Betrieb.
 * Liest userId aus dem X-User-Id Header oder setzt 'local-user' als Standard.
 * Für Mehrbenutzer-Betrieb hier JWT-Validierung ergänzen.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const userId = (req.headers['x-user-id'] as string) || 'local-user';
  (req as AuthRequest).userId = userId
  next()
}
