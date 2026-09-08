import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4 nie przechwytuje automatycznie odrzuconych obietnic w handlerach
 * `async` — bez tego wrappera błąd (np. baza danych nieosiągalna) kończy się
 * nieobsłużonym rejection i ubija cały proces Node zamiast zwrócić 500.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
