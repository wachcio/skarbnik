import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Wymagane zalogowanie." });
  }
  next();
}

export function requireRole(...roles: Array<"ADMIN" | "PARENT">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId || !req.session.role) {
      return res.status(401).json({ error: "Wymagane zalogowanie." });
    }
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ error: "Brak uprawnień." });
    }
    next();
  };
}

/** Czytelna etykieta do logu audytowego — bez dodatkowego zapytania do bazy. */
export function sessionLabel(req: Request): string {
  return req.session.displayName ?? req.session.email ?? "nieznany użytkownik";
}
