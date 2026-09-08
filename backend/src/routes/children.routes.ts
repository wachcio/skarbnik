import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, sessionLabel } from "../middleware/auth";
import { recordAudit } from "../services/auditLog.service";
import { asyncHandler } from "../lib/asyncHandler";

export const childrenRouter = Router();

const childSchema = z.object({
  firstName: z.string().min(1, "Podaj imię."),
  lastName: z.string().min(1, "Podaj nazwisko."),
  parentContactEmail: z.string().email().or(z.literal("")).optional(),
  parentContactPhone: z.string().optional(),
  notes: z.string().optional(),
});

childrenRouter.use(requireAuth);

// Admin widzi wszystkie dzieci; rodzic tylko te, do których ma dostęp.
childrenRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (req.session.role === "ADMIN") {
      const children = await prisma.child.findMany({
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
      return res.json(children);
    }

    const links = await prisma.parentChildLink.findMany({
      where: { userId: req.session.userId },
      include: { child: true },
    });
    res.json(links.map((link) => link.child));
  })
);

childrenRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const child = await prisma.child.findUnique({ where: { id: req.params.id } });
    if (!child) return res.status(404).json({ error: "Nie znaleziono dziecka." });

    if (req.session.role !== "ADMIN") {
      const link = await prisma.parentChildLink.findUnique({
        where: { userId_childId: { userId: req.session.userId!, childId: child.id } },
      });
      if (!link) return res.status(403).json({ error: "Brak uprawnień." });
    }

    res.json(child);
  })
);

childrenRouter.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = childSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." });
    }

    const child = await prisma.child.create({ data: parsed.data });

    await recordAudit({
      entityType: "Child",
      entityId: child.id,
      action: "CREATE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataAfter: child,
    });

    res.status(201).json(child);
  })
);

childrenRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = childSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." });
    }

    const before = await prisma.child.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: "Nie znaleziono dziecka." });

    const after = await prisma.child.update({ where: { id: req.params.id }, data: parsed.data });

    await recordAudit({
      entityType: "Child",
      entityId: after.id,
      action: "UPDATE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataBefore: before,
      dataAfter: after,
    });

    res.json(after);
  })
);

childrenRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const child = await prisma.child.findUnique({
      where: { id: req.params.id },
      include: { payments: true, parentLinks: true },
    });
    if (!child) return res.status(404).json({ error: "Nie znaleziono dziecka." });

    // Kaskadowo usuwa też wpłaty i powiązania z kontami rodziców (schema.prisma)
    // — pełna migawka trafia do logu audytowego, więc historia nie ginie.
    await prisma.child.delete({ where: { id: req.params.id } });

    await recordAudit({
      entityType: "Child",
      entityId: child.id,
      action: "DELETE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataBefore: child,
    });

    res.status(204).end();
  })
);
