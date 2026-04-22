import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId: string;
  userEmail: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret)
    throw new Error("JWT_SECRET nicht konfiguriert — bitte in .env setzen.");
  return secret;
}

export function signToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, getJwtSecret(), { expiresIn: "7d" });
}

/**
 * Auth middleware — verifies Bearer JWT from Authorization header.
 * Every protected route requires a valid token.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    res
      .status(401)
      .json({
        success: false,
        error: "Nicht authentifiziert. Bitte einloggen.",
      });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getJwtSecret()) as {
      sub: string;
      email: string;
    };
    (req as AuthRequest).userId = payload.sub;
    (req as AuthRequest).userEmail = payload.email;
    next();
  } catch {
    res
      .status(401)
      .json({
        success: false,
        error: "Token ungültig oder abgelaufen. Bitte erneut einloggen.",
      });
  }
}
