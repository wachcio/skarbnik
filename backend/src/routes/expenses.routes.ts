import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireRole, sessionLabel } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { recordAudit } from "../services/auditLog.service";

export const expensesRouter = Router();

// Wydatki to widok skarbnika na drugą stronę bilansu (pieniądze wychodzące) —
// w odróżnieniu od wpłat (widocznych też rodzicom dla własnego dziecka),
// cały moduł jest wyłącznie dla admina.
expensesRouter.use(requireRole("ADMIN"));

const expenseSchema = z.object({
  categoryId: z.string().min(1),
  semesterId: z.string().min(1),
  amount: z.coerce.number().positive("Kwota musi być większa od zera."),
  spentAt: z.coerce.date({ errorMap: () => ({ message: "Podaj poprawną datę wydatku." }) }),
  description: z.string().optional(),
});

expensesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const categoryId = req.query.categoryId as string | undefined;
    const semesterId = req.query.semesterId as string | undefined;

    const expenses = await prisma.expense.findMany({
      where: { categoryId, semesterId },
      include: { category: true, semester: true },
      orderBy: { spentAt: "desc" },
    });

    res.json(expenses);
  })
);

expensesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = expenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." });
    }

    const { categoryId, semesterId } = parsed.data;
    const [category, semester] = await Promise.all([
      prisma.category.findUnique({ where: { id: categoryId } }),
      prisma.semester.findUnique({ where: { id: semesterId } }),
    ]);
    if (!category) return res.status(400).json({ error: "Nie znaleziono kategorii." });
    if (category.archived) return res.status(400).json({ error: "Kategoria jest zarchiwizowana." });
    if (!semester) return res.status(400).json({ error: "Nie znaleziono semestru." });

    const expense = await prisma.expense.create({
      data: { ...parsed.data, createdById: req.session.userId },
    });

    await recordAudit({
      entityType: "Expense",
      entityId: expense.id,
      action: "CREATE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataAfter: expense,
    });

    res.status(201).json(expense);
  })
);

expensesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = expenseSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." });
    }

    const before = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: "Nie znaleziono wydatku." });

    if (parsed.data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
      if (!category) return res.status(400).json({ error: "Nie znaleziono kategorii." });
      if (category.archived) return res.status(400).json({ error: "Kategoria jest zarchiwizowana." });
    }
    if (parsed.data.semesterId) {
      const semester = await prisma.semester.findUnique({ where: { id: parsed.data.semesterId } });
      if (!semester) return res.status(400).json({ error: "Nie znaleziono semestru." });
    }

    const after = await prisma.expense.update({ where: { id: req.params.id }, data: parsed.data });

    await recordAudit({
      entityType: "Expense",
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

expensesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const expense = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!expense) return res.status(404).json({ error: "Nie znaleziono wydatku." });

    await prisma.expense.delete({ where: { id: req.params.id } });

    await recordAudit({
      entityType: "Expense",
      entityId: expense.id,
      action: "DELETE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataBefore: expense,
    });

    res.status(204).end();
  })
);
