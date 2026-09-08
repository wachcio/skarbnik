import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../config/env";
import { login, LoginLockedError, InvalidCredentialsError } from "../services/auth.service";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";

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
