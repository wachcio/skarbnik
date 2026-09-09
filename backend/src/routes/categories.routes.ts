import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireRole, sessionLabel } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { recordAudit } from "../services/auditLog.service";

export const categoriesRouter = Router();
categoriesRouter.use(requireRole("ADMIN"));

const categorySchema = z.object({
  name: z.string().min(1, "Podaj nazwę kategorii."),
});

const amountSchema = z.object({
  amount: z.coerce.number().nonnegative("Kwota nie może być ujemna."),
});

categoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const includeArchived = req.query.archived === "true";
    const categories = await prisma.category.findMany({
      where: includeArchived ? {} : { archived: false },
      include: { targets: true },
      orderBy: { name: "asc" },
    });
    res.json(categories);
  })
);

categoriesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." });
    }

    const category = await prisma.category.create({ data: parsed.data });

    await recordAudit({
      entityType: "Category",
      entityId: category.id,
      action: "CREATE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataAfter: category,
    });

    res.status(201).json(category);
  })
);

categoriesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = categorySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." });
    }

    const before = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: "Nie znaleziono kategorii." });

    const after = await prisma.category.update({ where: { id: req.params.id }, data: parsed.data });

    await recordAudit({
      entityType: "Category",
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

// Soft delete — nigdy hard delete, bo mogą istnieć historyczne wpłaty
// (relacja Payment -> Category ma onDelete: Restrict, patrz schema.prisma).
categoriesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const before = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: "Nie znaleziono kategorii." });

    const after = await prisma.category.update({
      where: { id: req.params.id },
      data: { archived: true },
    });

    await recordAudit({
      entityType: "Category",
      entityId: after.id,
      action: "UPDATE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataBefore: before,
      dataAfter: after,
    });

    res.status(204).end();
  })
);

categoriesRouter.get(
  "/:id/targets",
  asyncHandler(async (req, res) => {
    const targets = await prisma.categoryTarget.findMany({
      where: { categoryId: req.params.id },
      include: { semester: true },
    });
    res.json(targets);
  })
);

// Ustawienie/zmiana domyślnej kwoty kategorii w danym semestrze
// (wspólnej dla całej grupy — nadpisania per dziecko są osobno,
// pod /api/children/:id/amounts/...).
categoriesRouter.put(
  "/:id/targets/:semesterId",
  asyncHandler(async (req, res) => {
    const parsed = amountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowa kwota." });
    }

    const [category, semester] = await Promise.all([
      prisma.category.findUnique({ where: { id: req.params.id } }),
      prisma.semester.findUnique({ where: { id: req.params.semesterId } }),
    ]);
    if (!category) return res.status(404).json({ error: "Nie znaleziono kategorii." });
    if (!semester) return res.status(404).json({ error: "Nie znaleziono semestru." });

    const target = await prisma.categoryTarget.upsert({
      where: { categoryId_semesterId: { categoryId: req.params.id, semesterId: req.params.semesterId } },
      update: { amount: parsed.data.amount },
      create: { categoryId: req.params.id, semesterId: req.params.semesterId, amount: parsed.data.amount },
    });

    await recordAudit({
      entityType: "CategoryTarget",
      entityId: target.id,
      action: "UPDATE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataAfter: target,
    });

    res.json(target);
  })
);
