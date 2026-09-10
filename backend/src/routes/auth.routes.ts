import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../config/env";
import { login, LoginLockedError, InvalidCredentialsError } from "../services/auth.service";
import { requireAuth, sessionLabel } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { hashPassword, verifyPassword, validatePasswordStrength } from "../lib/password";
import { recordAudit } from "../services/auditLog.service";

export const authRouter = Router();

// Limit prób logowania per adres IP — niezależny od tymczasowej blokady
// konta (patrz auth.service.ts). Obie warstwy razem chronią przed
// atakiem siłowym na logowanie wystawione publicznie.
const loginRateLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: env.LOGIN_RATE_LIMIT_PER_IP,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zbyt wiele prób logowania z tego adresu. Spróbuj ponownie później." },
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", loginRateLimiter, async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Podaj poprawny e-mail i hasło." });
  }

  try {
    const user = await login(parsed.data.email, parsed.data.password);

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.email = user.email;
    req.session.displayName = user.displayName;

    res.json({ id: user.id, email: user.email, role: user.role, displayName: user.displayName });
  } catch (error) {
    if (error instanceof LoginLockedError) {
      return res.status(423).json({
        error: `Konto zablokowane z powodu zbyt wielu nieudanych prób. Spróbuj ponownie za ${error.retryAfterMinutes} min.`,
      });
    }
    if (error instanceof InvalidCredentialsError) {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("skarbnik.sid");
    res.status(204).end();
  });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Podaj obecne hasło."),
  newPassword: z.string().min(1, "Podaj nowe hasło."),
});

// Samodzielna zmiana WŁASNEGO hasła (dowolna rola — nie mylić z
// usersRouter, który zarządza kontami INNYCH osób i jest wyłącznie dla
// admina). Wymaga podania obecnego hasła — w odróżnieniu od resetu przez
// admina, który zakłada, że osoba mogła je zapomnieć.
authRouter.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." });
    }

    const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
    if (!user) return res.status(401).json({ error: "Sesja nieważna." });

    const currentOk = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!currentOk) return res.status(400).json({ error: "Obecne hasło jest nieprawidłowe." });

    const strength = validatePasswordStrength(parsed.data.newPassword);
    if (!strength.valid) return res.status(400).json({ error: strength.reason });

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    await recordAudit({
      entityType: "User",
      entityId: user.id,
      action: "UPDATE",
      performedById: user.id,
      performedByLabel: sessionLabel(req),
      dataAfter: { note: "Samodzielna zmiana hasła." },
    });

    res.status(204).end();
  })
);

const changeEmailSchema = z.object({
  currentPassword: z.string().min(1, "Podaj obecne hasło."),
  newEmail: z.string().email("Podaj poprawny e-mail."),
});

// Samodzielna zmiana WŁASNEGO e-maila (dowolna rola) — e-mail to zarazem
// login, więc tak samo jak przy zmianie hasła wymagamy potwierdzenia
// obecnym hasłem (inaczej przejęta sesja mogłaby po cichu przejąć konto
// na stałe, podmieniając login na kontrolowany przez atakującego adres).
authRouter.post(
  "/change-email",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = changeEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." });
    }

    const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
    if (!user) return res.status(401).json({ error: "Sesja nieważna." });

    const currentOk = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!currentOk) return res.status(400).json({ error: "Obecne hasło jest nieprawidłowe." });

    if (parsed.data.newEmail === user.email) {
      return res.status(400).json({ error: "Nowy e-mail jest taki sam jak obecny." });
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.newEmail } });
    if (existing) return res.status(409).json({ error: "Konto z tym adresem e-mail już istnieje." });

    const updated = await prisma.user.update({ where: { id: user.id }, data: { email: parsed.data.newEmail } });

    // Sesja trzyma e-mail do etykiet w logu audytowym (sessionLabel) — bez
    // tej aktualizacji kolejne wpisy w TEJ SAMEJ sesji pokazywałyby stary
    // adres aż do ponownego zalogowania.
    req.session.email = updated.email;

    await recordAudit({
      entityType: "User",
      entityId: user.id,
      action: "UPDATE",
      performedById: user.id,
      performedByLabel: sessionLabel(req),
      dataBefore: { email: user.email },
      dataAfter: { email: updated.email, note: "Samodzielna zmiana e-maila." },
    });

    res.json({ email: updated.email });
  })
);

authRouter.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
    select: {
      id: true,
      email: true,
      role: true,
      displayName: true,
      childLinks: { select: { childId: true } },
    },
  });

  if (!user) {
    return res.status(401).json({ error: "Sesja nieważna." });
  }

  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    childIds: user.childLinks.map((link) => link.childId),
  });
}));
