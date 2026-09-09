import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, sessionLabel } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { recordAudit } from "../services/auditLog.service";

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

const paymentSchema = z.object({
  childId: z.string().min(1),
  categoryId: z.string().min(1),
  semesterId: z.string().min(1),
  amount: z.coerce.number().positive("Kwota musi być większa od zera."),
  paidAt: z.coerce.date({ errorMap: () => ({ message: "Podaj poprawną datę wpłaty." }) }),
  description: z.string().optional(),
});

/** Admin widzi wszystko; rodzic tylko wpłaty swoich dzieci. */
async function accessibleChildIds(req: { session: { userId?: string; role?: "ADMIN" | "PARENT" } }) {
  if (req.session.role === "ADMIN") return null; // null = bez filtra
  const links = await prisma.parentChildLink.findMany({ where: { userId: req.session.userId } });
  return links.map((l) => l.childId);
}

paymentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const allowedChildIds = await accessibleChildIds(req);
    if (allowedChildIds !== null && allowedChildIds.length === 0) return res.json([]);

    const childId = req.query.childId as string | undefined;
    const categoryId = req.query.categoryId as string | undefined;
    const semesterId = req.query.semesterId as string | undefined;

    if (allowedChildIds !== null && childId && !allowedChildIds.includes(childId)) {
      return res.status(403).json({ error: "Brak uprawnień." });
    }

    const payments = await prisma.payment.findMany({
      where: {
        childId: childId ?? (allowedChildIds ? { in: allowedChildIds } : undefined),
        categoryId,
        semesterId,
      },
      include: { child: true, category: true, semester: true },
      orderBy: { paidAt: "desc" },
    });

    res.json(payments);
  })
);

paymentsRouter.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." });
    }

    const { childId, categoryId, semesterId } = parsed.data;
    const [child, category, semester] = await Promise.all([
      prisma.child.findUnique({ where: { id: childId } }),
      prisma.category.findUnique({ where: { id: categoryId } }),
      prisma.semester.findUnique({ where: { id: semesterId } }),
    ]);
    if (!child) return res.status(400).json({ error: "Nie znaleziono dziecka." });
    if (!category) return res.status(400).json({ error: "Nie znaleziono kategorii." });
    if (category.archived) return res.status(400).json({ error: "Kategoria jest zarchiwizowana." });
    if (!semester) return res.status(400).json({ error: "Nie znaleziono semestru." });

    const payment = await prisma.payment.create({
      data: { ...parsed.data, createdById: req.session.userId },
    });

    await recordAudit({
      entityType: "Payment",
      entityId: payment.id,
      action: "CREATE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataAfter: payment,
    });

    res.status(201).json(payment);
  })
);

paymentsRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = paymentSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." });
    }

    const before = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: "Nie znaleziono wpłaty." });

    const after = await prisma.payment.update({ where: { id: req.params.id }, data: parsed.data });

    await recordAudit({
      entityType: "Payment",
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

paymentsRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) return res.status(404).json({ error: "Nie znaleziono wpłaty." });

    await prisma.payment.delete({ where: { id: req.params.id } });

    await recordAudit({
      entityType: "Payment",
      entityId: payment.id,
      action: "DELETE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataBefore: payment,
    });

    res.status(204).end();
  })
);
