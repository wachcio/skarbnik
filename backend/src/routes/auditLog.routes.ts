import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";

export const auditLogRouter = Router();

// Log audytowy pokazuje historię WSZYSTKICH zmian w appce (kto, co, kiedy) —
// wyłącznie dla admina. `dataBefore`/`dataAfter` nigdy nie zawierają hasła
// (patrz miejsca wywołania recordAudit() — konta zawsze logowane przez
// odfiltrowany obiekt, bez passwordHash), więc bezpiecznie zwracamy je
// wprost.
auditLogRouter.use(requireRole("ADMIN"));

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;

auditLogRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const entityType = typeof req.query.entityType === "string" && req.query.entityType ? req.query.entityType : undefined;
    const action = typeof req.query.action === "string" && req.query.action ? req.query.action : undefined;
    const cursor = typeof req.query.cursor === "string" && req.query.cursor ? req.query.cursor : undefined;

    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), PAGE_SIZE_MAX) : PAGE_SIZE_DEFAULT;

    const where: { entityType?: string; action?: "CREATE" | "UPDATE" | "DELETE" | "LOCKOUT" } = {};
    if (entityType) where.entityType = entityType;
    if (action === "CREATE" || action === "UPDATE" || action === "DELETE" || action === "LOCKOUT") {
      where.action = action;
    }

    // Pobieramy o jeden wpis więcej niż strona, żeby wiedzieć, czy jest
    // kolejna — bez osobnego zapytania COUNT.
    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const entries = hasMore ? rows.slice(0, limit) : rows;

    res.json({
      entries,
      nextCursor: hasMore ? entries[entries.length - 1].id : null,
    });
  })
);
