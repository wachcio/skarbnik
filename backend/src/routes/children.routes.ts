import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, sessionLabel } from "../middleware/auth";
import { recordAudit } from "../services/auditLog.service";
import { getChildLedger } from "../services/childLedger.service";
import { asyncHandler } from "../lib/asyncHandler";

export const childrenRouter = Router();

const childSchema = z.object({
  firstName: z.string().min(1, "Podaj imię."),
  lastName: z.string().min(1, "Podaj nazwisko."),
  parentContactEmail: z.string().email().or(z.literal("")).optional(),
  parentContactPhone: z.string().optional(),
  notes: z.string().optional(),
});

const amountSchema = z.object({
  amount: z.coerce.number().nonnegative("Kwota nie może być ujemna."),
});

/** Admin ma dostęp do każdego dziecka; rodzic tylko do powiązanych. */
async function canAccessChild(req: { session: { userId?: string; role?: "ADMIN" | "PARENT" } }, childId: string) {
  if (req.session.role === "ADMIN") return true;
  const link = await prisma.parentChildLink.findUnique({
    where: { userId_childId: { userId: req.session.userId!, childId } },
  });
  return Boolean(link);
}

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

// Rozliczenie dziecka w danym semestrze wg kategorii (kwota docelowa,
// suma wpłat, brakująca kwota) — używane przez ekran dziecka i raporty.
childrenRouter.get(
  "/:id/ledger",
  asyncHandler(async (req, res) => {
    const semesterId = req.query.semesterId as string | undefined;
    if (!semesterId) return res.status(400).json({ error: "Podaj semesterId." });

    if (!(await canAccessChild(req, req.params.id))) {
      return res.status(403).json({ error: "Brak uprawnień." });
    }

    const ledger = await getChildLedger(req.params.id, semesterId);
    res.json(ledger);
  })
);

// Nadpisanie kwoty docelowej kategorii dla konkretnego dziecka (np.
// zniżka rodzeństwa) — jeśli brak wiersza, obowiązuje domyślna kwota
// z CategoryTarget (patrz categories.routes.ts).
childrenRouter.put(
  "/:id/amounts/:categoryId/:semesterId",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = amountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowa kwota." });
    }

    const { id: childId, categoryId, semesterId } = req.params;
    const [child, category, semester] = await Promise.all([
      prisma.child.findUnique({ where: { id: childId } }),
      prisma.category.findUnique({ where: { id: categoryId } }),
      prisma.semester.findUnique({ where: { id: semesterId } }),
    ]);
    if (!child) return res.status(404).json({ error: "Nie znaleziono dziecka." });
    if (!category) return res.status(404).json({ error: "Nie znaleziono kategorii." });
    if (!semester) return res.status(404).json({ error: "Nie znaleziono semestru." });

    const override = await prisma.childCategoryAmount.upsert({
      where: { childId_categoryId_semesterId: { childId, categoryId, semesterId } },
      update: { amount: parsed.data.amount },
      create: { childId, categoryId, semesterId, amount: parsed.data.amount },
    });

    await recordAudit({
      entityType: "ChildCategoryAmount",
      entityId: override.id,
      action: "UPDATE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataAfter: override,
    });

    res.json(override);
  })
);

// Usunięcie nadpisania — powrót do kwoty domyślnej kategorii.
childrenRouter.delete(
  "/:id/amounts/:categoryId/:semesterId",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id: childId, categoryId, semesterId } = req.params;
    const existing = await prisma.childCategoryAmount.findUnique({
      where: { childId_categoryId_semesterId: { childId, categoryId, semesterId } },
    });
    if (!existing) return res.status(404).json({ error: "Brak nadpisania do usunięcia." });

    await prisma.childCategoryAmount.delete({
      where: { childId_categoryId_semesterId: { childId, categoryId, semesterId } },
    });

    await recordAudit({
      entityType: "ChildCategoryAmount",
      entityId: existing.id,
      action: "DELETE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataBefore: existing,
    });

    res.status(204).end();
  })
);
