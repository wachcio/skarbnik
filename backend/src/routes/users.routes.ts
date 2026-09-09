import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireRole, sessionLabel } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { hashPassword, validatePasswordStrength } from "../lib/password";
import { recordAudit } from "../services/auditLog.service";

export const usersRouter = Router();
usersRouter.use(requireRole("ADMIN"));

// Ten moduł zarządza wyłącznie kontami rodziców — patrz PROJECT.md
// ("Konta rodziców tworzy/zarządza wyłącznie admin"). Nigdy nie
// zwracamy passwordHash w odpowiedziach ani nie zapisujemy go w logu
// audytowym.
const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  createdAt: true,
  childLinks: { select: { child: { select: { id: true, firstName: true, lastName: true } } } },
} as const;

function toPublicUser<T extends { childLinks: Array<{ child: { id: string; firstName: string; lastName: string } }> }>(
  user: T
) {
  const { childLinks, ...rest } = user;
  return { ...rest, children: childLinks.map((l) => l.child) };
}

const createUserSchema = z.object({
  email: z.string().email("Podaj poprawny e-mail."),
  password: z.string().min(1, "Podaj hasło."),
  displayName: z.string().min(1, "Podaj imię i nazwisko."),
  childIds: z.array(z.string()).default([]),
});

const updateUserSchema = z.object({
  displayName: z.string().min(1).optional(),
  childIds: z.array(z.string()).optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(1, "Podaj nowe hasło."),
});

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { role: "PARENT" },
      select: PUBLIC_USER_SELECT,
      orderBy: { displayName: "asc" },
    });
    res.json(users.map(toPublicUser));
  })
);

usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." });
    }

    const strength = validatePasswordStrength(parsed.data.password);
    if (!strength.valid) return res.status(400).json({ error: strength.reason });

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return res.status(409).json({ error: "Konto z tym adresem e-mail już istnieje." });

    if (parsed.data.childIds.length > 0) {
      const count = await prisma.child.count({ where: { id: { in: parsed.data.childIds } } });
      if (count !== parsed.data.childIds.length) {
        return res.status(400).json({ error: "Jedno z wybranych dzieci nie istnieje." });
      }
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        displayName: parsed.data.displayName,
        role: "PARENT",
        childLinks: { create: parsed.data.childIds.map((childId) => ({ childId })) },
      },
      select: PUBLIC_USER_SELECT,
    });

    await recordAudit({
      entityType: "User",
      entityId: user.id,
      action: "CREATE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataAfter: { email: user.email, displayName: user.displayName, role: user.role },
    });

    res.status(201).json(toPublicUser(user));
  })
);

usersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." });
    }

    const before = await prisma.user.findUnique({ where: { id: req.params.id }, select: PUBLIC_USER_SELECT });
    if (!before || before.role !== "PARENT") return res.status(404).json({ error: "Nie znaleziono konta." });

    if (parsed.data.childIds) {
      const count = await prisma.child.count({ where: { id: { in: parsed.data.childIds } } });
      if (count !== parsed.data.childIds.length) {
        return res.status(400).json({ error: "Jedno z wybranych dzieci nie istnieje." });
      }
    }

    const after = await prisma.$transaction(async (tx) => {
      if (parsed.data.displayName) {
        await tx.user.update({ where: { id: req.params.id }, data: { displayName: parsed.data.displayName } });
      }
      if (parsed.data.childIds) {
        await tx.parentChildLink.deleteMany({ where: { userId: req.params.id } });
        await tx.parentChildLink.createMany({
          data: parsed.data.childIds.map((childId) => ({ userId: req.params.id, childId })),
        });
      }
      return tx.user.findUniqueOrThrow({ where: { id: req.params.id }, select: PUBLIC_USER_SELECT });
    });

    await recordAudit({
      entityType: "User",
      entityId: after.id,
      action: "UPDATE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataBefore: toPublicUser(before),
      dataAfter: toPublicUser(after),
    });

    res.json(toPublicUser(after));
  })
);

// Ręczny reset hasła przez admina — bez wysyłki e-maili (patrz PROJECT.md).
// Dodatkowo czyści blokadę logowania: świeże hasło to naturalny "czysty start".
usersRouter.post(
  "/:id/reset-password",
  asyncHandler(async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." });
    }

    const strength = validatePasswordStrength(parsed.data.newPassword);
    if (!strength.valid) return res.status(400).json({ error: strength.reason });

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || user.role !== "PARENT") return res.status(404).json({ error: "Nie znaleziono konta." });

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash, failedLoginAttempts: 0, lockLevel: 0, lockedUntil: null },
    });

    await recordAudit({
      entityType: "User",
      entityId: user.id,
      action: "UPDATE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataAfter: { note: "Reset hasła przez administratora." },
    });

    res.status(204).end();
  })
);

usersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: PUBLIC_USER_SELECT });
    if (!user || user.role !== "PARENT") return res.status(404).json({ error: "Nie znaleziono konta." });

    await prisma.user.delete({ where: { id: req.params.id } });

    await recordAudit({
      entityType: "User",
      entityId: user.id,
      action: "DELETE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataBefore: toPublicUser(user),
    });

    res.status(204).end();
  })
);
