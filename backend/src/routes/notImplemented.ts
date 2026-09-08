import type { Request, Response } from "express";

/**
 * Placeholder dla endpointów opisanych w docs/API.md, których logika
 * biznesowa jest zaplanowana na kolejny etap prac (patrz PROJECT.md).
 * Trasa i middleware uprawnień są już prawdziwe — brakuje tylko obsługi.
 */
export function notImplemented(feature: string) {
  return (_req: Request, res: Response) => {
    res.status(501).json({
      error: `Endpoint „${feature}” jest zaplanowany (patrz docs/API.md) i zostanie zaimplementowany w kolejnym etapie prac.`,
    });
  };
}
